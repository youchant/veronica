
define([
    '../core/index',
    '../core/application',
    './_combine'
], /**@lends veronica */function (core, Application, combineFunctions) {

    'use strict';

    /**
     * jQuery 延迟对象
     * @typedef Promise
     */

    /**
     * 创建 app
     * @function veronica#createApp
     * @param {AppOptions} [options={}]
     * @returns {veronica.Application}
     */
    core.createApp = function (options) {

        // 停止以前的 app
        if (core.app) { core.app.stop(); }

        var app = new Application(options);

        app.use(combineFunctions);


        /**
         * `Application` 类的实例，在`global` 设为 `true` 的情况下，可通过`window.__verApp`访问
         * @name app
         * @type {Application}
         * @memberOf veronica
         */
        core.app = app;

        app.sandbox = app.sandboxes.create(app.name, core.enums.hostType.APP);

        if (app.config.global) { window.__verApp = app; }

        return app;
    };

    return core;
});
