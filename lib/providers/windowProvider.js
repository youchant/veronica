define([], function () {
    return function (app) {

        app.windowProvider = app.provider.create();

        app.windowProvider.add('default', {
            options: function (options) {
                return options;
            },
            create: function ($el, options, view) {
                var wnd = {
                    element: $el,
                    core: null,
                    config: options,
                    open: function () { },
                    close: function () { },
                    destroy: function () { },
                    center: function () { },
                    setOptions: function (options) { },
                    rendered: function (view) { },
                    removeLoading: function () { }
                };
                return wnd;
            }
        });

    };
});
