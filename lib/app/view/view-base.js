define([
    './view-mvvm',
    './view-window',
    './view-attr',
    './view-action',
    './view-children',
    './view-listen',
    './view-render'
], function (mvvm, subwindow, attr, action, children, listen, render) {

    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;
        var noop = $.noop;

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
         * @property {object} [sharedModel=null] - 视图没有自己的视图模型，来源于该属性共享的视图模型
         * @property {array} [sharedModelProp=null] - 共享视图模型的属性集合
         *   ```
         *   [['destPropName', 'originPropName'], 'propName2']
         *   ```
         * @property {string} [langClass=null] - 视图所属的 language class 在模板中，可通过`data.lang.xxx` 来访问特定的语言文本
         * @property {boolean} [bindEmptyModel=false] - 当视图模型没赋值时 是否也进行绑定
         * @property {string} [activeView=null] - 初始活动的子视图名称
         */

        var base = {
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
            _initProps: function () {
                this._name = this.options._name;
                /**
                 * 默认绑定视图对象到函数上下文的函数
                 * @name binds
                 * @memberOf View#
                 */
                //this.binds = ['resize'];
                this.binds = [];

                this._windows = {};  // 子窗口集合
                this._views = {};  // 子视图集合
                this._delayEvents = [];
                this._attributes = {};
                this.state = {};  // 视图状态

                this.baseModel = _.isFunction(this.staticModel) ? this._invoke('staticModel') : this.staticModel;
                this.viewModel = {};  // 该视图的视图模型
                this._activeViewName = null;
            },
            _extend: function (obj) {
                obj.options && $.extend(this._defaults, obj.options);
                obj.configs && $.extend(this, obj.configs);
                obj.methods && $.extend(this, obj.methods);

                // 加入运行时属性
                if (obj.props) {
                    this._extendMethod('_initProps', function() {
                        _.each(obj.props, function (prop, name) {
                            this[name] = prop;
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
            _invoke: function (methodName, isWithDefaultParams) {
                var args = _.toArray(arguments);
                var sliceLen = args.length >= 2 ? 2 : 1;
                if (isWithDefaultParams == null) { isWithDefaultParams = true; }

                if (isWithDefaultParams) {
                    args = args.concat([app, _, $]);
                }

                var method = methodName;
                if (_.isString(methodName)) {
                    method = this[methodName];
                }

                return _.isFunction(method) ? method.apply(this, args.slice(sliceLen)) : method;
            },
            _i18n: function (key) {
                var i18n = app.i18n.get();
                return i18n[key];
            }
        };

        /**
         * mixins
         * @deprecated
         */
        var mixinAbility = {
            /** @lends veronica.View# */
            configs: {
                _mixins: function () {
                    return [];
                },
                /**
                 * **`重写`** 混入其他视图方法
                 * @type {function}
                 * @returns {array}
                 * @example
                 *   mixins: function () {
                 *       return [editHelper];
                 *   }
                 */
                mixins: noop
            },
            /** @lends veronica.View# */
            methods: {
                _applyMixins: function () {
                    var me = this;
                    var defaultMixins = this._invoke('_mixins');
                    var mixins = this._invoke('mixins'); // return array

                    mixins = defaultMixins.concat(mixins);
                    _.each(mixins, function (mixin) {
                        if (_.isFunction(mixin)) {
                            mixin(me, app);
                        } else {
                            _.each(mixin, function (member, key) {
                                // 注意：这里不会覆盖已存在的成员
                                if (me[key] == null) {
                                    me[key] = member;
                                }
                            });
                        }
                    });
                }
            }
        }

        base._extend(mixinAbility);

        // aspect

        var aspectAbility = {
            /** @lends veronica.View# */
            configs: {
                /**
                 * 配置该视图的子视图 **`重写`**
                 * @type {function}
                 * @default
                 * @example
                 *   aspect: function(){
                 *     this.after('initAttr', function(){
                 *         this.param = { test: 'A' }
                 *     });
                 *     this.before // ...
                 *   }
                 */
                aspect: noop
            },
            /** @lends veronica.View# */
            methods: app.core.aspect
        };
        base._extend(aspectAbility);


        // lifecycle

        var lifecycleAblility = {
            /** @lends veronica.View# */
            configs: {
                /**
                 * **`重写`** 视图的自定义初始化代码
                 * @type {function}
                 * @default
                 */
                init: noop,
                /**
                 * **`重写`** 自定义销毁，通常用于释放视图使用的全局资源
                 * @type {function}
                 * @example
                 *   _customDestory: function () {
                 *     $(window).off('resize', this.resizeHanlder);
                 *   }
                 */
                _customDestory: noop
            },
            /** @lends veronica.View# */
            methods: {
                _setup: function (options) {
                    this._invoke('aspect');

                    this._invoke('_listen');
                    this._invoke('listen');

                    this._invoke('subscribe');  // 初始化广播监听

                    this._invoke('initAttr');
                    this._invoke('_initModel');
                },

                _destroy: function () {

                    this._invoke('_destroyWindow', false);

                    // 销毁该视图的所有子视图
                    this._invoke('_destroyView', false);

                    // 销毁第三方组件
                    this._invoke('_customDestory');

                    // 清除引用
                    this.viewModel = null;

                    this.options.sandbox.log('destroyed');
                },
                /**
                 * 视图初始化
                 * @function
                 * @inner
                 * @listens View#initialize
                 */
                initialize: function (options) {

                    options || (options = {});

                    // 应用mixins
                    this._applyMixins();

                    /**
                     * 视图的配置参数
                     * @name options
                     * @memberOf View#
                     * @type {ViewOptions}
                     * @todo 这里参数默认值合并使用了深拷贝，大多数时候其实没必要，目前实际测试速度影响暂时不大
                     */
                    this.options = $.extend(true, {}, this._defaults, this.defaults, options);

                    this._initProps(options);

                    // 将方法绑定到当前视图
                    if (this.binds.length > 0) {
                        this.binds.unshift(this);
                        _.bindAll.apply(_, this.binds);
                    }

                    // hook element
                    this.$el.addClass('ver-view');
                    if (this.options._widgetName) {
                        this.$el.addClass(this.options._widgetName.join(' '));
                    }

                    this._setup(options);
                    this._invoke('init');
                    this.trigger('init');

                    // 渲染
                    this.options.autoRender && this.render();
                },
                /**
                 * 销毁该视图
                 */
                destroy: function () {
                    this._destroy();
                },
                /**
                 * 重新设置参数，设置后会重新初始化视图
                 * @param {object} options - 视图参数
                 * @returns {void}
                 */
                reset: function (options) {
                    this.destroy();
                    // remove 时会调用该方法，由于没有调用 remove，则手动 stopListening
                    this.stopListening();
                    options = $.extend({}, this.options, options);
                    this.initialize(options);
                }
            }
        }
        base._extend(lifecycleAblility);

        listen(base, app);
        attr(base, app);
        mvvm(base, app);
        render(base, app);
        children(base, app);
        subwindow(base, app);
        action(base, app);

        /**
         * @classdesc 视图
         * @class veronica.View
         * @augments Backbone.View
         */
        app.view.base = base;
    };
});
