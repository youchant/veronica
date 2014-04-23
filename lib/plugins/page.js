
define([], function () {

    return function (app, Application) {
        var fn = Application.prototype;
        var $ = app.sandbox.$;
        var _ = app.sandbox._;

        app._pages = {};
        app._layouts = {};
        app._pages.currPageName = '';

        fn._changeTitle = function () { };

        fn.isCurrPage = function (page) {
            return this._pages.currPageName === 'default' || this._pages.currPageName === page;
        };

        // 继承父级的插件配置
        fn._inherit = function (pageConfig) {
            var me = this;
            var parentsWidgets = _(pageConfig.inherit).map(function (parentName) {
                return me.getPage(parentName).widgets;
            });
            parentsWidgets.unshift(pageConfig.widgets);
            return _.uniq(_.union.apply(_, parentsWidgets), false, function (item) {
                if (item.options && item.options.el) return item.options.el;  // 确保一个元素上只有一个插件
                return item.name + item.options.host;  // 确保一个父元素下，只有一个同样的插件
            });

        };

        fn.getPage = function (name) {
            var config = this._pages[name];
            return config;
        };

        fn.getCurrPage = function () {
            return this.getPage('currPageName');
        };

        fn.addPage = function (configs) {
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
        };

        fn.addLayout = function (layout) {
            $.extend(this._layouts, layout);
            return this;
        };

        fn.getLayout = function (name) {
            return this._layouts[name];
        };

        fn.switchPage = function (name) {
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
        };

        fn.startPage = function () {
            var me = this;
            this.initLayout();
            return this.switchPage('default').done(function () {
                me.emit('appStarted');
                me.core.logger.time("appStart", 'End');
            });
        };

        // 切换布局（该方法可重写）
        fn.switchLayout = function (layout) {
            var me = this;
            this.emit('layoutSwitching', layout);

            _.each($('.page-view').find('.ver-widget'), function (el) {
                me.core.stop($(el));
            });

            $('.page-view').html(this.getLayout(layout));

        };

        // 初始化布局
        fn.initLayout = function () {
            var scaffold = this.getLayout('scaffold');
            if (scaffold) {
                $('body').prepend(scaffold);
            }
        },

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
