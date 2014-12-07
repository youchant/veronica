define(function () {

    return function (app) {
        var _ = app.core._;
        // 延迟页面切换
        var _changePage = _.throttle(function (page) {
            app.switchPage(page);
        }, 500);

        var router = {

            routes: {
                '': 'entry',
                'page=:page': 'openPage',
                'widget/:widget@:source': 'executeWidget'
            },
            entry: function () {
                this.openPage(app.config.homePage);
            },
            executeWidget: function (widgetName, source) {
                app.sandbox.startWidgets({
                    name: widgetName,
                    options: {
                        _source: source || 'default',
                        host: '.page-view'
                    }
                });
            },
            _openPage: _changePage,
            openPage: _changePage

        };
        return router;
    };
});
