define(function () {
    require(['./require-conf'], function (config) {

        require.config(config('../../../bower_components'));

        require(['veronica'], function (veronica) {

            var app = veronica.createApp({
                modules: [{
                    name: 'others',
                    source: './modules',
                    hasEntry: false,
                    multilevel: true,
                    widgetPath: ''
                }],
                releaseWidgetPath: './widgets'
            });

            app.launch({ parse: true });
        });

    });

});
