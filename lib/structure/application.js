define([
    './index'
], function (core) {

    'use strict';

    /**
     * 不用构造函数调用来创建 application 实例，而是使用 `veronica.createApp`
     * @classdesc 应用程序类
     * @class Application
     * @memberOf veronica
     */
    function Application(options) {
        var $ = core.$;

        /**
         * 应用程序配置参数
         * @typedef AppOptions
         * @property {string} [name='app'] - 应用程序名称
         * @property {object} [homePage='home'] - 没有路由参数的起始页
         * @property {array} [extensions=[]] - 扩展列表
         * @property {array.<ModuleConfig>} [modules=[]] - 模块配置，当每个模块配置参数为字符串时，该字符串指定该模块的名称，其他参数采用默认参数
         * @property {boolean} [autoParseWidgetName=false] - 自动解析 widget 名称
         * @property {string}  [releaseWidgetPath='./widgets'] - 发布后的 widget 路径
         * @property {regex} [widgetNamePattern=/(\w*)-?(\w*)-?(\w*)/] - 解析  widget 名称的正则
         * @property {object} [module.defaults] - 模块默认参数
         * @property {object} [module.defaultModule] - 当未配置任何模块时，使用的默认模块配置
         * @property {object} [page] - page 和 layout 的默认配置
         * @property {array} [features=['dialog', 'plugin', 'spa']] -
         *   设置创建的该应用程序需要启用哪些特性，目前包括：
         *
         *    * dialog: 支持对话框
         *    * plugin: 支持插件扩展widget
         *    * spa: 支持单页面应用程序的构建（页面、布局、路由，导航等）
         *
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
        var defaultOptions = {
            name: 'app',
            extensions: [],
            modules: [],
            autoBuildPage: false,  // 自动生成页面配置
            autoParseWidgetName: false,  // 自动解析 widget 名称
            releaseWidgetPath: './widgets',  // 发布后的 widget 路径
            widgetNamePattern: /(\w*)-?(\w*)-?(\w*)/,  // 解析  widget 名称的正则

            global: true,  // 全局 app
            homePage: 'home',
            page: {
                defaultLayout: 'default',  // 默认布局
                defaultLayoutRoot: 'v-render-body',  // 默认布局根
                defaultSource: 'basic',  // 默认源
                defaultInherit: '_common'  // 默认页面继承
            },
            widget: {
                defaultHost: '.v-render-body',  // 默认宿主元素
            },
            defaultPage: 'default',  // 没用，废弃
            router: {
                pagePattern: '\/?(.+)\??(.+)'  // 没用，移除
            }
        };

        options = $.extend(true, {}, defaultOptions, options || {});

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
         * @param {Object} [options={}] - 启动参数
         * @param {boolean} [options.parse=false] - 是否解析当前页面
         * @returns {Promise}
         */
        launch: function (options) {
            var promises = [];
            var me = this;

            options || (options = {});

            // 加载扩展
            _.each(this.config.extensions, function (ext) {

                var dfd = core.loader.require(ext, _.isString(ext)).done(function (ext, fn) {
                    if (fn == null) { fn = ext; }
                    _.isFunction(fn) && me.use(fn);
                });

                promises.push(dfd);
            });

            // 加载模块
            _.each(this.config.modules, function (moduleConfig) {
                me.module.add(moduleConfig.name, moduleConfig);
            });

            return $.when.apply($, promises).done(function () {
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
