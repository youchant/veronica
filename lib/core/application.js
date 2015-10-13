define([
    './core'
], function (core) {

    'use strict';

    /**
     * 不用构造函数调用来创建 application 实例，而是使用 `veronica.createApp`
     * @classdesc 应用程序类
     * @class Application
     * @param {object} [options] - 选项
     * @param {string} options.name
     * @memberOf veronica
     */
    function Application(options) {
        var $ = core.$;

        // 默认配置
        var defaultOptions = {
            name: 'app',
            extensions: [],
            modules: [],
            autoBuildPage: false,  // 自动生成页面配置
            features: ['dialog', 'plugin', 'spa'],
            autoParseWidgetName: false,  // 自动解析 widget 名称
            releaseWidgetPath: './widgets',  // 发布后的 widget 路径
            widgetNamePattern: /(\w*)-?(\w*)-?(\w*)/,  // 解析  widget 名称的正则

            global: true,  // 全局 app
            plugins: {},
            defaultPage: 'default',
            homePage: 'home',
            page: {
                defaultLayout: 'default',  // 默认布局
                defaultHost: '.v-render-body',  // 默认宿主元素
                defaultSource: 'basic',  // 默认源
                defaultInherit: '_common'  // 默认页面继承
            },
            module: {
                // module 配置的默认值
                defaults: {
                    multilevel: false,
                    hasEntry: true,
                    entryPath: 'main',
                    widgetPath: 'widgets',
                    source: 'modules'
                },
                // 默认 module
                defaultModule: {
                    name: core.constant.DEFAULT_MODULE_NAME,
                    source: '.',
                    path: '.',
                    hasEntry: false,
                    build: '{{ dir }}{{ baseUrl }}{{ type }}'
                }
            },
            router: {
                pagePattern: '\/?(.+)\??(.+)'  // 没用，移除
            }
        };

        options = $.extend(true, {}, defaultOptions, options || {});

        if (!options.modules || options.modules.length === 0) {
            options.modules = [options.module.defaultModule];
        }

        /**@lends veronica.Application#*/
        var prop = {
            _extensions: [],
            /**
             * 应用程序名称
             */
            name: options.name,
            /**
             * veronica 对象
             * @see {@link veronica}
             */
            core: core,
            /**
             * 语言配置
             */
            lang: {},
            /**
             * 配置项 options
             */
            config: options
        };

        $.extend(this, prop);

    }


    /**@lends veronica.Application# */
    var proto = {
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
                    if (fn == null) { fn = ext; }
                    _.isFunction(fn) && me.use(fn);
                });

                promises.push(dfd);
            });

            // 加载模块
            _(this.config.modules).each(function (moduleConfig) {

                var module = me.module.create(moduleConfig);
                var dfd = module.loadEntry();

                me.module.add(module);
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
         * @param {Function} ext - 扩展函数
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
         * 混入
         * @param {Object} mixin 混入的对象
         * @param {boolean} [isExtend=true] 是否扩展到该实例上
         * @returns {Object} this
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

    Application.prototype = proto;

    return Application;

});
