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
            this._openPage(this.options.homePage, params);
        },
        _openPage: function (page, params) {
            var app = this.app();
            var me = this;
            var sameParams = this._preParams === params;
            this._preParams = params;

            // 更新查询字符串
            if (app.page.isCurrent(page)) {
                if (!sameParams) {
                    app.sandbox.emit('qs-changed', qsToJSON(params));
                } else {
                    return;
                }
            }
            console.log(app.page.change.id);
            me._changePage(page, params);
        },
        _changePage: _.throttle(function(page, params){
            var app = this.app();
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
            router._openPage(page, params);
        }
    })

    return AppRouter;
});
