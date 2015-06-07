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

    var DEFAULT_MODULE_NAME = '__default__';

    core.createApp = function (options) {

        var $ = core.$;
        var extend = core.$.extend;

        // 停止以前的 app
        if (core.app) { core.app.stop(); }

        // 默认配置
        var defaultOptions = {
            name: 'app',
            autoReport: true,  // 自动通知
            autoBuildPage: false,  // 自动生成页面配置
            features: ['dialog', 'plugin', 'spa'],
            autoParseWidgetName: false,  // 自动解析 widget 名称
            releaseWidgetPath: './widgets',  // 发布后的 widget 路径
            widgetNameSeparator: '-',  // 解析  widget 名称时识别的分隔符

            global: false,  // 全局 app
            plugins: {},
            defaultPage: 'default',
            homePage: 'home',
            page: {
                defaultLayout: 'default',  // 默认布局
                defaultHost: '.v-render-body',  // 默认宿主元素
                defaultSource: 'basic',  // 默认源
                defaultInherit: '_common'  // 默认页面继承
            },
            module: {
                // module 配置的默认值
                defaults: {
                    multilevel: false,
                    hasEntry: true,
                    entryPath: 'main',
                    widgetPath: 'widgets',
                    source: 'modules'
                },
                // 默认 module
                defaultModule: {
                    name: core.constant.DEFAULT_MODULE_NAME,
                    source: '.',
                    path: '.',
                    hasEntry: false,
                    build: '{{ dir }}{{ baseUrl }}{{ type }}'
                }
            },
            router: {
                pagePattern: '\/?(.+)\??(.+)'  // 没用，移除
            }
        };

        options = $.extend(true, defaultOptions, options || {});

        if (!options.modules || options.modules.length === 0) {
            options.modules = [options.module.defaultModule];
        }

        var app = new Application(options);

        emitQueue(app, Application);
        sandboxes(app, Application);
        widget(app, Application);
        parser(app, Application);
        view(app, Application);
        ajax(app);
        data(app);
        templates(app);
        hash(app);

        if ($.inArray('dialog', options.features) > -1) {
            // dialog
            dialog(app);
        }

        if ($.inArray('spa', options.features) > -1) {
            // spa(single page application) 相关
            page(app, Application);
            layout(app, Application);
            module(app, Application);
            navigation(app, Application);
            router(app);
            app._router = router(app);
            app.Router = function (obj) {
                obj || (obj = {});
                return app.core.Router.extend($.extend(true, {}, app._router, obj));
            };

            app.startRouter = function (obj) {
                app.router = new (app.Router(obj))();

                app.core.history.start({ pushState: false });
            };
        }

        if ($.inArray('plugin', options.features) > -1) {
            // plugin
            plugin(app, Application);
        }

        core.app = app;

        app.sandbox = app.sandboxes.create('app-' + app.name, app.name, 'app');

        if (options.global) { window.__verApp = app; }

        return app;
    };

    return core;
});
