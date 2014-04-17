define([
    './core',
    './application',
    './plugins/page',
    './sandbox',
    './loader'
], function (core, Application, pageExt) {

    'use strict';

    core.createApp = function (appName, config) {
        var app = new Application;
        var $ = core.$;
        if (core.app) { core.app.stop(); }
        core.app = app;

        app.core = core;
        app.config = $.extend({
            autoReport: true
        }, config);
        app.name = appName;

        app.sandbox = core.sandboxes.create('app-' + appName, appName);

        _.isFunction(pageExt) && pageExt(app, Application);

        return app;
    };

    return core;
});