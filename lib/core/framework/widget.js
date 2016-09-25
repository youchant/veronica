define([
    '../base/index',
    './appComponent',
    '../../view/index'
], function (baseLib, AppComponent, widgetBase) {

    'use strict';

    var _ = baseLib._;
    var $ = baseLib.$;
    var Deffered = $.Deferred;
    var when = $.when;

    var Widget = {};

    Widget.base = widgetBase();

    // static methods

    Widget.getBase = function () {
        return widgetBase();
    }

    /**
     * 创建一个自定义 View 定义
     * @param {object|function} [obj={}] - 自定义属性或方法
     * @param {boolean} [isFactory=false] - 是否该视图定义是个工厂方法（不需要 `new`）
     */
    Widget.define = function(obj, isFactory){
        var me = this;
        var ctor;
        if (isFactory == null) {
            isFactory = true;
        }

        if (typeof obj === 'object') {  // 普通对象
            var literal = extend({}, Widget.base, obj);
            ctor = AppComponent.extend(literal);
        } else {
            if (obj.extend) {  // 本身是 Backbone.View 构造函数
                ctor = obj;
            } else {  // 工厂函数
                return obj;
            }
        }

        // 使用工厂模式
        if (isFactory) {
            return function (options) {
                return new ctor(options);
            }
        }

        return ctor;
    }

    Widget.create = function(initializer, options){
        // 将构造器中的 _widgetName 附加到 视图中
        var defaults = {
            _xtypeName: initializer._xtypeName,
            _xtypeContext: initializer._xtypeContext,
            _exclusive: false
        };

        options = _.extend(defaults, options);

        // 调用
        var definition = Widget.define(initializer);
        var widget = definition;
        while (widget != null && typeof widget === 'function') {
            widget = widget(options);
        }

        if (widget == null) {
            console.error('View should return an object. [errorView:' + options._name);
        }

        return widget;
    };

    return Widget;
});
