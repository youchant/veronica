define([], function () {
    return function (app) {
        app.createProvider('uiKit');

        app.uiKit.add('default', {
            init: function (view, $dom) {

            },
            destroy: function () { },
            getInstance: function() {}
        });
    };
});
