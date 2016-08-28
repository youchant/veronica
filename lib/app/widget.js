// 加载模块
define([
    '../core/widget'
], function (Widget) {

    'use strict';

    return function (app) {
        var core = app.core;
        var _ = app.core._;
        var $ = app.core.$;
        var mapArrayOrSingle = core.util.mapArrayOrSingle;
        var normalizePath = core.util.normalizePath;
        var ensureArray = core.util.ensureArray;
        var appConfig = app.config;

        var WIDGET_CLASS = core.constant.WIDGET_CLASS;
        var require = core.loader.useGlobalRequire();  // 使用 requirejs，而不是

        /**
         * @classdesc 部件操作类
         * @class veronica.WidgetHandler
         */

        /** @lends veronica.WidgetHandler# */
        var widget = {
            /**
             * 本地 widget 初始化器
             * @private
             */
            _localWidgetExes: {},
            /**
             * 所有部件引用
             * @private
             */
            _widgetsPool: {},
            /**
             * 当前活动的部件配置列表
             * @private
             */
            _currWidgetList: [],
            /**
             * 上一页部件配置列表
             * @private
             */
            _oldWidgetList: [],
            /**
             * 当前批部件是否正在加载
             */
            isLoading: false
        };

        function hasLocal(name) {
            return !!app.widget._localWidgetExes[name];
        }

        function getLocal(name) {
            return app.widget._localWidgetExes[name];
        }


        /**
         * 注册 widget 为 本地 widget
         */
        widget.register = function (name, execution) {
            app.widget._localWidgetExes[name] = execution;
        };

        /**
         * 获取 widge package 路径
         * @private
         */
        widget._getPackagesFrom = function (configs, normalized) {
            if (normalized == null) {
                normalized = true;
            }
            return mapArrayOrSingle(configs, function (config) {
                if (normalized === false) {
                    config = widget.normalizeConfig(config);
                }
                var name = config.name;
                var src = config.options._source;
                var isRelease = core.getConfig().debug === false;
                var location = app.config.releaseWidgetPath + '/' + name;

                if (!isRelease) {
                    var mod = app.module.get(src);
                    location = mod.resolveLocation(name);
                }

                return {
                    name: name,
                    location: normalizePath(location),
                    main: 'main'
                };
            });
        };

        /**
         * 声明widget为package，以便在其他widget中引用该widget
         */
        widget.package = function (widgetNames) {
            widgetNames || (widgetNames = core.getConfig().controls);
            if (_.isString(widgetNames)) {
                widgetNames = [widgetNames];
            }
            var config = {
                packages: widget._getPackagesFrom(widgetNames, false)
            };

            require.config(config);
        };

        // 推测 source
        widget.deduceSource = function (nameTag) {
            if (app.config.autoParseSource) {
                return nameTag.split('-')[0];
            }
            return null;
        }

        /**
         * 加载单个 widget
         * @private
         */
        widget.load = function (name, options, page) {
            var dfd = $.Deferred();
            var configs = [{
                name: name,
                options: options
            }];

            var packages = app.widget._getPackagesFrom(configs);

            options._name = name;
            options._page = page;

            // 如果是本地部件
            if (hasLocal(name)) {
                var executor = getLocal(name);
                dfd.resolve(executor, options);
                return dfd.promise();
            }

            var names = _.map(configs, function (p) { return p.name });
            core.loader.require(names, true, { packages: packages })
                  .done(function (name, executors) {
                      var executor = executors;
                      if (_.isArray(executor)) {
                          executor = executors[0];  // 如果加载了多个，取第一个(plugin 遗留写法)
                      }
                      dfd.resolve(executor, options);
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

            return dfd.promise();
        };

        /**
         * widget 启动时配置
         * @typedef WidgetStartConfig
         * @property {string} name - widget 名称（配置时名称）
         * @property {object} options - 选项
         * @property {string} options._source - 源
         * @property {string|DOM|jQueryObject} options.host - 附加到该DOM元素的子集
         * @property {string|DOM|jQueryObject} options.el - 附加到该DOM元素
         * @property {string} [options._exclusive=false] - 是否独占式（为 true 时，则初始化该 widget 会导致相同 host 下的其他 widget 被卸载）
         * @example
         *   {
         *     name: 'widget1',
         *     options: {
         *       _source: 'basic',
         *       host: 'body'
         *     }
         *   }
         */

        widget.normalizeConfig = function (config) {
            var me = this;
            // 将 config name 进行分解
            if (_.isString(config)) {
                config = {
                    name: config,
                    options: {}
                };
            }

            // resolve name expression
            var pattern = /([\w|-]+)@?([\w|-]*)(?:=>)?(.*)/;
            var nameParts = pattern.exec(config.name);

            config.name = nameParts[1];
            config.options._source = config.options._source ||
                nameParts[2] || app.widget.deduceSource(config.name) || 'default';
            config.options.host = config.options.host ||
                nameParts[3] || appConfig.widget.defaultHost;

            return config;
        }

        widget.preprocessConfigs = function (list) {
            var me = this;
            list = _.map(list, function (config) {
                return me.normalizeConfig(config);
            });

            // zip widget configs
            var uniqFunc = _.uniqBy || function (list, iteratee) {
                return _.uniq(list, false, iteratee);
            };
            return uniqFunc(list, function (item) {
                if (item.options && item.options.el) return item.options.el;  // 确保一个元素上只有一个插件
                return item.name + item.options.host;  // 确保一个父元素下，只有一个同样的插件
            });
        }

        /**
         * 启动一个或一组 widget
         * @param {WidgetStartConfig[]|WidgetStartConfig} list - widget 配置（列表）
         * @param {function} [callback] - 每个widget加载完毕后执行的回调
         * @param {string} [page] - 当前加载的widget列表所属的页面名称
         * @returns {Promise}
         * @fires Application#widget.widgetLoaded
         * @fires Application#widget.widgetsLoaded
         */
        widget.start = function (list, callback, page) {
            var promises = [];
            var me = this;
            // 传入单个对象时
            list = ensureArray(list);

            app.widget.isLoading = true;

            list = me.preprocessConfigs(list);

            widget._cacheList(list, page);

            _.each(list, function (config) {
                var name = config.name;  // widget name
                var options = config.options || {};
                var host = options.host;

                if (name === 'empty') {
                    widget.clear(host, options._exclusive);
                }

                if (widget._allowLoad(config)) {
                    // 加载单个 widget
                    var loadDf = app.widget.load(name, options, page);
                    promises.push(loadDf);
                }

            });

            return $.when.apply($, promises).done(function () {
                var results = arguments;
                if (promises.length === 1) { results = [arguments]; }

                // 加载完毕后执行所有部件
                _.each(results, function (arg) {
                    var executor = arg[0];  // widget
                    var options = arg[1];  // options

                    // Bugfixed：修复频繁切换页面导致错误加载的bug，当部件所在的页面不是当前页面，则不执行
                    if (widget.isValid(options._page)) {
                        var wg = widget.create(executor, options);
                        widget.clear(options.host, options._exclusive);
                        if (wg) {
                            widget.add(wg);
                            callback && callback(wg);  // 每个widget执行完毕后，执行回调

                            /**
                             * **消息：** 单个widget加载完毕， 'widgetLoaded.' + widget名称
                             * @event Application#widget.widgetLoaded
                             * @type {*}
                             */
                            core.mediator.emit("widgetLoaded." + wg._name);
                        }
                    }
                });

                app.widget.isLoading = false;
                /**
                 * **消息：** 所有widget全部加载完毕
                 * @event Application#widget.widgetsLoaded
                 * @type {*}
                 */
                core.mediator.emit("widgetsLoaded");
                app.emitQueue.empty();  // 调用消息队列订阅
            });
        };
        // 验证页面是否匹配
        widget.isValid = function (page) {
            return !page || !app.page || app.page.isCurrent(page);
        },
        /**
         * 扫描某个宿主元素下的所有插件，对不在插件列表中插件进行删除
         * @param {string|DOM|jQueryObject} 宿主对象
         * @returns {void}
         */
        widget.clear = function (host, force) {
            var me = this;
            if (!host) return;
            if (force == null) { force = false; }

            var hostExpectList = _.filter(app.widget._currWidgetList, function (config) {
                return config.options.host === host;
            });
            var hostActualList = me.findDom($(host));

            _.each(hostActualList, function (item) {
                var $item = $(item);
                var stopIt = force;
                if (!force) {
                    // 将实际存在的widget与期望存在的列表进行匹配
                    var expectExists = _.some(hostExpectList, function (w) {
                        var hasClass = $item.hasClass(w.name);
                        var sameTag = w.options._tag === $item.data('verTag');
                        return hasClass && sameTag;
                    });
                    stopIt = !expectExists;
                }
                if (stopIt) {
                    app.widget.stop(app.sandboxes.getByEl($item));
                    // TODO: 如果使用强制删除，这里会造成期望列表不匹配
                }
            });

        }

        // 缓存列表（参数列表，页面名称）
        widget._cacheList = function (list, page) {
            // 当切换页面时候，缓存老部件列表
            if (page) {
                widget._oldWidgetList = widget._currWidgetList;
                widget._currWidgetList = list;
            } else {
                widget._currWidgetList = widget._currWidgetList.concat(list);
            }
        }

        // 是否允许该配置的 widget 加载
        widget._allowLoad = function (config) {
            var options = config.options || {};
            var host = options.host;
            var widgetName = config.name;
            var noSameNameWidget = $(host).find('.' + widgetName).length === 0;  // 该宿主下没有同样名称的 widget

            // 判别是否是完全相同的部件
            var allSame = _.find(app.widget._oldWidgetList, function (oldConfig) {
                var sameName = oldConfig.name === config.name;
                var sameTag = oldConfig.options._tag === config.options._tag;
                var sameHost = oldConfig.options.host === config.options.host;
                var sameEl = oldConfig.options.el === config.options.el;

                return sameName && sameTag && sameHost && sameEl;
            });

            return widgetName !== 'empty' &&
                        (noSameNameWidget || !allSame);
        }

        // 添加
        widget.add = function (wg) {
            widget._widgetsPool[wg.options.sandbox._id] = wg;
        }

        // 创建
        widget.create = function (executor, options) {
            return Widget(executor, options, app);
        }

        // 获取
        widget.get = function (id) {
            return widget._widgetsPool[id];
        }

        // 移除
        widget.remove = function (id) {
            app.widget._widgetsPool[id] = null;
            delete app.widget._widgetsPool[id];
        }

        widget.findDom = function ($context) {
            return $context.find('.' + WIDGET_CLASS);
        }

        /**
         * 停止 widget
         * @param {Sandbox|string|jQueryObject|DOM} tag - 传入sandbox、名称、jquery对象等
         */
        widget.stop = function (tag) {
            var me = this;

            if (tag == null) return;

            if (_.isString(tag)) {  // 1. 传入名称
                var name = tag;
                // var name = core.util.decamelize(tag);
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

        };

        /**
         * 垃圾回收
         * @private
         */
        widget.recycle = function () {
            _.each(app.sandboxes._sandboxPool, function (sandbox) {
                if (!sandbox.getOwner) return;
                var widgetObj = sandbox.getOwner();
                if (widgetObj && widgetObj.$el && widgetObj.$el.closest(document.body).length === 0) {
                    // TODO 此种方法可能存在性能问题
                    app.widget.stop(sandbox);
                }
            });
        };

        /**
         * 卸载一个模块
         * @private
         */
        widget._unload = function (ref) {
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

        };

        /**
         * @name widget
         * @type {veronica.WidgetHandler}
         * @memberOf veronica.Application#
         */
        app.widget = widget;

    };
});
