define([
    './view/view-base'
], function (base) {

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


    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;
        var noop = $.noop;


        /**
         * 不能用构造器构造
         * @classdesc 视图操作
         * @class veronica.ViewHandler
         */

        /** @lends veronica.ViewHandler# */
        var view = {
            _ctors: {}
        };



        /**
         * 全局注册 View
         */
        view.register = function (name, ctor) {
            if (!app.view.ctor(name)) {  // 重复名称的不注册
                app.view._ctors[name] = ctor;
            } else {
                // app.core.logger.warn('View naming conflicts: ' + name);
            }
        }

        // 查找 View 构造器
        view.ctor = function (name, ctor) {
            if (ctor != null) {
                app.view._ctors[name] = ctor;
            }

            return app.view._ctors[name];
        }

        view.execute = function (executor, options) {
            var result = executor;
            while (result != null && _.isFunction(result)) {
               result = result(options);
            }

            return result;
        }

        /**
         * 创建一个自定义 View 定义
         * @param {object|function} [obj={}] - 自定义属性或方法
         * @param {array} [inherits=[]] - 继承的属性或方法组
         * @param {boolean} [isFactory=false] - 是否该视图定义是个工厂方法（不需要 `new`）
         */
        view.define = function (obj, inherits, isFactory) {
            if (_.isBoolean(inherits) && isFactory == null) {
                isFactory = inherits;
                inherits = [];
            }

            if (isFactory == null) { isFactory = false };
            if (inherits == null) { inherits = [] };

            var ctor;

            if (_.isObject(obj) && !_.isFunction(obj)) {  // 普通对象
                var newObj = $.extend({}, app.view.base);
                var myInherits = obj.inherits || newObj.inherits;
                if (myInherits) {
                    inherits = inherits.concat(myInherits(app));
                }
                _.each(inherits, function(inherit) {
                    if (_.isFunction(inherit)) {
                        inherit(newObj, app);
                    } else {
                        $.extend(true, newObj, inherit);
                    }
                });
                // 最后混入当前对象，避免覆盖
                $.extend(true, newObj, obj);

                ctor = app.core.View.extend(newObj);
            } else {
                if (obj.extend) {  // 本身是 Backbone.View 构造函数
                    ctor = obj;
                } else {  // 工厂函数
                    return obj;
                }
            }


            // 注册 View
            if (obj && obj.name) {
                app.view.register(obj.name, ctor);
            }

            // 使用工厂模式
            if (isFactory) {
                return function (options) {
                    return new ctor(options);
                }
            }

            return ctor;
        };

        /**
         * @name view
         * @memberOf veronica.Application#
         * @type {veronica.ViewHandler}
         */
        app.view = view;

        base(app);
    };
});
