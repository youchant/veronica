define([
    './core/core',
    './core/application',
    './app/emitQueue',
    './app/page',
    './app/layout',
    './app/module',
    './app/navigation',
    './app/plugin',
    './app/sandboxes',
    './app/widget',
    './app/parser',
    './app/view',
    './app/data'
], function (core, Application, emitQueue, page, layout, module, navigation, plugin, sandboxes, widget, parser, view, data) {

    'use strict';

    core.createApp = function (config) {
        if (core.app) { core.app.stop(); }
        config || (config = {});
        config.name || (config.name = 'app');
        var appName = config.name;

        var app = new Application(config);

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

        app.sandbox.on('pageLoading', function (name, appName) {
            if (appName === app.name) {
                // 在页面加载之前，进行布局的预加载
                var config = app.getPage(name);
                var currPageName = app.getCurrPage();
                var currConfig;
                if (currPageName === '' || (currConfig = app.getPage(currPageName)) && currConfig.layout !== config.layout) {
                    app.switchLayout(config.layout);
                    app.emit('layoutSwitched', config.layout);
                }
            }
        });

        return app;
    };

    return core;
});
