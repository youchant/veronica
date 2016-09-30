define([
    '../base/index',
    '../framework/index',
    '../component/index',
    './appInjection'
], function (baseLib, frameworkLib, Component, appInjection) {

    'use strict';

    var AppPart = frameworkLib.AppPart;
    var AppProvider = frameworkLib.AppProvider;

    /**
     * @classdesc 应用程序类
     * @class Application
     * @memberOf veronica
     */
    var Application = Component.extend({
        options:{
            name: 'app',
            autoStart: false,
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
        },
        initialize: function (options) {
            options || (options = {});
            this.supr(options);
            
            this._busy = false;
            this._taskQueue = [];
            this.name = options.name;
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

    }, false);

    return Application;
});
