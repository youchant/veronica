define([
    '../base/index',
    './router'
], function (baseLib, Router) {
    var _ = baseLib._;
    var throttle = _.throttle;

    var AppRouter = Router.extend(/** @lends veronica.AppRouter# */{
        options: {
            homePage: 'home'
        },
        /**
         * 应用程序路由对象
         * @class AppRouter
         * @param {Object} options - 参数
         * @augments Router
         * @memberOf veronica
         */
        initialize: function (options) {
            options || (options = {});
            this.supr(options);
            this._preParams = undefined;
        },
        routes: {
            '(/)': 'entry',
            '(/)?*params': 'entry',
            'page=*page': 'openPage',
            '(/)*page': 'openPage',
            '(/)*page?*params': 'openPage',
            'widget/:widget@:context': 'executeWidget'
        },
        entry: function (params) {
            this._openPage(this.options.homePage, params);
        },
        _openPage: function (page, params) {
            var app = this.app();
            var me = this;
            var sameParams = this._preParams === params;
            this._preParams = params;

            // 更新查询字符串
            if (app.part('page').isCurrent(page)) {
                if (!sameParams) {
                    app.pub('qs-changed', _.qs(params).toJSON());
                } else {
                    return;
                }
            }
            me._changePage(page, params);
        },
        _changePage: _.throttle(function (page, params) {
            var app = this.app();
            app.part('page').change(page, params);
        }, 500),
        execute: function (name, context) {
            var app = this.app();
            app.part('component').start({
                initializer: name,
                options: {
                    _context: context || 'default',
                    el: '.v-widget-root'
                }
            });
        },

        openPage: function (page, params) {
            this._openPage(page, params);
        }
    })

    return AppRouter;
});
