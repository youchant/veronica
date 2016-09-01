define([
    './_combine'
], function (combineFunction) {

    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;
        var classBase = app.core.classBase;

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

        var base = _.extend({}, classBase, {
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

                this._activeViewName = null;
            },

            _i18n: function (key) {
                var i18n = app.i18n.get();
                return i18n[key];
            },
            /**
             * 获取后台请求的 url
             * @param name - url 名称
             * @return {string}
             */
            url: function (url) {
                return this.options.url[url];
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
            }
        });

        combineFunction(base, app);

        /**
         * @classdesc 视图
         * @class veronica.View
         * @augments Backbone.View
         */
        app.view.base = base;
    };
});
