define([], function () {
    return function (app) {
        var extend = app.core._.extend;
        var logger = app.core.logger;
        var _ = app.core._;


        app.viewEngine = app.provider.create();

        app.viewEngine.add('default', {
            bind: function(view) {
            },
            unbind: function () {

            },
            create: function (data) {
                return data;
            },
            get: function () {

            },
            set: function () { }
        });
    };
});
