define([
    '../base/index',
    './appProvider'
], function (baseLib, AppProvider) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var each = _.each;
    var flatten = _.flatten;
    var doneDeferred = _.doneDeferred;
    var failDeferred = _.failDeferred;

    /**
     * **消息：** 页面未找到
     * @event Application#pageNotFound
     * @param {string} name - 页面名称
     */

    /**
     * **消息：** 页面加载中
     * @event Application#pageLoading
     * @param {string} name - 页面名称
     */

    /**
     * **消息：** 页面加载完毕
     * @event Application#pageLoaded
     * @param {string} name - 页面名称
     */

    /**
     * @typedef Page
     * @property {string} name - 页面名称
     * @property {string} layout - 布局
     * @property {Array.<ComponentStartConfig>} components - 组件启动配置
     */


    var PageManager = AppProvider.extend(/** @lends veronica.PageManager# */{
        /**
         * @typedef {Object} PageManagerOptions
         * @property {boolean} [autoResolvePage=false] - 当找不到页面配置时，自动解析页面配置
         */
        options: {
            autoResolvePage: false
        },
        /**
         * 页面管理器
         * @constructs PageManager
         * @param {PageManagerOptions} options - 参数
         * @augments veronica.AppProvider
         * @memberOf veronica
         */
        initialize: function (options) {
            this.supr(options);
            this._currPageName = '';
        },
        _build: function (name) {
            var me = this;
            if (me.options.autoResolvePage) {
                var config = {
                    name: name,
                    components: [name]
                };
                me.add(name, config);
                return config;
            }
            return null;
        },
        // 递归获取所有的父级 components 配置
        _getComponentConfigsRecursive: function getConfigs(config, context, result) {
            if (context == null) {
                context = this;
            }
            if (result == null) {
                result = [];
            }
            result.push(config.components);

            each(config.inherits, function (parentName) {
                var config = context.get(parentName);
                result = getConfigs(config, context, result);
            });

            return result;
        },
        _getAllComponentConfigs: function (config) {
            return flatten(this._getComponentConfigsRecursive(config))
        },
        isCurrent: function (pageName) {
            var currName = this.getCurrName();
            return currName === 'default' || currName === pageName;
        },
        /**
         * 获取当前页面名称
         * @returns {string}
         */
        getCurrName: function () {
            return this._currPageName;
        },
        _setCurrName: function (name) {
            this._currPageName = name;
        },
        _changeLayout: function (layout) {
            var app = this.app();
            var layoutManager = app.part('layout');
            var currPageName = this.getCurrName();
            var currPageConfig = this.get(currPageName);
            if (currPageName === '' || currPageConfig && currPageConfig.layout !== layout) {
                return layoutManager.change(layout);
            }
            return doneDeferred();
        },
        _load: function (configs, pageName) {
            var app = this.app();
            var cmpManager = app.part('component');
            return cmpManager.start(configs, pageName).done(function () {
                // 切换页面后进行垃圾回收
                cmpManager.recycle();
            });
        },
        /**
         * 获取（解决）页面
         * @param {string} name - 页面名称
         * @returns {Promise.<Page>} - 页面
         */
        resolve: function (name) {
            var config = this.get(name);
            var me = this;
            if (!config) {
                config = me._build(name);
            }
            if (config) {
                config.components = me._getAllComponentConfigs(config);
            }

            return config ? doneDeferred(config) : failDeferred();
        },
        /**
         * 改变页面
         * @param {string} name - 页面名称
         * @fires Application#pageNotFound
         * @fires Application#pageLoading
         * @fires Application#layoutChanged
         * @fires Application#pageLoaded
         */
        change: function (name, params) {
            var me = this;
            var app = this.app();
            me.resolve(name).done(function (config) {
                me._changeLayout(config.layout).done(function () {
                    app.pub('pageLoading', name);
                    me._load(config.components, name).then(function () {
                        me._setCurrName(name);
                        app.pub('pageLoaded', name);
                    });
                });
            }).fail(function () {
                app.pub('pageNotFound', name);
            });
        },
        active: function (name) {
            if (name) {
                return this.change(name);
            } else {
                name = this.getCurrName();
            }
            return name;
        }
    });

    return PageManager;
});
