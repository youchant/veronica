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

    var ComponentManager = AppProvider.extend(/** @lends ComponentManager.prototype */{
        options: {
            defaultHostNode: '.v-widget-root'
        },
        /**
         * 组件管理器
         * @constructs ComponentManager
         * @param options
         */
        initialize: function (options) {
            this.supr(options);
            this._currBatchName = null;
            this._currBatchConfigList = [];
            this._lastBatchConfigList = [];
        },
        /**
         * 注册组件
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
         */
        normalizeConfig: function (config) {
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
                arr[3] || me.options.defaultHostNode;

            config.options._name = config.name;

            return config;
        },
        /**
         * 规范化一批配置
         * @param {string|Object} config - 配置
         * @param {string} batchName - 所属批次名称
         * @returns {Object}
         */
        normalizeBatchConfig: function (configs, batchName) {
            var me = this;
            configs = _.map(configs, function (config) {
                var nConfig = me.normalizeConfig(config, batchName);
                nConfig.options._batchName = batchName;
                return nConfig;
            });

            // 去重
            return uniqBy(configs, function (item) {
                return item.options.el;  // 确保一个元素上只有一个插件
            });
        },
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
         * @fires Application#widget.widgetLoaded
         * @fires Component#componentsLoaded
         */
        start: function (list, batchName) {
            var promises = [];
            var me = this;
            var app = this.app();
            var dfd = $.Deferred();
            var defManager = app.part('componentDef');

            app.busy(true);

            list = me.normalizeBatchConfig(ensureArray(list), batchName);

            me._updateCurrConfigList(list, batchName);

            each(list, function (config) {

                if (config.xtype === 'empty') {
                    me.clearDom(config.options.el, config.options._exclusive);
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
                    var initializer = arg[0];  // widget
                    var options = arg[1];  // options

                    // Bugfixed：修复频繁切换页面导致错误加载的bug，当部件所在的页面不是当前页面，则不执行
                    if (me.isCurrBatch(options._batchName)) {
                        me.clearDom(options.el, options._exclusive);

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

                /**
                 * **消息：** 当前批次 Components 全部加载完毕
                 * @event Component.componentsLoaded
                 * @type {*}
                 */
                app.pub("componentsLoaded");

                dfd.resolve.apply(dfd, components);
            });

            return dfd.promise();
        },
        /**
         * 清理某个宿主元素下的插件，对不在插件列表中插件进行删除
         * @param {string|DOM|jQueryObject} 宿主对象
         * @returns {void}
         */
        clearDom: function (hostNode, force) {
            var me = this;
            if (!hostNode) return;
            // if (force == null) {
            //     force = false;
            // }
            //
            // var expectList = _.filter(me._currBatchConfigList, function (config) {
            //     return config.options._hostNode === hostNode;
            // });
            var actualList = me.findDom($(hostNode));

            each(actualList, function (item) {
                var $item = $(item);
                me.stopByDom($item);
            });

        },
        /**
         * 更新当前的配置列表
         * @param {Array} list - 配置列表
         * @param {string} batchName - 批次名称
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
         * 找到 widget 的 DOM
         * @param $context
         * @returns {*}
         */
        findDom: function (parent) {
            return $(parent).find('.' + COMPONENT_CLASS);
        },

        /**
         * 停止 widget
         * @param id
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
        stopAll: function () {
            _.each(this._runningPool, function (compo) {
                compo.destroy();
            });
            this._runningPool = [];
        },
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
