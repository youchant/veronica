define([
    './core/index',
    './application'
], function (coreLib, Application) {

    'use strict';

    // entry method
    coreLib.createApp = function (options) {
        if (window.__verApp) {
            window.__verApp.stop();
        }
        var app = new Application(options);
        if (app.config.global) {
            window.__verApp = app;
        }
        return app;
    }

    return coreLib;
});
