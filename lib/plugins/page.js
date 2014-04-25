
define([], function () {

    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;

        app.mixin({
            _pages: {},
            _layouts: {},
            _pages: {
                currPageName: ''
            }
        });

        app.mixin({
            _changeTitle: function () { },
            _inherit: function (pageConfig) {
                var me = this;
                var parentsWidgets = _(pageConfig.inherit).map(function (parentName) {
                    return me.getPage(parentName).widgets;
                });
                parentsWidgets.unshift(pageConfig.widgets);
                return _.uniq(_.union.apply(_, parentsWidgets), false, function (item) {
                    if (item.options && item.options.el) return item.options.el;  // 确保一个元素上只有一个插件
                    return item.name + item.options.host;  // 确保一个父元素下，只有一个同样的插件
                });

            },
            isCurrPage: function (page) {
                return this._pages.currPageName === 'default' || this._pages.currPageName === page;
            },
            getPage: function (name) {
                var config = this._pages[name];
                return config;
            },
            getCurrPage: function () {
                return this.getPage('currPageName');
            },
            addPage: function (configs) {
                _(configs).each(function (config, i) {
                    configs[i] = $.extend({
                        name: '',
                        layout: 'default',
                        widgets: [],
                        inherit: []
                    }, config);
                });
                $.extend(this._pages, configs);
                return this;
            },
            addLayout: function (layout) {
                $.extend(this._layouts, layout);
                return this;
            },
            getLayout: function (name) {
                return this._layouts[name];
            },
            switchPage: function (name) {
                this.core.logger.time('pageLoad.' + name);
                var config = this.getPage(name);
                var dfd;
                var widgetsConfig;
                var me = this;

                if (!config) {
                    dfd = $.Deferred();
                    this.emit('pageNotFound', name);
                    dfd.resolve();
                    return dfd.promise();
                } else {
                    widgetsConfig = this._inherit(config);
                    this.emit('pageLoading', name);
                    this._pages.currPageName = name;
                    return this.sandbox.startWidgets(widgetsConfig, name).done(function () {
                        // 切换页面后进行垃圾回收
                        me.core.recycle();
                        me.emit('pageLoaded', name);
                        me.core.logger.time('pageLoad.' + name, 'End');
                    });
                }
            },
            startPage: function () {
                var me = this;
                this.initLayout();
                return this.switchPage('default').done(function () {
                    me.emit('appStarted');
                    me.core.logger.time("appStart", 'End');
                });
            },
            switchLayout: function (layout) {
                var me = this;
                this.emit('layoutSwitching', layout);

                _.each($('.page-view').find('.ver-widget'), function (el) {
                    me.core.stop($(el));
                });

                $('.page-view').html(this.getLayout(layout));

            },
            initLayout: function () {
                var scaffold = this.getLayout('scaffold');
                if (scaffold) {
                    $('body').prepend(scaffold);
                }
            }
        }, false);

        // TODO: API风格更改 
        app.page = {
            active: function (name) {
                if (name) {
                    return app.switchPage(name);
                } else {
                    name = app.getPage('currPageName');
                }
                return name;
            },
            // 获取页面配置
            get: function (name) {
                return app.getPage(name);
            },
            isActive: function (name) {
                return app.isCurrPage(name);
            },
            add: function (configs) {
                return app.addPage(configs);
            },
            start: function () {
                return app.startPage();
            }
        }

        app.layout = {
            add: function (layout) {
                return app.addLayout(layout);
            },
            active: function (name) {
                return app.switchLayout(name);
            },
            get: function (name) {
                return app.getLayout(name);
            },
            init: function () {
                return app.initLayout();
            }
        }

        app.sandbox.on('pageLoading', function (name, appName) {
            if (appName === app.name) {
                // 在页面加载之前，进行布局的预加载
                var config = app.getPage(name);
                var currPageName = app.getCurrPage();
                var currConfig;
                if (currPageName === '' || (currConfig = app.getPage(currPageName)) && currConfig.layout !== config.layout) {
                    app.switchLayout(config.layout);
                    app.emit('layoutSwitched', config.layout);
                }
            }
        });


    };
});
