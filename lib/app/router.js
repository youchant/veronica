define(function () {

    return function (app) {
        var _ = app.core._;
        // 延迟页面切换
        var _changePage = _.throttle(function (page, params) {
            app.switchPage(page, params);
        }, 500);

        var router = {

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
                this.openPage(app.config.homePage, params);
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
            _openPage: _changePage,
            openPage: function (page, params) {
                _changePage(page, params);
            }

        };

        return router;
    };
});
