
define([
    'veronica'
], function (core) {
    var app = core.createApp('testApp');

    app.launch().done(function () {
        app.addPage({
            'default': {
                name: 'Default',
                widgets: [{
                    name: 'hello',
                    options: {
                        host: '.page-view'
                    }
                }]
            }
        });
        app.startPage();
    });
});