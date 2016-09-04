// 加载模块
define([
    '../base/index'
], function (baseLib) {

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

    var extend = baseLib._.extend;
    var SANDBOX_REF_NAME = '__sandboxRef__';
    var WIDGET_CLASS = 'ver-widget';
    var WIDGET_TAG = 'ver-tag';

    /**
     * @classdesc widget 对象一般是一个视图，称为“主视图”
     * @class Widget
     * @memberOf veronica
     * @param {function} executor - 创建 widget 基础对象的方法
     * @param {WidgetOptions} options - 配置
     * @param {veronica.Application} app - 当前应用程序
     * @see {@link veronica.View}
     */
    var Widget = function (initializer, options, app) {
        var sandbox = app.sandboxes.create(options._name);
        sandbox.getOwner = function () {
            return app.widget._runningPool[this._id];
        };

        var defaults = {
            _name: null,
            _page: null,
            _exclusive: false,
            _sandboxRef: sandbox._id,
            sandbox: sandbox
        };

        options = extend(defaults, options);


        var result = app.view.create(initializer, options);

        if (result == null) {
            console.error('Widget should return an object. [errorWidget:' + options._name);
            return result;
        }

        if (!result._name) {
            result._name = options._name;
        }
        if (!result.options) {
            result.options = options;
        }
        if (result.$el) {
            result.$el
                .addClass(WIDGET_CLASS)
                .addClass(options._name)
                .data(WIDGET_CLASS, options._name)
                .data(SANDBOX_REF_NAME, options._sandboxRef)
                .data(WIDGET_TAG, options._tag);
        }

        return result;

    };

    return Widget;
});
