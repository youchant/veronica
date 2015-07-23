define(function () {

    'use strict';

    /**
     * @classdesc Widget
     * @class Widget
     * @param {function} executor - 创建 widget 基础对象的方法
     * @param {WidgetConfig} options - 配置
     * @param {Application} app - 当前应用程序
     * @see {@link View} 查看关于视图的更多信息（widget 对象一般是一个视图，称为“主视图”）
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
        executor = app.view._createExecutor(executor);

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
             * @var {WidgetConfig} options - 配置项
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
