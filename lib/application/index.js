define([
    '../base/index',
    '../framework/index',
    './appInjection'
], function (baseLib, frameworkLib, appInjection) {

    'use strict';

    var extend = baseLib.$.extend;
    var AppPart = frameworkLib.AppPart;
    var AppProvider = frameworkLib.AppProvider;

    /**
     * @classdesc 应用程序类
     * @class Application
     * @memberOf veronica
     */
    var Application = AppPart.extend({
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
                component: {
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
            
            this._busy = false;
            this._taskQueue = [];
            this.name = options.name;
            this.config = options;
            
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
           
            this.history.start({pushState: false});
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
         * 创建部件
         * @param {string} name - 名称
         * @param {function} ctor - 构造器
         * @param {Object} [options] - 初始化参数
         * @returns {Object}
         */
        createPart: function (name, ctor, options) {
            var me = this;
            // 从 application 中读取配置
            options = extend({
                app: me
            }, me.config[name], options);
            
            var part = new ctor(options);
            if (name != null) {
                me[name] = part;
            }
            return part;
        },
        /**
         * 创建提供者部件
         * @param {string} name - 名称
         * @param {function} [ctor=AppProvider] - 构造器
         * @param {Object} options - 调用参数
         * @returns {*|Object}
         */
        createProvider: function (name, ctor, options) {
            if (ctor == null) {
                ctor = AppProvider;
            }
            if (typeof ctor === 'object') {
                ctor = AppProvider.extend(ctor);
            }
            return this.createPart(name, ctor, options);
        }
    });

    return Application;
});
