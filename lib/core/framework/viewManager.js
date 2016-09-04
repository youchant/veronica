define([
    '../base/index',
    './appProvider',
    './view',
    '../../view/index'
], function (baseLib, AppProvider, View, viewBase) {

    var extend = baseLib._.extend;

    /**
     * Backbone View Object
     * @external Backbone.View
     * @see {@link http://backbonejs.org/#View}
     */

    /**
     * 事件处理函数
     * @callback eventCallback
     * @param {...*} param - 事件参数
     */

    /**
     * 消息订阅处理函数
     * @callback messageCallback
     * @param {...*} param - 消息传递的参数
     */

    /**
     * @classdesc 视图操作
     * @class veronica.ViewManager
     * @augments veronica.Provider
     */
    var ViewManager = AppProvider.extend(/** @lends veronica.ViewManager# */{
        getBase: function () {
            return viewBase(this.app());
        },
        register: function (name, ctor) {
            if (!this.get(name)) {  // 重复名称的不注册
                this.add(name, ctor); 
            } else {
                // app.logger.warn('View naming conflicts: ' + name);
            }
        },
        create: function (initializer, options) {
            // 将构造器中的 _widgetName 附加到 视图中
            if (initializer._widgetName) {
                options._widgetName = initializer._widgetName;
            }
            if (typeof initializer === 'object') {
                initializer = this.define(initializer);
            }
            var result = initializer;
            while (result != null && typeof result === 'function') {
                result = result(options);
            }

            return result;
        },
        /**
         * 创建一个自定义 View 定义
         * @param {object|function} [obj={}] - 自定义属性或方法
         * @param {boolean} [isFactory=false] - 是否该视图定义是个工厂方法（不需要 `new`）
         */
        define: function (obj, isFactory) {
            var me = this;
            if (isFactory == null) { isFactory = true; }

            if (typeof obj === 'object') {  // 普通对象
                var literal = extend({}, me.getBase(), obj);
                ctor = View.extend(literal);
            } else {
                if (obj.extend) {  // 本身是 Backbone.View 构造函数
                    ctor = obj;
                } else {  // 工厂函数
                    return obj;
                }
            }

            // 注册 View
            if (obj && obj.name) {
                me.register(obj.name, ctor);
            }

            // 使用工厂模式
            if (isFactory) {
                return function (options) {
                    return new ctor(options);
                }
            }

            return ctor;
        }
    });

    return ViewManager;
});
