define(function () {

    'use strict';

    var Widget = function (executor, options, app) {
        var core = app.core;
        var pageName = options._page;
        var name = options._name;
        var funcResult;  // 部件函数执行结果
        var widgetObj;
        var sandboxRef = _.uniqueId('sandbox$');
        var WIDGET_TYPE = core.constant.WIDGET_TYPE;
        var WIDGET_CLASS = core.constant.WIDGET_CLASS;
        var WIDGET_TAG = core.constant.WIDGET_TAG;
        var SANDBOX_REF_NAME = core.constant.SANDBOX_REF_NAME;
        var sandbox = app.sandboxes.create(sandboxRef, name, WIDGET_TYPE);
        var $ = app.core.$;

        var defaults = {
            _name: null,
            _page: null,
            _sandboxRef: sandboxRef,
            _exclusive: false,
            sandbox: sandbox
        };

        options = $.extend(defaults, options);

        // 将对象转换成执行函数
        executor = app.view._createExecutor(executor);

        if (_.isFunction(executor)) { funcResult = executor(options); }
        if (_.isUndefined(funcResult)) {
            console.warn('Widget should return an object. [errorWidget:' + name);
        } else {
            widgetObj = _.isFunction(funcResult) ? funcResult(options) : funcResult;
            widgetObj._name = options._name;
            widgetObj.sandbox = sandbox;
            widgetObj.options || (widgetObj.options = options);

            widgetObj.$el && widgetObj.$el
                .addClass(sandbox.name)
                .addClass(WIDGET_CLASS)
                .data(WIDGET_CLASS, sandbox.name)
                .data(WIDGET_TAG, options._tag)
                .data(SANDBOX_REF_NAME, sandbox._ref);  // 在该元素上保存对插件对象的引用

            // 获取 widget 实例对象
            sandbox._widgetObj = function () {
                return app.widget._widgetsPool[sandbox._ref];
            };
        }

        return widgetObj;

    };

    return Widget;
});