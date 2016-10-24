define([
    '../base/index',
    '../component/index',
    './appProvider'
], function (baseLib, Component, AppProvider) {

    'use strict';

    var COMPONENT_CLASS = 'ver-component';
    var COMPONENT_REF_NAME = '__componentRef__';

    var _ = baseLib._;
    var ensureArray = _.ensureArray;
    var uniqBy = _.uniqBy;
    var each = _.each;
    var map = _.map;
    var extend = _.extend;

    /**
     * 组件启动时配置
     * @typedef ComponentStartConfig
     * @property {string} name - 组件实例名称
     * @property {string} xtype - 组件定义类型名
     * @property {Object} options - 组件参数
     * @property {string|DOM} options.el - 组件挂载元素
     */

    /**
     * 当前批次组件都加载完毕
     * @event Application#componentsLoaded
     */

    var ComponentManager = AppProvider.extend(/** @lends veronica.ComponentManager# */{
        /**
         * @typedef ComponentManagerOptions
         * @property {string} [defaultMountNode='.v-component-root'] - 默认的宿主元素
         */
        options: {
            defaultMountNode: '.v-component-root'
        },
        /**
         * 组件管理器
         * @constructs ComponentManager
         * @param {ComponentManagerOptions} options
         * @augments veronica.AppProvider
         * @memberOf veronica
         */
        initialize: function (options) {
            this.supr(options);
            this._currBatchName = null;
            this._currBatchConfigList = [];
            this._lastBatchConfigList = [];
        },
        /**
         * 注册组件定义
         * @param {string} name - 组件类型名
         * @param {Object} def - 组件类型定义对象
         * @returns {Object}
         */
        register: function(name, def){
            var app = this.app();
            return app.part('componentDef').add(name, def);
        },
        /**
         * 规范化创建 widget 的配置
         * @param {string|Object} config - 配置
         * @returns {Object}
         * @private
         */
        _normalizeConfig: function (config) {
            var me = this;
            if (_.isString(config)) {
                config = {
                    name: config,
                    options: {}
                };
            }

            // resolve name expression
            var pattern = /([\w|-]*)\(?([\w\-@]*)\)?(?:=>)?(.*)/;
            var arr = config.name ? pattern.exec(config.name) : [];

            config.name = arr[1];
            config.xtype = config.xtype || arr[2];
            if(config.options == null){
                config.options = {};
            }
            config.options.el = config.options.el ||
                arr[3] || me.options.defaultMountNode;

            config.options._name = config.name;

            return config;
        },
        /**
         * 规范化一批配置
         * @param {string|Object} config - 配置
         * @param {string} batchName - 所属批次名称
         * @returns {Object}
         * @private
         */
        _normalizeBatchConfig: function (configs, batchName) {
            var me = this;
            configs = _.map(configs, function (config) {
                var nConfig = me._normalizeConfig(config, batchName);
                nConfig.options._batchName = batchName;
                return nConfig;
            });

            // 去重
            return uniqBy(configs, function (item) {
                return item.options.el;  // 确保一个元素上只有一个插件
            });
        },
        /**
         * 是当前批
         * @param {string}  batchName - 组件批次名称
         * @returns {boolean}
         */
        isCurrBatch: function (batchName) {
            var app = this.app();
            var page = app.part('page');
            return !batchName || !page || page.isCurrent(batchName);
        },
        /**
         * 启动一个或一组组件
         * @param {Array.<ComponentStartConfig>|ComponentStartConfig} list - 组件启动时配置
         * @param {string} [batchName] - 当前加载的组件所属批次名称
         * @returns {Promise}
         * @fires Application#componentsLoaded
         */
        start: function (list, batchName) {
            var promises = [];
            var me = this;
            var app = this.app();
            var dfd = $.Deferred();
            var defManager = app.part('componentDef');

            app.busy(true);

            list = me._normalizeBatchConfig(ensureArray(list), batchName);

            me._updateCurrConfigList(list, batchName);

            each(list, function (config) {

                if (config.xtype === 'empty') {
                    me.stopByDom(config.options.el);
                    return;
                }

                if (config.xtype == null || !me._allowStart(config)) {
                    return;
                }

                var defDfd = defManager.resolve(config.xtype, config.options);
                if (defDfd != null) {
                    promises.push(defDfd);
                }
            });

            $.when.apply($, promises).done(function () {
                var args = arguments;
                if (promises.length === 1) {
                    args = [arguments];
                }

                var components = map(args, function (arg) {
                    var initializer = arg[0];  // component
                    var options = arg[1];  // options

                    // Bugfixed：修复频繁切换页面导致错误加载的bug，当部件所在的页面不是当前页面，则不执行
                    if (me.isCurrBatch(options._batchName)) {
                        me.stopByDom(options.el);

                        options.app = app;
                        var cmp = Component.create(initializer, options);
                        if (cmp) {
                            me.add(cmp._id, cmp);
                        }
                        return cmp;
                    }

                    return null;
                });

                app.busy(false);

                app.pub("componentsLoaded");

                dfd.resolve.apply(dfd, components);
            });

            return dfd.promise();
        },
        /**
         * 更新当前的配置列表
         * @param {Array} list - 配置列表
         * @param {string} batchName - 批次名称
         * @private
         */
        _updateCurrConfigList: function (list, batchName) {
            var me = this;

            if (batchName) {
                me._lastBatchConfigList = me._currBatchConfigList;
                me._currBatchName = batchName;
                me._currBatchConfigList = list;
            } else {
                me._currBatchConfigList = me._currBatchConfigList.concat(list);
            }
        },
        // 是否允许该配置的 widget 加载
        _allowStart: function (config) {
            var me = this;
            var name = config.name;
            var options = config.options || {};
            var hostNode = options.el;

            // 判别是否存在完全相同的部件
            var hasSame = !!_.find(me._lastBatchConfigList, function (oldConfig) {
                var sameName = oldConfig.name === name;
                var sameType = oldConfig.xtype === config.xtype;
                var sameHost = oldConfig.options.el === hostNode;

                return sameName && sameType && sameHost;
            });

            return !hasSame;
        },
        /**
         * 根据 DOM 元素获取
         * @param {object|string} el - 元素节点或选择器
         * @returns {Sandbox}
         */
        getByDom: function (el) {
            var id = $(el).data(COMPONENT_REF_NAME);
            return this.get(id);
        },
        /**
         * 找到所有组件的 DOM
         * @param {string|DOM|jQueryObject} parent - 父级
         * @returns {jQueryObject}
         */
        findDom: function (parent) {
            return $(parent).find('.' + COMPONENT_CLASS);
        },
        /**
         * 停止组件
         * @param {string} id - 组件 Id
         */
        stop: function (id) {
            var me = this;
            var app = this.app();

            var obj = _.isString(id) ? me.get(id) : id;
            if (obj == null) {
                return;
            }

            // 从父元素中该 component
            var parent = me.get(obj._parent);
            parent && parent.removeChild(obj._name);

            // 全局移除
            me.remove(obj._id);

            // 调用插件的自定义销毁方法
            obj.destroy();
        },
        /**
         * 停止所有组件
         */
        stopAll: function () {
            _.each(this._runningPool, function (compo) {
                compo.destroy();
            });
            this._runningPool = [];
        },
        /**
         * 停止某个 DOM 下的所有组件
         * @param {jQueryDOM} dom - 挂载点
         */
        stopByDom: function (dom) {
            var me = this;
            var compo = me.getByDom(dom);
            if (compo) {
                me.stop(compo);
            }

            me.findDom(dom).each(function (i, childDom) {
                me.stopByDom($(childDom));
            });
        },
        /**
         * 垃圾回收
         * @private
         */
        recycle: function () {
            var me = this;
            _.each(this._runningPool, function (running) {
                if (running && running.$el && running.$el.closest(document.body).length === 0) {
                    me.stop(running);
                }
            });
        },
        /**
         * 卸载一个模块
         * @private
         */
        _unload: function (ref) {
            var key;
            if (require.s) {  // 仅当存在 requirejs 时才进行卸载
                var contextMap = require.s.contexts._.defined;

                for (key in contextMap) {
                    if (contextMap.hasOwnProperty(key) && key.indexOf(ref) !== -1) {
                        // 在requirejs中移除对该插件的引用
                        require.undef(key);
                    }
                }
            }

        }
    });

    return ComponentManager;
});
