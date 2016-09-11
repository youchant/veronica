define([
    '../base/index',
    './widget',
    './appComponent',
    '../../view/index'
], function (baseLib, Widget, AppComponent, widgetBase) {

    'use strict';

    var WIDGET_CLASS = 'ver-widget';
    var WIDGET_REF_NAME = '__widgetRef__';

    var _ = baseLib._;
    var ensureArray = _.ensureArray;
    var uniqBy = _.uniqBy;
    var each = _.each;
    var map = _.map;
    var extend = _.extend;

    var WidgetManager = AppComponent.extend({
        initialize: function (options) {
            this.supr(options);
            this._declarationPool = {};
            this._runningPool = {};
            this._currBatchName = null;
            this._currBatchConfigList = [];
            this._lastBatchConfigList = [];
            this._isLoading = false;
        },
        isLoading: function () {
            return this._isLoading;
        },
        hasLocal: function (name) {
            return !!this._declarationPool[name];
        },
        getLocal: function (name) {
            return this._declarationPool[name];
        },
        /**
         * 注册 widget 为 本地 widget
         */
        register: function (name, declaration) {
            this._declarationPool[name] = declaration;
        },
        _getWidgetName: function (config) {
            if (config.initializer) {
                return _.isObject(config.initializer) ? config.initializer._widgetName : config.initializer;
            }
            return config.name;
        },
        _resolveLocation: function (config) {
            var app = this.app();
            var name = this._getWidgetName(config);
            var context = config.options._context;
            var isDebug = app.env.isDebug();
            var location = app.config.releaseWidgetPath + '/' + name;  // release widget

            if (isDebug) {
                var mod = app.module.get(context);
                location = mod.resolveLocation(name);
            }

            return normalizePath(location);

        },
        /**
         * 从配置中创建 package
         * @param {Array|Object} configs
         * @private
         */
        _getLoadPackages: function (configs, isNormalized) {
            var me = this;
            if (isNormalized == null) {
                isNormalized = true;
            }
            return _.mapArrayOrSingle(configs, function (config) {
                if (isNormalized === false) {
                    config = me.normalizeConfig(config);
                }
                var location = me._resolveLocation(config);

                return {
                    name: me._getWidgetName(config),
                    location: location,
                    main: 'main'
                };
            });
        },
        /**
         * 声明widget为package，以便在其他widget中引用该widget
         */
        configurePackage: function (widgetNames) {
            var me = this;
            if (_.isString(widgetNames)) {
                widgetNames = [widgetNames];
            }
            var config = {
                packages: me._getLoadPackages(widgetNames, false)
            };

            me.app().loader().config(config);
        },
        /**
         * 从名称推测 context
         * @param {string} name - 名称
         * @returns {string} context 名称
         */
        parseContext: function (name) {
            if (this.options.autoParseContext) {
                return name.split('-')[0];
            }
            return null;
        },
        /**
         * 加载单个 widget
         * @param {Object} config - widget 配置
         * @returns {Deferred|null}
         */
        _resolveInitializer: function (config) {
            var me = this;
            var dfd = $.Deferred();
            var initializer = config.initializer || config.name;

            // 加载 “空” widget
            if (initializer === 'empty') {
                me.clear(config.options._hostNode, config.options._exclusive);
                return null;
            }

            if (initializer == null || !me._allowCreate(config)) {
                return null;
            }

            if (_.isString(initializer)) {
                // 从本地池获取
                if (me.hasLocal(initializer)) {
                    initializer = me.getLocal(initializer);
                    dfd.resolve(initializer, config.options);
                } else {
                    // 从远端获取
                    var packages = me._getPackages([config]);
                    var loader = this.loader();

                    loader.require([name], true, {packages: packages})
                        .done(function (name, initializers) {
                            var initializer = initializers;
                            //TODO: 这里检测下
                            if (_.isArray(initializer)) {
                                initializer = initializers[0];
                            }
                            dfd.resolve(initializer, config.options);
                        }).fail(function (err) {
                        if (err.requireType === 'timeout') {
                            console && console.warn && console.warn('Could not load module ' + err.requireModules);
                        } else {
                            var failedId = err.requireModules && err.requireModules[0];
                            require.undef(failedId);
                            console && console.error && console.error(err);
                        }
                        dfd.reject();
                    });
                }
            } else {
                dfd.resolve(initializer, config.options);
            }

            return dfd.promise();
        },
        /**
         * 规范化创建 widget 的配置
         * @param {string|Object} config - 配置
         * @param {string} batchName - 所属批次名称
         * @returns {Object}
         */
        normalizeConfig: function (config, batchName) {
            var me = this;
            if (_.isString(config)) {
                config = {
                    name: config,
                    options: {}
                };
            }

            // resolve name expression
            var namePattern = /([\w|-]+)@?([\w|-]*)(?:=>)?(.*)/;
            var nameFragmentArray = namePattern.exec(config.name);

            config.name = nameFragmentArray[1];
            config.options._context = config.options._context ||
                nameFragmentArray[2] || me.parseContext(config.name) || me.options.defaultContext;
            config.options._hostNode = config.options._hostNode ||
                nameFragmentArray[3] || me.options.defaultHostNode;

            config.options._name = config.name;
            config.options._widgetName = me._getWidgetName(config);
            config.options._batchName = batchName;

            return config;
        },
        /**
         * 预处理一批配置
         */
        preprocessConfigs: function (configs, batchName) {
            var me = this;
            configs = _.map(configs, function (config) {
                return me.normalizeConfig(config, batchName);
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

            me._isLoading = true;

            list = me.preprocessConfigs(ensureArray(list), batchName);

            me._updateCurrConfigList(list, batchName);

            each(list, function (config) {
                var loadDeferred = me._resolveInitializer(config);
                if (loadDeferred != null) {
                    promises.push(loadDeferred);
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
                    return me.create(initializer, options);
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
         * 扫描某个宿主元素下的所有插件，对不在插件列表中插件进行删除
         * @param {string|DOM|jQueryObject} 宿主对象
         * @returns {void}
         */
        clear: function (hostNode, force) {
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
        _allowCreate: function (config) {
            var options = config.options;
            var name = config.name;
            var hostNode = options._hostNode;

            // 该宿主下没有同样名称的 widget
            var noSameNameWidget = $(hostNode).find('.' + name).length === 0;
            if (noSameNameWidget) {
                return true;
            }

            // 判别是否存在完全相同的部件
            var hasSame = !!_.find(app.widget._lastBatchConfigList, function (oldConfig) {
                var sameName = oldConfig.name === name;
                var sameTag = oldConfig.options._tag === options._tag;
                var sameHost = oldConfig.options._hostNode === hostNode;
                var sameEl = oldConfig.options.el === options.el;

                return sameName && sameTag && sameHost && sameEl;
            });

            return !hasSame;
        },
        // 添加
        add: function (widget) {
            var id = widget._id;
            this._runningPool[id] = widget;
        },
        // 创建
        create: function (initializer, options) {
            var app = this.app();
            var me = this;
            // Bugfixed：修复频繁切换页面导致错误加载的bug，当部件所在的页面不是当前页面，则不执行
            if (me._isCurrBatch(options._batchName)) {
                // 将构造器中的 _widgetName 附加到 视图中
                var defaults = {
                    _widgetName: initializer._widgetName,
                    _context: initializer._context,
                    _exclusive: false
                };

                options = _.extend(defaults, options);

                // 调用
                initializer = this.define(initializer);
                var widget = initializer;
                while (widget != null && typeof widget === 'function') {
                    widget = widget(options);
                }

                if (widget == null) {
                    console.error('View should return an object. [errorView:' + options._name);
                    return widget;
                }

                me.clear(options._hostNode, options._exclusive);
                if (widget) {
                    me.add(widget);
                }
                return widget;
            }
            return null;
        },
        getBase: function () {
            return widgetBase(this.app());
        },
        /**
         * 创建一个自定义 View 定义
         * @param {object|function} [obj={}] - 自定义属性或方法
         * @param {boolean} [isFactory=false] - 是否该视图定义是个工厂方法（不需要 `new`）
         */
        define: function (obj, isFactory) {
            var me = this;
            var ctor;
            if (isFactory == null) {
                isFactory = true;
            }

            if (typeof obj === 'object') {  // 普通对象
                var literal = extend({}, me.getBase(), obj);
                ctor = Widget.extend(literal);
            } else {
                if (obj.extend) {  // 本身是 Backbone.View 构造函数
                    ctor = obj;
                } else {  // 工厂函数
                    return obj;
                }
            }

            // 使用工厂模式
            if (isFactory) {
                return function (options) {
                    return new ctor(options);
                }
            }

            return ctor;
        },
        // 获取
        get: function (id) {
            return this._runningPool[id];
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
        // 移除
        remove: function (id) {
            this._runningPool[id] = null;
            delete this._runningPool[id];
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
        stopAll: function(){
            _.each(this._runningPool, function(widget){
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
