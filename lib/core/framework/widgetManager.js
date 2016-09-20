define([
    '../base/index',
    './widget',
    './appProvider'
], function (baseLib, Widget, AppProvider) {

    'use strict';

    var WIDGET_CLASS = 'ver-widget';
    var WIDGET_REF_NAME = '__widgetRef__';

    var _ = baseLib._;
    var ensureArray = _.ensureArray;
    var uniqBy = _.uniqBy;
    var each = _.each;
    var map = _.map;
    var extend = _.extend;

    var WidgetManager = AppProvider.extend({
        options: {
            defaultHostNode: '.v-widget-root'
        },
        initialize: function (options) {
            this.supr(options);
            this._currBatchName = null;
            this._currBatchConfigList = [];
            this._lastBatchConfigList = [];
            this._isLoading = false;
        },
        isLoading: function () {
            return this._isLoading;
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
            config.options._hostNode = config.options._hostNode ||
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
                if (item.options && item.options.el) return item.options.el;  // 确保一个元素上只有一个插件
                return item.name + item.options._hostNode;  // 确保一个父元素下，只有一个同样的插件
            });
        },
        _isCurrBatch: function (batchName) {
            var app = this.app();
            return !batchName || !app.page || app.page.isCurrent(batchName);
        },
        /**
         * 启动一个或一组 widget
         * @param {WidgetStartConfig[]|WidgetStartConfig} list - widget 配置（列表）
         * @param {string} [batchName] - 当前加载的widget列表所属批次名称
         * @returns {Promise}
         * @fires Application#widget.widgetLoaded
         * @fires Application#widget.widgetsLoaded
         */
        start: function (list, batchName) {
            var promises = [];
            var me = this;
            var app = this.app();
            var dfd = $.Deferred();
            var defManager = app.widgetDef;

            me._isLoading = true;

            list = me.normalizeBatchConfig(ensureArray(list), batchName);

            me._updateCurrConfigList(list, batchName);

            each(list, function (config) {

                if (config.xtype === 'empty') {
                    me.clearDom(config.options._hostNode, config.options._exclusive);
                    return;
                }

                if (config.xtype == null || !me._allowStart(config)) {
                    return;
                }

                var defDfd = me.defManager.resolve(config.xtype, config.options);
                if (defDfd != null) {
                    promises.push(defDfd);
                }
            });

            $.when.apply($, promises).done(function () {
                var args = arguments;
                if (promises.length === 1) {
                    args = [arguments];
                }

                var widgets = map(args, function (arg) {
                    var initializer = arg[0];  // widget
                    var options = arg[1];  // options

                    // Bugfixed：修复频繁切换页面导致错误加载的bug，当部件所在的页面不是当前页面，则不执行
                    if (me._isCurrBatch(options._batchName)) {
                        var widget = Widget.create(initializer, options);
                        if (widget) {
                            me.add(widget._id, widget);
                        }

                        me.clearDom(options._hostNode, options._exclusive);
                        return widget;
                    }

                    return null;
                });

                me._isLoading = false;
                /**
                 * **消息：** 所有widget全部加载完毕
                 * @event Application#widget.widgetsLoaded
                 * @type {*}
                 */
                app.pub("widgetsLoaded");
                app.emitQueue.empty();  // 调用消息队列订阅

                dfd.resolve.apply(dfd, widgets);
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
            if (force == null) {
                force = false;
            }

            var expectList = _.filter(me._currBatchConfigList, function (config) {
                return config.options._hostNode === hostNode;
            });
            var actualList = me.findDom($(hostNode));

            each(actualList, function (item) {
                var $item = $(item);
                var stopIt = force;
                if (!force) {
                    // 将实际存在的widget与期望存在的列表进行匹配
                    var expectExists = _.some(expectList, function (conf) {
                        var hasClass = $item.hasClass(conf.name);
                        var sameTag = conf.options._tag === $item.data('verTag');
                        return hasClass && sameTag;
                    });
                    stopIt = !expectExists;
                }
                if (stopIt) {
                    me.stopByDom($item);
                    // TODO: 如果使用强制删除，这里会造成期望列表不匹配
                }
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
            var hostNode = options._hostNode;
            
            // 判别是否存在完全相同的部件
            var hasSame = !!_.find(me._lastBatchConfigList, function (oldConfig) {
                var sameName = oldConfig.name === name;
                var sameType = oldConfig.xtype === config.xtype;
                var sameHost = oldConfig.options._hostNode === hostNode;
                var sameEl = oldConfig.options.el === options.el;

                return sameName && sameType && sameHost && sameEl;
            });

            return !hasSame;
        },
        /**
         * 根据 DOM 元素获取
         * @param {object|string} el - 元素节点或选择器
         * @returns {Sandbox}
         */
        getByDom: function (el) {
            var id = $(el).data(WIDGET_REF_NAME);
            return this.get(id);
        },
        /**
         * 找到 widget 的 DOM
         * @param $context
         * @returns {*}
         */
        findDom: function ($context) {
            return $context.find('.' + WIDGET_CLASS);
        },

        /**
         * 停止 widget
         * @param id
         */
        stop: function (id) {
            var me = this;
            var app = this.app();

            var widget = _.isString(id) ? me.get(id) : id;
            if (widget == null) {
                return;
            }

            // 从父元素中该 widget
            var parent = me.get(widget._parent);
            parent.removeChild(widget._name);

            // 全局移除
            me.remove(widget._id);

            // 调用插件的自定义销毁方法
            widget.destroy();
        },
        stopAll: function () {
            _.each(this._runningPool, function (widget) {
                widget.destroy();
            })
            this._runningPool = [];
        },
        stopByDom: function (dom) {
            var me = this;
            var widget = me.getByDom(dom);
            if (widget) {
                me.stop(widget);
            }
            // 3. 传入 jQuery 对象
            me.findDom(dom).each(function (i, child) {
                me.stop($(child));
            });
        },
        /**
         * 垃圾回收
         * @private
         */
        recycle: function () {
            var me = this;
            _.each(this._runningPool, function (widget) {
                if (widget && widget.$el && widget.$el.closest(document.body).length === 0) {
                    me.stop(widget);
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

    return WidgetManager;
});
