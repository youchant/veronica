define([], function () {
    return function (app) {
        var extend = app.core._.extend;
        var logger = app.core.logger;
        var _ = app.core._;
        

        app.viewEngineProvider = app.provider.create();

        app.viewEngineProvider.add('default', {
            bind: function(view) {
            },
            unbind: function () {

            },
            create: function (data) {
                return data;
            },
            get: function () { },
            set: function () { }
        });
    };
});
