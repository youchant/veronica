
define([
    './core'
], /**@lends veronica */function (core) {

    'use strict';

    /**
     * @class
     * @memberOf veronica
     */
    var Application = function (options) {
        var $ = core.$;

        this._extensions = [];
        this.name = options.name;
        this.core = core;
        this.lang = {};
        this.config = $.extend({
            extensions: [],
            modules: []
        }, options);
    }


    Application.prototype = /** @lends Application.prototype */{
        constructors: Application,
        /**
         * 启动应用程序
         * @param {Object} [options={}] 启动参数
         * @param {boolean} options.parse 是否解析当前页面
         * @returns {Promise}
         */
        launch: function (options) {
            var promises = [];
            var me = this;

            options || (options = {});

            // 加载扩展
            _(this.config.extensions).each(function (ext) {

                var dfd = core.loader.require(ext, _.isString(ext)).done(function (ext, fn) {
                    _.isFunction(fn) && me.use(fn);
                });

                promises.push(dfd);
            });

            // 加载模块
            _(this.config.modules).each(function (moduleConfig) {

                var module = me.module.create(moduleConfig);
                var entryFileUrl = module.path + '/' + module.config.entryPath;
                var dfd = core.loader.require(entryFileUrl, moduleConfig.hasEntry)
                    .done(function (m, fn) {
                        module.execution = fn;
                        me.module.add(module);
                    });

                promises.push(dfd);
            });

            return $.when.apply($, promises).done(function () {
                me.module.apply();
                me.widget.package();

                if (options.parse) {
                    me.parser.parse();
                }
            });
        },
        /**
         * 停止应用程序
         */
        stop: function () {
            this.sandbox.stop();
        },
        /**
         * 使用用户扩展
         * @param {function} 扩展函数
         * @returns {object} this
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
         * 混入
         * @param {object} mixin 混入的对象
         * @param {boolean} [isExtend=true] 是否扩展到该实例上
         * @returns {object} this
         */
        mixin: function (mixin, isExtend) {
            if (isExtend == null) {
                isExtend = true;
            }
            if (isExtend) {
                this.core.util.mixin(this, mixin);
            } else {
                this.core.util.mixin(Application, mixin);
            }
            return this;
        },
        /**
         * 应用程序广播事件，它会在广播时自动附加应用程序名
         * @param {string} name 消息名称
         * @param {...unknowned} args  消息参数
         */
        emit: function () {
            var args = Array.prototype.slice.call(arguments);
            // args[0] = args[0] + '.' + this.name;
            args.push(this.name);
            this.sandbox.emit.apply(this.sandbox, args);
        }
    }

    return Application;

});
