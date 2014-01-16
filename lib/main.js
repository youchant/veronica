define([
    './core',
    './application',
    './plugins/page',
    './sandbox',
    './loader'
], function (core, Application, pageExt) {

    'use strict';



    // 创建应用程序实例
    core.createApp = function (appName, config) {
        var app = new Application;
        if (core.app) { core.app.stop(); }  // 一张网页只有一个应用程序实例
        core.app = app;

        app.core = core;
        app.config = config;
        app.name = appName;

        app.sandbox = core.sandboxes.create('app-' + appName, appName);

        _.isFunction(pageExt) && pageExt(app, Application);

        return app;
    };

    return core;
});