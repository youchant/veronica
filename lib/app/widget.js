// 加载模块
define([
    '../core/widget'
], function (Widget) {

    'use strict';

    return function (app) {
        var core = app.core;
        var _ = app.core._;
        var $ = app.core.$;

        var WIDGETS_PATH = app.config.module.defaultWidgetPath; // 默认的插件路径
        var SANDBOX_REF_NAME = core.constant.SANDBOX_REF_NAME;
        var WIDGET_CLASS = core.constant.WIDGET_CLASS;
        var require = core.loader.useGlobalRequire();  // 使用 requirejs，而不是

        /**
         * @namespace
         * @memberOf Application#
         */
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
         * 获取widget路径
         */
        function getWidgetPath(name, source) {
            var widgetPath = WIDGETS_PATH;
            var globalConfig = core.getConfig();
            var widgetName = name;
            var widgetSource = source || core.constant.DEFAULT_MODULE_NAME;

            var widgetNameParts = widgetName.split(app.config.widgetNameSeparator);
            if (widgetSource === core.constant.DEFAULT_MODULE_NAME
                && app.config.autoParseWidgetName === true) {
                widgetSource = widgetNameParts[0];  // 这种情况会覆盖 default 的 source 配置
            }

            var mod = app.module.get(widgetSource); // 根据 source，找出 source 所指向的模块

            if (globalConfig.debug === false) {
                widgetPath = app.config.releaseWidgetPath;

                if (mod && mod.config.build) {
                    widgetPath = (_.template(mod.config.build, {
                        interpolate: /\{\{(.+?)\}\}/g
                    }))({
                        dir: '',
                        baseUrl: './',
                        type: 'widgets'
                    });
                }
            } else {

                // 如果该 source 源下对应的 module 配置为多层级放置 widget
                if (mod && mod.config.multilevel) {

                    widgetName = core.util.camelize(widgetNameParts[1]) + '/' + core.util.camelize(widgetNameParts[2]);
                }

                // 从部件源中读取路径（module 会默认附加自己的source路径）
                widgetPath = (globalConfig.sources && globalConfig.sources[widgetSource]) || widgetPath;
            }

            return widgetPath + '/' + widgetName;
        }



        /**
         * 声明widget为package，以便在其他widget中引用该widget
         */
        widget.package = function (widgetNames) {
            var config = { packages: [] };
            widgetNames || (widgetNames = core.getConfig().controls);
            if (_.isString(widgetNames)) {
                widgetNames = [widgetNames];
            }
            _(widgetNames).each(function (name) {
                var ref = name.split('@');
                config.packages.push({
                    name: ref[0],
                    location: getWidgetPath(ref[0], ref[1])
                });
            });
            require.config(config);
        };

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
        widget.resolvePath = function (nameParts) {
            var isArray = $.isArray(nameParts);
            if (!isArray) {
                nameParts = [nameParts];
            }

            var result = _.map(nameParts, function (np) {
                return {
                    name: np.name,
                    location: getWidgetPath(np.name, np.source)
                };
            });

            return isArray ? result : result[0];

        };

        /**
         * 加载 widget
         * @private
         */
        widget.load = function (nameTag, options, page) {
            var dfd = $.Deferred();
            var pluginNameParts = [];

            // nameTag = core.util.decamelize(nameTag);
            var widgetNameParts = app.core.util.splitNameParts(nameTag);
            widgetNameParts.source = options._source || widgetNameParts.source;
            var name = widgetNameParts.name;
            var nameParts = [widgetNameParts];

            if (app.plugin) {
                pluginNameParts = app.core.util.splitNameParts(app.plugin.getConfig(widgetNameParts.name));
                nameParts = nameParts.concat(pluginNameParts);
            }
            var packages = app.widget.resolvePath(nameParts);

            options._name = name;
            options._page = page;

            // 如果是本地部件
            if (hasLocal(name)) {
                var executor = getLocal(name);
                dfd.resolve(executor, options);
            } else {
                core.loader.require(_.map(nameParts, function (p) { return p.name }), true, { packages: packages })
                    .done(function (name, executors) {
                        var others;
                        var executor = executors;
                        if (_.isArray(executor)) {
                            executor = executors[0];
                            others = executors.slice(1);
                        }
                        dfd.resolve(executor, options, others);
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
        };

        /**
         * 启动一个或一组 widget
         * @param {array|object} list - widget 配置（列表）
         * @param {function} [callback] - 每个widget加载完毕后执行的回调
         * @param {string} [page] - 当前加载的widget列表所属的页面名称
         * @returns {Promise}
         */
        widget.start = function (list, callback, page) {
            var promises = [];
            // 传入单个对象时
            if (_.isObject(list) && !_.isArray(list)) {
                list = [list];
            }

            app.widget.isLoading = true;

            widget._cacheList(list, page);

            _.each(list, function (config) {
                var options = config.options || {};
                var host = options.host;
                var widgetName = config.name;

                if (widgetName === 'empty') {
                    widget.clear(host, options._exclusive);
                }

                if (widget._allowLoad(config)) {
                    var loadDf = app.widget.load(widgetName, options, page);
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
                    var others = arg[2];  // plugins

                    var pageName = options._page;

                    if (others) app.plugin.cache(options._name, others);

                    // 部件所在的页面不是当前页面，则不执行，修复频繁切换页面导致错误加载的bug
                    if (!(pageName && app.page && !app.page.isCurrent(pageName))) {
                        var wg = widget.create(executor, options);
                        widget.clear(options.host, options._exclusive);
                        if (wg) {
                            widget.add(wg);
                            callback && callback(wg);  // 每个widget执行完毕后，执行回调
                            core.mediator.emit("widgetLoaded." + wg._name);
                        }
                    }
                });

                app.widget.isLoading = false;
                core.mediator.emit("widgetsLoaded");  // 广播插件已全部加载完毕的事件
                app.emitQueue.empty();  // 调用消息队列订阅
            });
        };

        /**
         * 扫描某个宿主元素下的所有插件，对不在插件列表中插件进行删除
         */
        widget.clear = function (host, exclusive) {
            if (!host) return;

            var hostExpectList = _(app.widget._currWidgetList)
                .filter(function (config) {
                    return config.options.host === host;
                });
            var hostActualList = $(host).children('.' + WIDGET_CLASS);

            _.each(hostActualList, function (item) {
                var $item = $(item);
                // 将实际存在的widget与期望存在的列表进行匹配
                var expectExists = _(hostExpectList).some(function (w) {
                    var hasClass = $item.hasClass(w.name);
                    var sameTag = w.options._tag === $item.data('verTag');
                    return hasClass && sameTag;
                });
                if (!expectExists || exclusive) {
                    var oldSandboxRef = $item.data(SANDBOX_REF_NAME);
                    oldSandboxRef && app.widget.stop(app.sandboxes.get(oldSandboxRef));
                }
            });

        }

        widget._cacheList = function (list, page) {
            // 当切换页面时候，缓存老部件列表
            if (page) {
                widget._oldWidgetList = widget._currWidgetList;
                widget._currWidgetList = list;
            } else {
                widget._currWidgetList = widget._currWidgetList.concat(list);
            }
        }

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

        widget.add = function (wg) {
            widget._widgetsPool[wg.options.sandbox._ref] = wg;
        }

        widget.create = function (executor, options) {
            return Widget(executor, options, app);
        }

        widget.get = function (ref) {
            return widget._widgetsPool[ref];
        }

        /**
         * 停止 widget
         * @param {Sandbox|string|jQueryObject|DOM} tag - 传入sandbox、名称、jquery对象等
         */
        widget.stop = function (tag) {

            if (_.isString(tag)) {  // 1. 传入名称
                var name = tag;
                // var name = core.util.decamelize(tag);
                _(app.sandboxes.getByName(name)).each(function (sandbox) {
                    app.widget.stop(sandbox);
                });
            } else {
                // 2. 传入 sandbox 实例
                var sandbox;
                if (tag.type && tag.type === 'sandbox') {
                    sandbox = tag;
                    var widgetObj;
                    if (!sandbox) {
                        return;
                    }

                    // 获取 widget 对象
                    if (sandbox._widgetObj) {
                        widgetObj = sandbox._widgetObj();
                        // TODO: 这里为什么不移除？？
                        if (widgetObj && widgetObj.loadingTemplate) { return; }
                    }

                    // 从父元素中移除该沙箱
                    var parentSandbox = app.sandboxes.get(sandbox._parent);
                    if (parentSandbox) {
                        parentSandbox._children.splice(_(parentSandbox._children).indexOf2(function (cd) {
                            return cd.ref === sandbox._ref;
                        }), 1);
                    }
                    // 从全局移除该沙箱
                    app.sandboxes.remove(sandbox._ref);

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
                        app.widget._widgetsPool[sandbox._ref] = null;
                        delete app.widget._widgetsPool[sandbox._ref];
                    }

                    // 在 requirejs 中移除对该插件的引用
                    // app.widget._unload(sandbox._ref);  // BUG
                    return;
                } else {

                    // 3. 传入 jQuery 对象
                    var el = tag;
                    var sandboxRef = $(el).data(SANDBOX_REF_NAME);
                    var childWidgets = $(el).find('.' + WIDGET_CLASS);
                    if (childWidgets.length > 0) {
                        _.each(childWidgets, function (ele) {
                            app.widget.stop($(ele));
                        });
                    }
                    if (sandboxRef) {
                        sandbox = app.sandboxes.get(sandboxRef);
                        app.widget.stop(sandbox);
                    }
                }
            }

        };

        /**
         * 垃圾回收
         * @private
         */
        widget.recycle = function () {
            _(app.sandboxes._sandboxPool).each(function (sandbox) {
                if (!sandbox._widgetObj) return;
                var widgetObj = sandbox._widgetObj();
                if (widgetObj.$el && widgetObj.$el.closest(document.body).length === 0) {
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

        app.widget = widget;

    };
});
