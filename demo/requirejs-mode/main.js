define(function () {
    require(['require-conf'], function (config) {
        // init require.config
        require.config(config('../../bower_components'));

        require(['veronica'], function (veronica) {
            // create app
            var app = veronica.createApp({
                global: true,
                plugins: {
                    'hello': ['pl-hello']
                }
            });

            // registe widget: hello-veronica
            app.widget.register('widget-inline', {});

            app.launch().done(function () {
                // parse page
                app.parser.parse();
            });
        });

    });

});
