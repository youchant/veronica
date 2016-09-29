define([
    '../base/index',
    './_combine',
    '../framework/appPart'
], function (baseLib, combineFunction, AppPart) {

    var _ = baseLib._;
    var $ = baseLib.$;
    var extend = _.extend;

    /**
     * @classdesc 视图
     * @class veronica.View
     * @augments Backbone.View
     */
    var componentBase = function () {
        var base = extend({}, {
            /**
             * 该视图的默认参数
             * @type {object}
             * @default
             */
            defaults: {},
            _defaults: {},

            _call: function (func, args) {
                func.apply(this, Array.prototype.slice.call(args));
            },
            _extend: function (obj) {
                obj.options && extend(this._defaults, obj.options);
                obj.configs && extend(this, obj.configs);
                obj.methods && extend(this, obj.methods);

                // 加入运行时属性
                if (obj.props) {
                    this._extendMethod('_initProps', function () {
                        var me = this;
                        _.each(obj.props, function (prop, name) {
                            me[name] = prop;
                        });
                    });
                }
            },
            _extendMethod: function (methodName, newMethod) {
                var original = this[methodName];
                this[methodName] = function () {
                    this._call(original, arguments);
                    this._call(newMethod, arguments);
                }
            },
            /**
             * 调用成员方法，如果是对象，则直接返回
             * @param {string} methodName - 方法名
             * @param {boolean} [isWithDefaultParams=true] - 是否附加默认参数（app, _, $）
             * @returns {*}
             * @private
             */
            _invoke: function (methodName, isWithDefaultParams) {
                var app = this.app();
                var args = _.toArray(arguments);
                var sliceLen = args.length >= 2 ? 2 : 1;
                if (isWithDefaultParams == null) {
                    isWithDefaultParams = true;
                }

                if (isWithDefaultParams) {
                    args = args.concat([app, _, $]);
                }

                var method = methodName;
                if (_.isString(methodName)) {
                    method = this[methodName];
                }

                return _.isFunction(method) ? method.apply(this, args.slice(sliceLen)) : method;
            }
        });
        combineFunction(base);
        return base;
    };

    var Component = {};

    Component.base = componentBase();

    // static methods

    /**
     * 创建一个自定义 View 定义
     * @param {object|function} [obj={}] - 自定义属性或方法
     * @param {boolean} [isFactory=false] - 是否该视图定义是个工厂方法（不需要 `new`）
     */
    Component.define = function (obj, isFactory) {
        var me = this;
        var ctor;
        if (isFactory == null) {
            isFactory = true;
        }

        if (typeof obj === 'object') {  // 普通对象
            var literal = extend({}, Component.base, obj);
            ctor = AppPart.extend(literal);
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
    };

    Component.create = function (initializer, options) {
        initializer || (initializer = {});
        // 将构造器中的 _widgetName 附加到 视图中
        var defaults = {
            _xtypeName: initializer._xtypeName,
            _xtypeContext: initializer._xtypeContext,
            _exclusive: false
        };

        options = _.extend(defaults, options);

        // 调用
        var definition = Component.define(initializer);
        var obj = definition;
        while (obj != null && typeof obj === 'function') {
            obj = obj(options);
        }

        if (obj == null) {
            console.error('Component should return an object. [errorName:' + options._name);
        }

        return obj;
    };

    Component.extendBase = function (method) {
        var base = Component.base;
        method(base);
        return base;
    };

    return Component;
});
