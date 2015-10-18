define(function () {

    'use strict';


    /**
     * widget 配置，他继承部分启动时配置，不需要自己创建
     * @typedef WidgetOptions
     * @property {string} _name - widget名称
     * @property {string} _page - 所属页面名称
     * @property {string} _sandboxRef - 沙箱标识符（自动生成）
     * @property {Sandbox} sandbox - 沙箱（自动生成）
     * @property {boolean} _exclusive - 是否独占host
     * @see {@link WidgetStartConfig} 其他属性请查看启动时配置的 `options` 属性
     */

    /**
     * @classdesc widget 对象一般是一个视图，称为“主视图”
     * @class Widget
     * @memberOf veronica
     * @param {function} executor - 创建 widget 基础对象的方法
     * @param {WidgetOptions} options - 配置
     * @param {veronica.Application} app - 当前应用程序
     * @see {@link veronica.View}
     */
    var Widget = function (executor, options, app) {
        var core = app.core;
        var $ = core.$;
        var pageName = options._page;
        var name = options._name;
        var funcResult;  // 部件函数执行结果
        var widgetObj;

        var sandbox = app.sandboxes.create(name);

        var defaults = {
            _name: null,
            _page: null,
            _sandboxRef: sandbox._id,
            _exclusive: false,
            sandbox: sandbox
        };

        options = $.extend(defaults, options);

        // 将对象转换成执行函数
        executor = app.view.define(executor, true);

        if (_.isFunction(executor)) { funcResult = executor(options); }
        if (_.isUndefined(funcResult)) {
            console.warn('Widget should return an object. [errorWidget:' + name);
        } else {
            widgetObj = _.isFunction(funcResult) ? funcResult(options) : funcResult;
            /**
             * @var {string} name - 名称
             * @memberOf Widget#
             */
            widgetObj._name = options._name;

            widgetObj.sandbox = sandbox;
            /**
             * @var {WidgetOptions} options - 配置项
             * @memberOf Widget#
             */
            widgetObj.options || (widgetObj.options = options);

            widgetObj.$el && widgetObj.$el
                .addClass(sandbox.name)
                .addClass(core.constant.WIDGET_CLASS)
                .data(core.constant.WIDGET_CLASS, sandbox.name)
                .data(core.constant.WIDGET_TAG, options._tag)
                .data(core.constant.SANDBOX_REF_NAME, sandbox._id);  // 在该元素上保存对插件对象的引用

            sandbox.getHost = function () {
                return app.widget._widgetsPool[sandbox._id];
            };
        }

        return widgetObj;

    };

    return Widget;
});
