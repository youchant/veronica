
define([], function () {

    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;

        app.mixin({
            _pages: {},
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
                if (!_.isArray(configs)) {
                    configs = [configs];
                }
                _.each(configs, function (config) {
                    _(config).each(function (item, i) {
                        if (item.widgets) {
                            _.each(item.widgets, function (widget, j) {
                                if (_.isString(widget)) {
                                    var sep = widget.split('@');
                                    item.widgets[j] = {
                                        name: sep[0],
                                        options: {
                                            host: sep[1] || 'body',
                                            _source: sep[2] || 'default'
                                        }
                                    };
                                }
                            });
                        }
                        config[i] = $.extend({
                            name: '',
                            layout: 'default',
                            widgets: [],
                            inherit: []
                        }, item);
                    });

                    $.extend(app._pages, config);
                });

                return this;
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
                        me.widget.recycle();
                        me.emit('pageLoaded', name);
                        me.core.logger.time('pageLoad.' + name, 'End');
                    });
                }
            },
            startPage: function (preLoad) {
                if (preLoad == null) { preLoad = false };
                var me = this;
                this.initLayout();
                var dfd = $.Deferred();
                var result = preLoad ? this.switchPage('default') : dfd;
                dfd.resolve();
                return result.done(function () {
                    me.emit('appStarted');
                    me.core.logger.time("appStart", 'End');
                });
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

    };
});
