
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
], /**@lends veronica */function (core, Application, emitQueue, page, layout, module,
    navigation, plugin, sandboxes, widget, parser, view, data, templates, router,
    ajax, hash, dialog) {

    'use strict';

    /**
     * 是一个 `Application` 类的实例，在`global` 设为 `true` 的情况下，可通过`window.__verApp`访问
     * @name app
     * @type {Application}
     * @memberOf veronica
     */

    var DEFAULT_MODULE_NAME = '__default__';

    /**
     * 创建 app
     * @function veronica.createApp
     * @param {object} [options={}]
     * @param {string} options.name='app' 应用程序名称
     * @param {array} options.features=['plugin','dialog','spa'] -
     *   设置创建的该应用程序需要启用哪些特性，目前包括：
     *
     *    * dialog: 支持对话框
     *    * plugin: 支持插件扩展widget
     *    * spa: 支持单页面应用程序的构建（页面、布局、路由，导航等）
     *
     * @param {boolean} options.autoBuildPage=false
     *   是否启用自动页面配置。当通过路由或 `app.page.change`访问某个页面时，
     *   如果未找到对应的页面配置，启用自动页面配置时，会根据页面名称自动生成页面配置。
     *
     *   > **关于自动页面配置**
     *   >
     *   > 访问 basic/home/index 或 basic-home-index 时，系统会去查找名为 basic-home-index 的widget，并且添加 _common 的页面继承;
     *   > 如果访问index，则会查找basic/Home/index，如果访问 home/index，则会查找basic/home/index
     * @param {array} options.modules=[] - 模块配置
     *    模块配置传入一个数组，指定该应用程序包括的所有模块，包括如下参数：
     *
     *    * name: 模块名称
     *    * source: 模块源
     *    * multilevel: widget 为多级目录
     *    * hasEntry: 有入口文件
     *   当每个模块配置参数为字符串时，该字符串指定该模块的名称，其他参数采用默认参数
     * @param {array} options.extensions=[] - 扩展列表
     */
    core.createApp = function (options) {

        var $ = core.$;
        var extend = core.$.extend;

        // 停止以前的 app
        if (core.app) { core.app.stop(); }

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

        if ($.inArray('dialog', app.config.features) > -1) {
            // dialog
            dialog(app);
        }

        if ($.inArray('spa', app.config.features) > -1) {
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

        if ($.inArray('plugin', app.config.features) > -1) {
            // plugin
            plugin(app, Application);
        }

        core.app = app;

        app.sandbox = app.sandboxes.create('app-' + app.name, app.name, 'app');

        if (app.config.global) { window.__verApp = app; }

        return app;
    };

    return core;
});
