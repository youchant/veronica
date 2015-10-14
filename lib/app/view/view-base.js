define([
    './view-mvvm',
    './view-window',
    './view-attr',
    './view-action',
    './view-children',
    './view-listen',
    './view-render',
    './view-resize',
    './view-trigger'
], function (mvvm, subwindow, attr, action, children, listen, render, resize, trigger) {

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

        /** @lends veronica.View# */
        var base = {

            /**
             * 该视图的默认参数
             * @type {object}
             * @default
             */
            defaults: {},

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
            aspect: noop,

            /**
             * **`重写`** 视图的自定义初始化代码
             * @type {function}
             * @default
             */
            init: noop,



            /**
             * **`重写`** 混入其他视图方法
             * @type {function}
             * @returns {array}
             * @example
             *   mixins: function () {
             *       return [editHelper];
             *   }
             */
            mixins: noop,

            /**
             * **`重写`** 自定义销毁，通常用于释放视图使用的全局资源
             * @type {function}
             * @example
             *   _customDestory: function () {
             *     $(window).off('resize', this.resizeHanlder);
             *   }
             */
            _customDestory: noop,

            _defaults: {
                autoAction: false,

                autoResize: false,
                /**
                 * @deprecated
                 * @private
                 */
                lazyTemplate: false,
                langClass: null
            },

            /**
             * 视图初始化
             * @function
             * @inner
             * @listens View#initialize
             */
            initialize: function (options) {

                var me = this;

                options || (options = {});

                /**
                 * 视图的配置参数
                 * @name options
                 * @memberOf View#
                 * @type {ViewOptions}
                 * @todo 这里参数默认值合并使用了深拷贝，大多数时候其实没必要，目前实际测试速度影响暂时不大
                 */
                this.options = $.extend(true, this._defaults, this.defaults, options);

                /**
                 * 默认绑定视图对象到函数上下文的函数
                 * @name binds
                 * @memberOf View#
                 */
                this.binds = ['resize'];

                this._windows = {};  // 子窗口集合
                this._views = {};  // 子视图集合
                this._delayEvents = [];
                this._attributes = {};
                this.state = {};  // 视图状态

                this.baseModel = _.isFunction(this.staticModel) ? this._invoke('staticModel') : this.staticModel;
                this.viewModel = {};  // 该视图的视图模型
                this._activeViewName = null;
                this._name = options._name;

                // 将方法绑定到当前视图
                if (this.binds) {
                    this.binds.unshift(this);
                    _.bindAll.apply(_, this.binds);
                }

                // 混入AOP方法
                app.core.util.extend(this, app.core.aspect);

                // 应用mixins
                this._applyMixins();

                this.$el.addClass('ver-view');

                this._invoke('_loadPlugin');

                this._invoke('aspect');

                this._invoke('_defaultListen');

                this._invoke('_autoResize');

                this._invoke('_resetParentWnd');

                this._invoke('_initModel');

                // 初始化自定义属性
                this._invoke('initAttr');

                this._invoke('subscribe');  // 初始化广播监听

                this._invoke('_autoAction');

                this._invoke('init');

                this.trigger('init');

                // 渲染
                this.options.autoRender && this.render();
            },
            _applyMixins: function () {
                //TODO: 这里应将同名的属性或方法进行合并
                var me = this;
                _.each(this._invoke('mixins'), function (mixin) {
                    _.each(mixin, function (value, key) {
                        if (me[key] == null) {
                            me[key] = value;
                        }
                    });
                });
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

                return method && method.apply(this, args.slice(sliceLen));
            },
            /**
              * 显示该视图
              * @function
              */
            show: function () {
                var me = this;
                this.$el.show(false, function () {
                    if (me.options.autoResize) {
                        me.resize();
                    }
                });
            },
            /**
              * 隐藏该视图
              * @function
              */
            hide: function () {
                this.$el.hide(false);
            },

            _destroy: function () {
                // 清理在全局注册的事件处理器
                this.options.autoResize && $(window).off('resize', this.resize);

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
             * 销毁该视图
             */
            destroy: function () {
                this._destroy();
            }
        };

        /**
         * @classdesc 视图
         * @class veronica.View
         * @augments Backbone.View
         */
        app.view.base = base;

        mvvm(app);
        subwindow(app);
        attr(app);
        action(app);
        children(app);
        listen(app);
        render(app);
        resize(app);
        trigger(app);
    };
});
