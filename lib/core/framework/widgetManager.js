define([
    '../base/index',
    './widget',
    './appComponent'
], function (baseLib, Widget, AppComponent) {

    'use strict';

    var WIDGET_CLASS = 'ver-widget';

    var _ = baseLib._;
    var ensureArray = _.ensureArray;
    var uniqBy = _.uniqBy;
    var each = _.each;

    var WidgetManager = AppComponent.extend({
        initialize: function (options) {
            this.supr(options);
            this._declarationPool = { };
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
        _resolveLocation: function (config) {
            var app = this.app();
            var name = config.name;
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
        _getPackages: function (configs, isNormalized) {
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
                    name: name,
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
                packages: me._getPackages(widgetNames, false)
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
         * @param {string} batchName - 所属批次名称
         * @returns {Deferred|null}
         */
        load: function (config, batchName) {
            var me = this;
            var loader = this.loader();
            var dfd = $.Deferred();
            var name = config.name;

            config.options._name = name;
            config.options._page = batchName;

            // 加载 “空” widget
            if (name === 'empty') {
                me.clear(config.options._hostNode, config.options._exclusive);
                return null;
            }

            if (!me._allowLoad(config)) {
                return null;
            }

            // 如果是本地部件
            if (me.hasLocal(name)) {
                var initializer = me.getLocal(name);
                dfd.resolve(initializer, config.options);
            } else {
                var packages = me._getPackages([config]);

                loader.require([name], true, { packages: packages })
                  .done(function (name, initializers) {
                      var initializer = initializers;
                      //TODO: 这里检测下
                      if (_.isArray(initializer)) {
                          initializer = initializers[0];
                      }
                      dfd.resolve(initializer, options);
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

            return dfd.promise();
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
            var namePattern = /([\w|-]+)@?([\w|-]*)(?:=>)?(.*)/;
            var nameFragmentArray = namePattern.exec(config.name);

            config.name = nameFragmentArray[1];
            config.options._context = config.options._context ||
                nameFragmentArray[2] || me.parseContext(config.name) || me.options.defaultContext;
            config.options._hostNode = config.options._hostNode ||
                nameFragmentArray[3] || me.options.defaultHostNode;

            return config;
        },
        /**
         * 预处理一批配置
         */
        preprocessConfigs: function (configs) {
            var me = this;
            configs = _.map(configs, function (config) {
                return me.normalizeConfig(config);
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
         * @param {Function} [eachCallback] - 每个widget加载完毕后执行的回调
         * @param {string} [batchName] - 当前加载的widget列表所属批次名称
         * @returns {Promise}
         * @fires Application#widget.widgetLoaded
         * @fires Application#widget.widgetsLoaded
         */
        start: function (list, eachCallback, batchName) {
            var promises = [];
            var me = this;
            var app = this.app();

            me._isLoading = true;

            list = me.preprocessConfigs(ensureArray(list));

            me._updateCurrConfigList(list, batchName);

            each(list, function (config) {
                var loadDeferred = me.load(config, batchName);
                if (loadDeferred != null) {
                    promises.push(loadDeferred);
                }
            });

            return $.when.apply($, promises).done(function () {
                var returns = arguments;
                if (promises.length === 1) {
                    returns = [arguments];
                }

                each(returns, function (arg) {
                    var initializer = arg[0];  // widget
                    var options = arg[1];  // options

                    me.create(initializer, options, eachCallback);
                });

                me._isLoading = false;
                /**
                 * **消息：** 所有widget全部加载完毕
                 * @event Application#widget.widgetsLoaded
                 * @type {*}
                 */
                app.pub("widgetsLoaded");
                app.emitQueue.empty();  // 调用消息队列订阅
            });
        },
        /**
         * 扫描某个宿主元素下的所有插件，对不在插件列表中插件进行删除
         * @param {string|DOM|jQueryObject} 宿主对象
         * @returns {void}
         */
        clear: function (hostNode, force) {
            var me = this;
            if (!hostNode) return;
            if (force == null) { force = false; }

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
                    app.widget.stop(app.sandboxes.getByEl($item));
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
        _allowLoad: function (config) {
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
            var id = widget.options.sandbox._id;
            this._runningPool[id] = widget;
        },
        // 创建
        create: function (initializer, options, callback) {
            var app = this.app();
            var me = this;
            // Bugfixed：修复频繁切换页面导致错误加载的bug，当部件所在的页面不是当前页面，则不执行
            if (me._isCurrBatch(options._page)) {
                var widget = Widget(initializer, options, app);
                me.clear(options._hostNode, options._exclusive);
                if (widget) {
                    me.add(widget);
                    callback && callback(widget);  // 每个widget执行完毕后，执行回调

                    /**
                     * **消息：** 单个widget加载完毕， 'widgetLoaded.' + widget名称
                     * @event Application#widget.widgetLoaded
                     * @type {*}
                     */
                    app.pub("widgetLoaded." + widget._name);
                }
                return widget;
            }
            return null;
        },
        // 获取
        get: function (id) {
            return this._runningPool[id];
        },

        // 移除
        remove: function (id) {
            this._runningPool[id] = null;
            delete this._runningPool[id];
        },

        findDom: function ($context) {
            return $context.find('.' + WIDGET_CLASS);
        },

        /**
         * 停止 widget
         * @param {Sandbox|string|jQueryObject|DOM} tag - 传入sandbox、名称、jquery对象等
         */
        stop: function (tag) {
            var me = this;

            if (tag == null) return;

            if (_.isString(tag)) {  // 1. 传入名称
                var name = tag;

                _.each(app.sandboxes.getByName(name), function (sandbox) {
                    app.widget.stop(sandbox);
                });
            } else {
                // 2. 传入 sandbox 实例
                if (tag.type && tag.type === 'sandbox') {
                    var sandbox = tag;
                    var widgetObj;
                    // 获取 widget 对象
                    if (sandbox.getOwner) {
                        widgetObj = sandbox.getOwner();
                        // TODO: 这里为什么不移除？？
                        if (widgetObj && widgetObj.state.templateIsLoading) { return; }
                    }

                    // 从父元素中移除该沙箱
                    var parentSandbox = app.sandboxes.get(sandbox._parent);
                    if (parentSandbox) {
                        parentSandbox._children.splice(_.findIndex(parentSandbox._children, function (cd) {
                            return cd.ref === sandbox._id;
                        }), 1);
                    }
                    // 从全局移除该沙箱
                    app.sandboxes.remove(sandbox._id);

                    // 停用所有子 widget
                    sandbox.stopChildren();
                    // 取消所有消息订阅
                    sandbox.stopListening();

                    // 清除部件对象
                    if (widgetObj) {
                        // 调用插件的自定义销毁方法
                        widgetObj.destroy && widgetObj.destroy();

                        // 移除dom
                        widgetObj.remove ? widgetObj.remove() : widgetObj.$el.remove();
                        widgetObj.options && (widgetObj.options.sandbox = null);
                        widgetObj.sandbox = null;

                        // 全局移除部件对象
                        app.widget.remove(sandbox._id);
                    }

                    // 在 requirejs 中移除对该插件的引用
                    // app.widget._unload(sandbox._id);  // BUG
                    return;
                } else {

                    // 3. 传入 jQuery 对象
                    me.findDom(tag).each(function (i, child) {
                        me.stop($(child));
                    });

                    // 根据 sandbox 删除
                    var sd = app.sandboxes.getByEl(tag);
                    me.stop(sd);
                }
            }

        },

        /**
         * 垃圾回收
         * @private
         */
        recycle: function () {
            _.each(app.sandboxes._sandboxPool, function (sandbox) {
                if (!sandbox.getOwner) return;
                var widgetObj = sandbox.getOwner();
                if (widgetObj && widgetObj.$el && widgetObj.$el.closest(document.body).length === 0) {
                    // TODO 此种方法可能存在性能问题
                    app.widget.stop(sandbox);
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
