define(function () {

    return function (app) {
        var _ = app.core._;
        // 延迟页面切换
        var _changePage = _.throttle(function (page, params) {
            app.page.change(page, params);
        }, 500);

        /**
         * Backbone 的 Router
         * @external Backbone.Router
         */

        /**
         * 前端路由
         * @namespace
         * @memberOf Application#
         */
        var router = {};

        var base = {

            routes: {
                '(/)': 'entry',
                '(/)?*params': 'entry',
                'page=:page': 'openPage',
                '(/)*page': 'openPage',
                '(/)*page?*params': 'openPage',
                'widget/:widget@:source': 'executeWidget'
            },
            initialize: function () {
                // this.route(new RegExp(app.config.router.pagePattern), 'openPage');
            },
            entry: function (params) {
                _changePage(app.config.homePage, params);
            },
            executeWidget: function (widgetName, source) {
                app.sandbox.startWidgets({
                    name: widgetName,
                    options: {
                        _source: source || 'default',
                        host: app.config.page.defaultHost
                    }
                });
            },
            openPage: function (page, params) {
                _changePage(page, params);
            }

        };

        /**
         * 基础配置对象
         */
        router.base = base;

        /**
         * 创建一个 Router
         * @returns {Backbone.Router}
         */
        router.create = function (obj) {
            var Router = app.core.Router.extend($.extend(true, {}, router.base, obj));
            return new Router();
        };

        /**
         * 开启路由，创建路由实例
         */
        router.start = function (obj) {
            var r = router.create(obj);
            /**
             * 路由实例
             * @name instance
             * @type {Backbone.Router}
             * @memberOf Application#router
             */
            router.instance = r;
            app.core.history.start({ pushState: false });
            return r;
        }

        /**
         * 更新浏览器地址栏
         * @see {@link http://backbonejs.org/#Router-navigate}
         */
        router.navigate = function (fragment, options) {
            router.instance.navigate(fragment, options);
        }

        app.router = router;

        return router;
    };
});
