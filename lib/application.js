define([
    './core/index',
    './app/index'
], function (coreLib, appInjection) {

    'use strict';

    /**
     * 应用程序配置参数
     * @typedef AppOptions
     * @property {string} [name='app'] - 应用程序名称
     * @property {object} [homePage='home'] - 没有路由参数的起始页
     * @property {Array} [extensions=[]] - 扩展列表
     * @property {Array.<ModuleConfig>} [modules=[]] - 模块配置，当每个模块配置参数为字符串时，该字符串指定该模块的名称，其他参数采用默认参数
     * @property {boolean} [autoParseWidgetName=false] - 自动解析 widget 名称
     * @property {string}  [releaseWidgetPath='./widgets'] - 发布后的 widget 路径
     * @property {regex} [widgetNamePattern=/(\w*)-?(\w*)-?(\w*)/] - 解析  widget 名称的正则
     * @property {object} [module.defaults] - 模块默认参数
     * @property {object} [module.defaultModule] - 当未配置任何模块时，使用的默认模块配置
     * @property {object} [page] - page 和 layout 的默认配置
     * @property {boolean} [autoBuildPage=false] -
     *   是否启用自动页面配置。当通过路由或 `app.page.change`访问某个页面时，
     *   如果未找到对应的页面配置，启用自动页面配置时，会根据页面名称自动生成页面配置。
     *
     *   > **关于自动页面配置**
     *   >
     *   > 访问 basic/home/index 或 basic-home-index 时，系统会去查找名为 basic-home-index 的widget，并且添加 _common 的页面继承;
     *   > 如果访问index，则会查找basic/Home/index，如果访问 home/index，则会查找basic/home/index
     *
     */

    var each = coreLib._;
    var ClassBase = coreLib.ClassBase;
    var extend = coreLib.$.extend;

    /**
     * @classdesc 应用程序类
     * @class Application
     * @memberOf veronica
     */
    var Application = AppComponent.extend({
        initialize: function (options) {
            var me = this;
            var defaultOptions = {
                name: 'app',
                autoBuildPage: false,  // 自动生成页面配置
                autoParseWidgetName: false,  // 自动解析 widget 名称
                autoParseContext: false,
                releaseWidgetPath: './widgets',  // 发布后的 widget 路径

                global: true,  // 全局 app
                layout: {
                    rootNode: '.v-layout-root'
                },
                page: {
                    autoResolvePage: false,
                    autoBuild: false,
                    defaultConfig: {
                        layout: 'default',
                        inherits: ['_common']
                    },
                    defaultLayout: 'default',  // 默认布局
                    defaultLayoutRoot: 'v-render-body',  // 默认布局根
                    defaultSource: 'basic',  // 默认源
                    defaultInherit: '_common'  // 默认页面继承
                },
                widget: {
                    namePattern: '',
                    releasePath: './widgets'
                },
                mediator: {
                    wildcard: true,
                    delimiter: '.',
                    newListener: true,
                    maxListeners: 50
                },
                router: {
                    homePage: 'home'
                }
            };

            options = extend(true, {}, defaultOptions, options || {});

            this.core = coreLib;

            this._busy = false;
            this._taskQueue = [];

            /**@lends veronica.Application#*/
            var props = {
                _extensions: [],
                /**
                 * 应用程序名称
                 */
                name: options.name,
                /**
                 * veronica 对象
                 * @see {@link veronica}
                 */
                core: coreLib,
                /**
                 * 语言配置
                 */
                lang: {},
                /**
                 * 配置项 options
                 */
                config: options
            };

            extend(this, props);
            appInjection(this);

            this._subscribe();
        },
        _subscribe: function () {
            // listen
            var me = this;
            me.sub('layoutChanging', function (name, $root) {
                me.widget.stop($root);
            })
        },
        /**
         * 设置或获取是否忙
         * @param {boolean} [busy] - 是否忙碌
         * @returns {boolean}
         */
        busy: function(busy){
            if(busy != null){
                var origin = this._busy;
                this._busy = busy;
                // 如果不忙碌，则运行所有任务
                if(origin !== busy && busy === false){
                    this._runTask();
                }
            }
            return this._busy;
        },
        _runTask: function(){
            var queue = this._taskQueue;
            while (queue.length > 0) {
                (queue.shift())();
            }
        },
        addTask: function(task){
            this._taskQueue.push(task);
        },
        /**
         * 启动应用程序，开始页面路由
         * @fires Application#appStarted
         * @returns {void}
         */
        start: function () {
            this.createComponent('router', coreLib.AppRouter);
            coreLib.history.start({pushState: false});
            /**
             * **消息：** 应用程序页面启动完成
             * @event Application#appStarted
             */
            this.pub('appStarted');
        },
        /**
         * 停止应用程序
         */
        stop: function () {
            this.widget.stopAll();
        },
        /**
         * 使用扩展
         * @param {function} ext - 扩展函数
         * @returns {Object} this
         * @example
         *  var extension = function(app){
         *      app.ext.sayHello = function(){
         *          alert('hello world');
         *      }
         *  }
         *  app.use(extension);
         */
        use: function (ext) {
            var me = this;
            if (!_.isArray(ext)) {
                ext = [ext];
            }
            $.each(ext, function (i, func) {
                func(me, Application);
            });
            return this;
        },
        /**
         * 应用程序广播事件，它会在广播时自动附加应用程序名
         * @param {string} name 消息名称
         * @param {...unknowned} args  消息参数
         */
        pub: function () {
            var args = Array.prototype.slice.call(arguments);
            // args[0] = args[0] + '.' + this.name;
            args.push(this.name);
            this.mediator.emit.apply(this.mediater, args);
        },
        sub: function (name, callback) {
            this.mediator.on(name, callback);
        },
        /**
         * 创建组件
         * @param {string} name - 名称
         * @param {function} ctor - 构造器
         * @param {Object} [options] - 初始化参数
         * @returns {Object}
         */
        createComponent: function (name, ctor, options) {
            var me = this;
            options = extend({
                app: me
            }, me.config[name], options);
            var component = new ctor(options);
            if (name != null) {
                me[name] = component;
            }
            return component;
        },
        /**
         * 创建提供者组件
         * @param {string} name - 名称
         * @param {function} [ctor=AppProvider] - 构造器
         * @param {Object} options - 调用参数
         * @returns {*|Object}
         */
        createProvider: function (name, ctor, options) {
            if (ctor == null) {
                ctor = coreLib.AppProvider;
            }
            if (typeof ctor === 'object') {
                ctor = coreLib.AppProvider.extend(ctor);
            }
            return this.createComponent(name, ctor, options);
        }
    })

    return Application;
});
