
define([], function () {

    return function (app) {
        var core = app.core;
        var $ = app.core.$;
        var _ = app.core._;

        /**
         * 无法通过构造函数直接构造
         * @classdesc 页面相关
         * @class veronica.Page
         */

        /**
         * @name page
         * @memberOf veronica.Application#
         * @type {veronica.Page}
         */
        app.page = app.provider.create(/** @lends veronica.Page# */{
            _currPageName: '',
            _changeTitle: function () { },
            // 递归获取所有的父级 widgets 配置
            _getAllWidgetConfigs: function getAllWidgetConfigs(config, page, result) {
                if (result == null) {
                    result = [];
                }
                result.push(config.widgets);

                _.each(config.inherits, function (parentName) {
                    var config = page.get(parentName);
                    result.push(config.widgets);
                    result = getAllWidgetConfigs(config, page, result);
                });

                return result;
            },
            isCurrent: function (pageName) {
                var currName = this.getCurrName();
                return currName === 'default' || currName === pageName;
            },
            /**
             * 获取当前页面名称
             * @function
             * @name currName
             * @memberOf Page#
             */
            getCurrName: function () {
                return this._currPageName;
            },
            setCurrName: function (name) {
                this._currPageName = name;
            },
            /**
             * 加载页面
             * @param {string} name - 页面名称
             * @private
             */
            _load: function (name, config, params) {
                var me = this;
                var widgetsConfig = this._getAllWidgetConfigs(config);
                var currPageName = this.getCurrName();
                var currPageConfig;
                var dfd = $.Deferred();
                var proms = core.util.donePromise();

                /**
                 * **消息：** 页面加载中
                 * @event Application#page.pageLoading
                 * @param {string} name - 页面名称
                 */
                app.emit('pageLoading', name);

                // 在页面加载之前，进行布局的预加载
                if (currPageName === '' ||
                    (currPageConfig = this.get(currPageName)) && currPageConfig.layout !== config.layout) {

                    proms = app.layout.change(config.layout).done(function () {

                        /**
                         * **消息：** 布局加载完毕
                         * @event Application#layout.layoutChanged
                         * @param {string} name - 布局名称
                         */
                        app.emit('layoutChanged', config.layout);
                    }).fail(function () {
                        dfd.reject();
                    });
                }

                proms.done(function () {
                    me.setCurrName(name);

                    app.sandbox.startWidgets(widgetsConfig, name).done(function () {
                        // 切换页面后进行垃圾回收
                        app.widget.recycle();

                        /**
                         * **消息：** 页面加载完毕
                         * @event Application#page.pageLoaded
                         * @param {string} name - 页面名称
                         */
                        app.emit('pageLoaded', name);
                        dfd.resolve();
                    });
                });

                return dfd.promise();
            },
            /**
             * 活动
             */
            active: function (name) {
                if (name) {
                    return this.change(name);
                } else {
                    name = this.getCurrName();
                }
                return name;
            },
            // 获取页面配置
            get: function (name) {
                var config = this._pages[name];
                return config;
            },
            /**
             * 添加页面配置组
             * @param {object|array} configs - 页面配置组（当为单个配置时，可以不用数组）
             */
            add: function (configs) {

                return this;
            },
            /**
             * 启动页面
             * @param {boolean} [initLayout=false] - 是否初始化布局
             * @fires Application#appStarted
             */
            start: function (initLayout) {
                if (initLayout) {
                    app.layout.init();
                }
                app.router.start();
                /**
                 * **消息：** 应用程序页面启动完成
                 * @event Application#appStarted
                 */
                app.emit('appStarted');
            },
            // 解析页面配置
            resolve: function (name) {
                var config = this.get(name);
                var proms = core.util.failPromise();
                var me = this;
                if (!config) {
                    if (app.config.autoResolvePage) {
                        var c = page.build(name);
                        if (c) {
                            var obj = {};
                            obj[name] = c;
                            me.add(obj);
                            config = me.get(name);
                        }

                        // 未找到页面配置，则从该路径后台读取页面配置
                        if (!config) {
                            var pageUrl = name.replace('-', '/');
                            proms = $.getJSON(pageUrl);
                        }
                    }
                }
                if (config) {
                    proms = core.util.donePromise(config);
                }

                proms.fail(function () {
                    /**
                     * **消息：** 页面未找到
                     * @event Application#page.pageNotFound
                     * @param {string} name - 页面名称
                     */
                    app.emit('pageNotFound', name);
                });

                return proms;
            },
            build: function (name) {

            },
            /**
             * 改变页面
             * @param {string} name - 页面名称
             * @fires Application#page.pageNotFound
             * @fires Application#page.pageLoading
             * @fires Application#layout.layoutChanged
             * @fires Application#page.pageLoaded
             */
            change: function (name, params) {
                var page = this;
                me.resolve(name).done(function (config) {
                    page._load(name, config, params);
                });
            }
        });

        app.page.add('_common', {
            name: '_common',
            inherits: false
        });

        app.page.add('default', {
            name: 'default',
            layout: 'default',
            inherits: ['_common']
        });

    };
});
