define(function () {

    return function (app) {
        var _ = app.core._;
        var qsToJSON = _.qsToJSON;

        /**
         * Backbone 的 Router
         * @external Backbone.Router
         */

        /**
         * 无法直接构造
         * @classdesc 前端路由
         * @class veronica.Router
         */

        /** @lends veronica.Router# */
        var router = {};
        var preParams;  // 前一个查询字符串参数

        // 页面切换
        router.changePage = _.throttle(function (page, params) {
            var sameParams = preParams === params;
            preParams = params;
            
            // 更新查询字符串
            if (app.page.isCurrent(page)) {
                if (!sameParams) {
                    app.sandbox.emit('qs-changed', qsToJSON(params));
                } else {
                    return;
                }
            }

            app.page.change(page, params);
        }, 500);


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
                router.changePage(app.config.homePage, params);
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
                router.changePage(page, params);
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
             * @memberOf veronica.Application#router
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

        /**
         * @name router
         * @memberOf veronica.Application#
         * @type {veronica.Router}
         */
        app.router = router;

        return router;
    };
});
