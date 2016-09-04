define([
    '../base/index',
    './router'
], function (baseLib, Router) {
    var _ = baseLib._;
    var throttle = _.throttle;

    var AppRouter = Router.extend({
        initialize: function (options) {
            options || (options = {});
            this.supr(options);
            this._preParams = undefined;
        },
        routes: {
            '(/)': 'entry',
            '(/)?*params': 'entry',
            'page=:page': 'openPage',
            '(/)*page': 'openPage',
            '(/)*page?*params': 'openPage',
            'widget/:widget@:source': 'executeWidget'
        },
        entry: function (params) {
            this._changePage(this.options.homePage, params);
        },
        _changePage: _.throttle(function (page, params) {
            var app = this.app();
            var sameParams = this.preParams === params;
            this.preParams = params;
            
            // 更新查询字符串
            if (app.page.isCurrent(page)) {
                if (!sameParams) {
                    app.sandbox.emit('qs-changed', qsToJSON(params));
                } else {
                    return;
                }
            }

            app.page.change(page, params);
        }, 500),
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
    })

    return AppRouter;
});
