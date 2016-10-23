define([
    '../base/index',
    '../framework/index'
], function (baseLib, frameworkLib) {
    var _ = baseLib._;

    return function (app) {
        /**
         * 中介者，消息总线
         * @name part:mediator
         * @type {veronica.Observable}
         * @memberOf Application#
         */
        app.create('part:mediator', {ctor: baseLib.Observable});
        /**
         * 日志记录器
         * @name part:logger
         * @type veronica.Logger
         * @memberOf Application#
         */
        app.create('part:logger', {ctor: baseLib.Logger});
        /**
         * 组件定义管理器
         * @name part:componentDef
         * @type veronica.ComponentDefManager
         * @memberOf Application#
         */
        app.create('part:componentDef', {ctor: frameworkLib.ComponentDefManager});
        /**
         * 组件管理器
         * @name part:component
         * @type veronica.ComponentManager
         * @memberOf Application#
         */
        app.create('part:component', {ctor: frameworkLib.ComponentManager});
        /**
         * 布局管理器
         * @name part:layout
         * @type veronica.LayoutManager
         * @memberOf Application#
         */
        app.create('part:layout', {ctor: frameworkLib.LayoutManager});
        /**
         * 页面管理器
         * @name part:page
         * @type veronica.PageManager
         * @memberOf Application#
         */
        app.create('part:page', {ctor: frameworkLib.PageManager});
        /**
         * 路由器
         * @name part:router
         * @type veronica.AppRouter
         * @memberOf Application#
         */
        app.create('part:router', {ctor: frameworkLib.AppRouter});
        /**
         * 部件类型提供者容器
         * @name part:partType
         * @type veronica.AppProvider
         * @memberOf Application#
         */
        app.create('provider:partType');
        /**
         * 界面套件提供者容器
         * @name part:uiKit
         * @type veronica.AppProvider
         * @memberOf Application#
         */
        app.create('provider:uiKit');
        /**
         * 模板引擎提供者容器
         * @name part:templateEngine
         * @type veronica.AppProvider
         * @memberOf Application#
         */
        app.create('provider:templateEngine');
        /**
         * 视图引擎提供者容器
         * @name part:viewEngine
         * @type veronica.AppProvider
         * @memberOf Application#
         */
        app.create('provider:viewEngine');
        /**
         * 应用程序模块提供者容器
         * @name part:module
         * @type veronica.AppProvider
         * @memberOf Application#
         */
        app.create('provider:module');
        /**
         * 本地化提供者容器
         * @name part:i18n
         * @type veronica.AppProvider
         * @memberOf Application#
         */
        app.create('provider:i18n');
        /**
         * 加载器提供者容器
         * @name part:loader
         * @type veronica.AppProvider
         * @memberOf Application#
         */
        app.create('provider:loader');
        /**
         * 浏览器历史管理器
         * @name part:history
         * @type veronica.History
         * @memberOf Application#
         */
        app._addPart('history', baseLib.history);

        // ComponentPart
        //TODO: 这里需要重写
        var eventPattern = /^(\S+)\s*(.*)$/;
        app.part('partType').add('default', {
            create: function (options) {

            },
            listen: function (view, name, listener) {

            }
        });
        app.part('partType').add('ui', {
            create: function () {

            },
            listen: function (view, name, listener) {
                var match = eventPattern.exec(name);
                var event = match[1];
                var target = match[2];
                target = view.ui('[data-ref=' + target + ']');

                if (target != null) {
                    target.bind(event, _.bind(listener, view));
                }
            }
        });

        /**
         * 界面套件提供者统一接口
         * @interface UIKit
         */
        app.part('uiKit').add('default', /** @lends UIKit# */{
                /**
                 * 初始化
                 * @param {Component} view - 视图
                 * @param {jQueryObject} $dom - 根节点
                 */
                init: function (view, $dom) {

                },
                /**
                 * 创建
                 * @param name
                 * @param options
                 */
                create: function (name, options) {

                },
                addParts: function (view) {

                },
                destroy: function () {
                },
                /**
                 * 获取实例对象
                 */
                getInstance: function ($dom) {

                }
            });

        // ViewEngine

        /**
         * 视图引擎提供者接口
         * @interface ViewEngine
         */
        app.part('viewEngine').add('default', /** @lends ViewEngine# */ {
            /**
             * 绑定界面
             * @param {veronica.Component} component - 当前组件
             * @param {jQueryDOM} $dom - 绑定元素
             * @param {Object} model - 待绑定数据
             */
            bind: function (component, $dom, model) {

            },
            /**
             * 解除绑定
             * @param {veronica.Component} component - 当前组件
             */
            unbind: function (component) {

            },
            /**
             * 创建绑定数据
             * @param {Object} data - 数据
             * @returns {Object} - 处理后数据
             */
            create: function (data) {
                return data;
            },
            /**
             * 绑定事件
             * @param {Object} vm - 视图模型
             * @param {veroncia.Component} component - 当前组件
             */
            bindEvents: function (vm, component) {

            },
            /**
             * 获取值
             * @param {Object} model - 模型
             * @param {string} name - 字段名
             */
            get: function (model, name) {

            },
            /**
             * 设置值
             * @param {Object} model - 模型
             * @param {string} name - 字段名
             * @param {string} value - 值
             */
            set: function (model, name, value) {
            }
        });

        /**
         * 模板引擎提供者接口
         * @interface TemplateEngine
         */

        var templateEngine = app.get('part:templateEngine');

        templateEngine.add('default', /** @lends TemplateEngine# */{
            /**
             * 初始化模板参数
             * @param {veronica.Component} component - 当前组件
             * @returns {Object}
             */
            options: function (component) {
                return {};
            },
            /**
             * 编译模板
             * @param {string} text - 模板片段
             * @returns {Function}
             */
            compile: function (text) {
                return function () {
                    return text;
                }
            }
        });

        templateEngine.add('underscore', {
            options: function (view) {
                return _.extend({}, view.options);
            },
            compile: function (text, view) {
                return _.template(text, {variable: 'data'});
            }
        });

        templateEngine.add('lodash', {
            options: function (view) {
                return _.extend({}, view.options);
            },
            compile: function (text, view) {
                return _.template(text, {variable: 'data'});
            }
        });


        /**
         * 应用程序模块提供者接口
         * @interface Module
         */
        var mod = app.get('part:module');
        mod.add('default', /** @lends Module# */{
            /**
             * 模块名称
             */
            name: 'default',
            /**
             * 模块路径模式
             */
            path: 'widgets',
            /**
             * 是否组件是多文件夹放置
             */
            multilevel: false,
            /**
             * 组件位置模式
             */
            locationPattern: /(\w*)-?(\w*)-?(\w*)-?(\w*)-?(\w*)/,
            /**
             * 取得路径
             * @returns {string}
             */
            resolvePath: function () {
                var path = this.path;
                return path.replace('${name}', this.name);
            },
            /**
             * 取得模块组件位置
             * @param {string} name - 组件定义名
             * @returns {string}
             */
            resolveLocation: function (name) {
                var me = this;
                var resolvedName = name;
                if (me.multilevel === true) {
                    var parts = me.locationPattern.exec(name);
                    resolvedName = _.reduce(parts, function (memo, name, i) {
                        // 因为第0项是全名称，所以直接跳过
                        if (name === '') {
                            return memo;
                        }
                        if (i === 1) {
                            // 如果第一个与source名称相同，则不要重复返回路径
                            if (name === me.name) {
                                return '';
                            }
                            return name;
                        }
                        return memo + '/' + name;
                    });
                }

                return me.resolvePath() + '/' + resolvedName;
            }
        });
    };
});
