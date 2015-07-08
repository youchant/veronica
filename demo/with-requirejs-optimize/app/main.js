
require(['./require-conf'], function (config) {
    var framePath = 'http://192.168.1.18:8097/cdn/bower_components';
    var fp2 = '../../bower_components';
    require.config(config(framePath));

    require(['veronica'], function (veronica) {

        var app = veronica.createApp({
            global: true,
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

