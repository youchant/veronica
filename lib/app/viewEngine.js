define([], function () {
    return function (app) {
        var extend = app.core._.extend;
        var _ = app.core._;


        app.createProvider('viewEngine');

        app.viewEngine.add('default', {
            bind: function (view, $dom, model) {

            },
            unbind: function () {

            },
            create: function (data) {
                return data;
            },
            bindEvents: function (vm, view) {

            },
            get: function () {

            },
            set: function () { }
        });
    };
});
