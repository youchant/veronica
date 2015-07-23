
require(['./require-conf'], function (config) {

    var devPath = 'http://192.168.1.18:8097/cdn/bower_components';
    var releasePath = './vendor';
    require.config(config(devPath, releasePath));

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
            }, {
                name: 'tiny_basic',
                source: 'http://localhost:59529',
                widgetPath: '',
                hasEntry: false
            }],
            homePage: 'dashboard'
        });

        app.launch().done(function () {
            app.page.start();
        });
    });
});

