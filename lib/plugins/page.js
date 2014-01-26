
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
            return app._pages.currPageName === 'default' || app._pages.currPageName === page;
        };

        // 继承父级的插件配置
        fn._inherit = function (pageConfig) {

            var parentsWidgets = _(pageConfig.inherit).map(function (parentName) {
                return app.getPage(parentName).widgets;
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
            $.extend(app._pages, configs);
            return this;
        };

        fn.addLayout = function (layout) {
            $.extend(app._layouts, layout);
            return this;
        };

        fn.getLayout = function (name) {
            return app._layouts[name];
        };

        fn.switchPage = function (name) {
            var config = app.getPage(name);
            var dfd;
            var widgetsConfig;

            if (!config) {
                dfd = $.Deferred();
                app.emit('pageNotFound', name);
                dfd.resolve();
                return dfd.promise();
            } else {
                widgetsConfig = fn._inherit(config);
                app.emit('pageLoading', name);
                app._pages.currPageName = name;
                return app.sandbox.startWidgets(widgetsConfig, name).done(function () {
                    // 切换页面后进行垃圾回收
                    app.core.recycle();
                    app.emit('pageLoaded', name);
                });
            }
        };

        fn.startPage = function () {
            fn.initLayout();
            return fn.switchPage('default').done(function () {
                app.emit('appStarted');
            });
        };

        // 切换布局（该方法可重写）
        fn.switchLayout = function (layout) {

            app.emit('layoutSwitching', layout);

            _.each($('.page-view').find('.ver-widget'), function (el) {
                app.core.stop($(el));
            });

            $('.page-view').html(app.getLayout(layout));

        };

        // 初始化布局
        fn.initLayout = function () {
            var scaffold = app.getLayout('scaffold');
            if (scaffold) {
                $('body').prepend(scaffold);
            }
        },

        app.sandbox.on('pageLoading.' + app.name, function (name) {
            // 在页面加载之前，进行布局的预加载
            var config = app.getPage(name);
            var currPageName = app.getCurrPage();
            var currConfig;
            if (currPageName === '' || (currConfig = app.getPage(currPageName)) && currConfig.layout !== config.layout) {
                app.switchLayout(config.layout);
                app.emit('layoutChanged', config.layout);
            }
        });

        app.sandbox.on('appStarted.' + app.name, function () {
            if (app.Router) {
                app.router = new app.Router;
                Backbone.history.start({ pushState: false });
            }
        });
    };
});
