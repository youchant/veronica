define([
], function () {

    'use strict';

    return function (app) {
        var core = app.core;
        var _ = app.core._;


        var Mod = (function () {

            /**
             * 不直接调用构造函数，通过 `app.module.create` 创建
             * @classdesc 应用程序模块
             * @class veronica.Module
             * @param {moduleConfig} options - 配置项
             * @param {function} [execution] - 入口执行方法
             * @example
             *   var module = app.module.create({
             *     name: 'dashboard',
             *     source: 'basic'
             *   });
             *   module.loadEntry().done(function(){
             *      module.apply();
             *   })
             */
            function Mod(options, execution) {
                // 将字符类型的模块配置转换成对象
                if (_.isString(options)) {
                    options = {
                        name: options,
                        source: app.config.module.defaults.source
                    };
                }

                _.defaults(options, app.config.module.defaults);

                var source = app.core.getConfig().sources[options.source] || options.source;

                /**
                 * @lends Module#
                 */
                var params = {
                    /** 模块名称 */
                    name: options.name,
                    /** 模块配置 */
                    config: options,
                    /** 路径 */
                    path: options.path || source + '/' + options.name,
                    /** 入口执行方法 */
                    execution: execution
                };

                _.extend(this, params);
            }

            /**
             * @lends veronica.Module#
             */
            var proto = {
                constructor: Mod,
                /**
                 * 往应用程序添加源，如果不传参，则将该模块本身widget路径添加到应用程序源里面
                 * @param {object} [sources] - 源配置
                 * @example
                 *   module.addSource({
                 *     'dashboard-alt': './subpath'  // 路径是相对于module的路径
                 *   })
                 */
                addSource: function (sources) {
                    var me = this;
                    if (sources == null) {
                        // 将模块路径添加为源
                        sources = {};
                        sources[this.name] = this.config.widgetPath;
                    }

                    _.each(sources, function (src, name) {
                        app.core.getConfig().sources[name] = me.path + '/' + src;
                    });
                },
                // 添加插件
                addPlugin: function (plugin) {
                    app.plugin.add(plugin, this.name);
                },
                // 添加组件
                addControl: function (control) {
                    var cts = app.core.getConfig().controls;

                    cts || (cts = []);
                    if (!_.isArray(control)) {
                        control = [control];
                    }
                    app.core.getConfig().controls = _.uniq(cts.concat(control));
                },
                /**
                 * 往应用程序添加页面
                 */
                addPage: function (page) {
                    app.page.add(page);
                },
                /**
                 * 往应用程序添加扩展
                 */
                addExtension: function (extensions) {
                    app.use(extensions);
                },
                /**
                 * 往应用程序添加布局
                 */
                addLayout: function (layouts) {
                    app.layout.add(layouts);
                },
                /**
                 * 加载入口执行方法
                 */
                loadEntry: function () {
                    var me = this;
                    var entryFileUrl = this.path + '/' + this.config.entryPath;
                    return core.loader.require(entryFileUrl, this.config.hasEntry)
                        .done(function (m, fn) {
                            me.execution = fn;
                        });
                },
                /**
                 * 应用该模块，添加widget源，并执行入口方法
                 */
                apply: function () {

                    this.addSource();

                    // 执行模块入口方法
                    this.execution && this.execution(this, app);
                }
            };

            Mod.prototype = proto;

            return Mod;
        })();

        /**
         * 模块配置，有纯字符串的简写形式
         * @typedef moduleConfig
         * @property {string} name - 模块名称
         * @property {string} [source='modules'] - 模块源（地址）
         * @property {boolean} [hasEntry=true] - 模块是否有入口方法
         * @property {string} [path=null] - 模块路径，如果不设置，根据模块源和模块名称计算得出
         * @property {boolean} [multilevel=false] - 内部 widget 放置是否是多层级的
         * @property {string} [build=null] - 打包后模块的路径，如果不指定则按照默认规则放置
         */

        /**
         * 无法直接构造
         * @classdesc 模块
         * @class veronica.ModuleHandler
         */

        /** @lends veronica.ModuleHandler# */
        var module = {
            _modules: {},
            /** 
             * 应用所有模块
             */
            apply: function () {
                _.each(this.get(), function (mod) {
                    mod.apply();
                });
            },
            /**
             * 创建模块
             * @param {moduleConfig} options - 配置项
             * @param {function} execution - 入口执行方法
             * @returns {veronica.Module}
             */
            create: function (options, execution) {
                return new Mod(options, execution);
            },
            /**
             * 添加一个模块
             * @param {module|array} module - 添加
             */
            add: function (module) {
                this._modules[module.name] = module;
            },
            /**
             * 获取模块，不传名称则获取所有模块
             * @param {string} [name] - 模块名称
             * @returns {veronica.Module}
             */
            get: function (name) {
                return name == null ? this._modules : this._modules[name];
            },
            // 获取模块路径
            path: function (moduleName) {
                return this._modules[moduleName].path;
            }
        };

        /**
         * @name module
         * @type {veronica.ModuleHandler}
         * @memberOf veronica.Application#
         */
        app.module = module;
    };

});
