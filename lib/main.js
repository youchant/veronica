define([
    './base/index',
    './framework/index',
    './component/index',
    './application/index'
], function (baseLib, frameworkLib, Component, Application) {

    'use strict';

    var extend = baseLib._.extend;
    var coreLib = {};
    extend(coreLib, baseLib);
    extend(coreLib, frameworkLib);

    coreLib.Component = Component;
    coreLib.Application = Application;

    // entry method
    coreLib.createApp = function (options) {
        if (window.__verApp) {
            window.__verApp.stop();
        }
        var app = new Application(options);
        app.core = coreLib;
        if (app.config.global) {
            window.__verApp = app;
        }
        return app;
    }

    return coreLib;
});
