define([], function () {
    return function (app) {
        app.uiKit = app.provider.create();

        app.uiKit.add('default', {
            init: function (view, $dom) {

            },
            destroy: function () { },
            getInstance: function() {}
        });
    };
});
