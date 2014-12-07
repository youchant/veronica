define([
    '../core/core',
    '../core/application',
    './emitQueue',
    './page',
    './layout',
    './module',
    './navigation',
    './plugin',
    './sandboxes',
    './widget',
    './parser',
    './view',
    './data',
    './templates',
    './router',
    './ajax',
    './hash',
    './ui/dialog'
], function (core, Application, emitQueue, page, layout, module,
    navigation, plugin, sandboxes, widget, parser, view, data, templates, router,
    ajax, hash, dialog) {

    'use strict';

    core.createApp = function (config) {

        var extend = core.$.extend;

        // Í£Ö¹ÒÔÇ°µÄ app
        if (core.app) { core.app.stop(); }

        var app = new Application(config);
        var appName = app.name;

        emitQueue(app, Application);
        page(app, Application);
        layout(app, Application);
        module(app, Application);
        navigation(app, Application);
        plugin(app, Application);
        sandboxes(app, Application);
        widget(app, Application);
        parser(app, Application);
        view(app, Application);
        data(app);
        templates(app);
        router(app);
        ajax(app);
        hash(app);
        dialog(app);

        app._router = router(app);
        app.Router = function (obj) {
            obj || (obj = {});
            return app.core.Router.extend($.extend(true, {}, app._router, obj));
        };

        app.startRouter = function (obj) {
            app.router = new (app.Router(obj))();
            app.core.history.start({ pushState: false });
        };

        app.trace = function (func) {
            return function () {
                var args = arguments;

                core.logger.info('widgetLoading ' + name);
                core.logger.time('widgetTransfer.' + name);

                var result = func.apply(this, arguments);
                if (result.done) {
                    result.always(function () {
                        core.logger.time('widgetTransfer.' + name, 'End');
                    });
                }
                return result;
            };
        };

        // app.widget.load = app.trace(app.widget.load);

        core.app = app;

        app.sandbox = app.sandboxes.create('app-' + appName, appName, 'app');


        return app;
    };

    return core;
});
