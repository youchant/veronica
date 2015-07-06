
require(['./require-conf'], function (config) {
    require.config(config('../../bower_components'));

    require(['veronica'], function (veronica) {

        var app = veronica.createApp({
            modules: [{
                name: 'dashboard',
                source: './modules',
                widgetPath: ''
            }, {
                name: 'user-control',
                source: './modules',
                widgetPath: ''
            }],
            homePage: 'dashboard'
        });

        app.launch().done(function () {
            app.page.start();
        });
    });
});

