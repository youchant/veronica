define([
    '../base/index',
    '../framework/index',
    '../component/index',
    './appInjection'
], function (baseLib, frameworkLib, Component, appInjection) {

    'use strict';

    /**
     * 应用程序页面启动完成
     * @event Application#appStarted
     */

    var Application = Component.extend(/** @lends Application# */{
        /**
         * @typedef {Object} ApplicationOptions
         * @description 可传入部件的配置参数，以部件的名称作为键
         * @property {string} [name='app'] - 应用程序名
         * @property {boolean} [global=true] - 是否全局对象
         * @extends ComponentOptions
         */
        options: {
            name: 'app',
            global: true  // 全局 app
        },
        /**
         * 应用程序
         * @constructs Application
         * @param {ApplicationOptions} [options] - 配置参数
         * @augments Component
         */
        initialize: function (options) {
            options || (options = {});
            this.supr(options);
        },
        _setup: function(){
            this.supr();
            this.supr();
            this._busy = false;
            this._taskQueue = [];
            this.name = this.options.name;
            appInjection(this);
        },
        created: function () {
            this._subscribe();
        },
        _subscribe: function () {
            // listen
            var me = this;
            me.sub('layoutChanging', function (name, $root) {
                me.part('component').stop($root);
            })
        },
        /**
         * 设置或获取是否正忙
         * @param {boolean} [busy] - 是否忙碌
         * @returns {boolean}
         */
        busy: function (busy) {
            if (busy != null) {
                var origin = this._busy;
                this._busy = busy;
                // 如果不忙碌，则运行所有任务
                if (origin !== busy && busy === false) {
                    this._runTask();
                }
            }
            return this._busy;
        },
        _runTask: function () {
            var queue = this._taskQueue;
            while (queue.length > 0) {
                (queue.shift())();
            }
        },
        addTask: function (task) {
            this._taskQueue.push(task);
        },
        /**
         * 启动应用程序，开始页面路由
         * @fires Application#appStarted
         * @returns {void}
         */
        start: function () {

            this.history.start({pushState: false});

            this.pub('appStarted');
        },
        /**
         * 停止应用程序
         */
        stop: function () {
            this.part('component').stopAll();
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
        }

    }, false);

    return Application;
});
