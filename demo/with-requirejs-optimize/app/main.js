
require(['./require-conf'], function (config) {

    var devPath = '../../../bower_components';
    var releasePath = './vendor';
    require.config(config(devPath, releasePath));

    require(['veronica'], function (veronica) {

        var app = veronica.createApp({
            global: true,
            modules: [{
                name: 'dashboard',
                parentPath: './modules',
                widgetPath: ''
            }, {
                name: 'user-control',
                parentPath: './modules',
                widgetPath: ''
            }, {
                name: 'tiny_basic',
                parentPath: 'http://localhost:59529',
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

