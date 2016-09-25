define([
    '../../base/index',
    './_combine',
    '../appComponent'
], function (baseLib, combineFunction, AppComponent) {

    var _ = baseLib._;
    var $ = baseLib.$;
    var extend = _.extend;

    /**
     * 选项
     * @typedef ViewOptions
     * @property {boolean} [autoAction=false] - 自动绑定Action事件
     *   当在模板中使用如下写法时
     *   ```html
     *   <button data-action="add">添加</button>
     *   ```
     *   如果该属性为 `true` 将自动查找该视图的 `addHandler` 方法作为该按钮点击事件的处理函数
     *
     * @property {boolean} [autoRender=true] - 自动渲染. 视图一初始化就进行渲染
     * @property {number} [_place=0] - 插入位置（0：append，1：prepend）
     * @property {string|object} [host] - 父元素，可以是选择器或jQuery对象
     * @property {boolean} [autoResize=false] - 自适应窗口变化. 该属性设为true后当窗口大小变化时会自动调用`resize`方法，因此需要重写该方法
     * @property {boolean} [autoCreateSubview=true] - 在视图渲染时，自动创建子视图，需设置 views 属性
     * @property {boolean} [activeView=null] - 设置在switchable中默认活动的视图
     * @property {boolean} [autoST=false] -自动设置触发器. 该属性为true后，会广播 `setTriggers` 消息可将该视图的工具条由defaultToolbarTpl 指定注入到其他widget，需要额外设置 `toolbar` 项指定该视图的注入到的widget名称
     * @property {string} [toolbar='toolbar'] - 触发器放置的 widget name
     * @property {string} [defaultToolbarTpl='.tpl-toolbar'] - 触发器默认模板的选择器
     * @property {object} [windowOptions=false] - 设置当视图单独位于窗口中时，窗口的选项
     * @property {string} [langClass=null] - 视图所属的 language class 在模板中，可通过`data.lang.xxx` 来访问特定的语言文本
     * @property {string} [activeView=null] - 初始活动的子视图名称
     */

    /**
     * @classdesc 视图
     * @class veronica.View
     * @augments Backbone.View
     */
    var widgetBase = function () {
        var base = extend({}, {
            /**
             * 该视图的默认参数
             * @type {object}
             * @default
             */
            defaults: {},
            _defaults: {
                /**
                 * @deprecated
                 * @private
                 */
                lazyTemplate: false,
                langClass: null
            },

            _call: function (func, args) {
                func.apply(this, Array.prototype.slice.call(args));
            },
            _extend: function (obj) {
                var me = this;
                obj.options && extend(this._defaults, obj.options);
                obj.configs && extend(this, obj.configs);
                obj.methods && extend(this, obj.methods);

                // 加入运行时属性
                if (obj.props) {
                    this._extendMethod('_initProps', function () {
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
    }

    var Widget = {};

    Widget.base = widgetBase();

    // static methods

    /**
     * 创建一个自定义 View 定义
     * @param {object|function} [obj={}] - 自定义属性或方法
     * @param {boolean} [isFactory=false] - 是否该视图定义是个工厂方法（不需要 `new`）
     */
    Widget.define = function (obj, isFactory) {
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

    Widget.create = function (initializer, options) {
        initializer || (initializer = {});
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
            console.error('Widget should return an object. [errorWidget:' + options._name);
        }

        return widget;
    };

    Widget.extendBase = function(method){
        var base = Widget.base;
        method(base);
        return base;
    };

    return Widget;
});
