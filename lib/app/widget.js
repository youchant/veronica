// 加载模块
define(function () {

    'use strict';

    return function (app) {
        var _ = app.core._;
        var $ = app.core.$;
        var core = app.core;
        var WIDGETS_PATH = app.config.module.defaultWidgetPath; // 默认的插件路径
        var SANDBOX_REF_NAME = '__sandboxRef__';
        var WIDGET_CLASS = 'ver-widget';
        var WIDGET_TAG = 'ver-tag';
        var WIDGET_TYPE = 'widget';
        var require = core.loader.useGlobalRequire();  // 使用 requirejs，而不是

        app.widget = {
            _localWidgetExes: {},  // 本地 widget 初始化器
            _widgetsPool: {},  // 所有部件引用
            currWidgetList: [],  // 当前活动的部件配置列表
            oldWidgetList: [],  // 上一页部件配置列表
            isLoading: false  // 当前批部件是否正在加载
        };

        function hasLocal(name) {
            return !!app.widget._localWidgetExes[name];
        }

        function getLocal(name) {
            return app.widget._localWidgetExes[name];
        }

        // 声明widget为package，以便在其他widget中引用该widget
        app.widget.package = function (widgetNames) {
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

        // 注册 widget 为 本地 widget
        app.widget.register = function (name, execution) {
            app.widget._localWidgetExes[name] = execution;
        };

        // 创建 widget
        app.widget.create = function (widgetObj, options) {
            var sandbox = options.sandbox;

            widgetObj._name = options._name;
            widgetObj._ref = options._widgetRef;
            widgetObj.sandbox = sandbox;
            widgetObj.options || (widgetObj.options = options);

            widgetObj.$el && widgetObj.$el
                .addClass(sandbox.name)
                .addClass(WIDGET_CLASS)
                .data(WIDGET_CLASS, sandbox.name)
                .data(WIDGET_TAG, options._tag)
                .data(SANDBOX_REF_NAME, sandbox._ref);  // 在该元素上保存对插件对象的引用

            // 添加引用
            app.widget._widgetsPool[sandbox._ref] = widgetObj;

            // 获取 widget 实例对象
            sandbox._widgetObj = function () {
                return app.widget._widgetsPool[sandbox._ref];
            };

            return widgetObj;
        };

        // 获取widget路径
        function getWidgetPath(name, source) {
            var widgetPath = WIDGETS_PATH;
            var globalConfig = core.getConfig();
            var widgetName = name;
            var widgetSource = source || 'default';

            if (globalConfig.debug === false) {
                widgetPath = app.config.releaseWidgetPath;
            } else {

                var widgetNameParts = widgetName.split(app.config.widgetNameSeparator);

                // 从 widget 名称中获取 source
                if (widgetSource === 'default' && app.config.autoParseWidgetName === true) {
                    // 这种情况会覆盖 default 的 source 配置
                    widgetSource = widgetNameParts[0];
                }

                // 根据 source，找出 source 所指向的模块
                var mod = app.module.get(widgetSource);

                // 如果该 source 源下对应的 module 配置为多层级放置 widget
                if (mod && mod.config.multilevel) {

                    widgetName = core.util.camelize(widgetNameParts[1]) + '/' + core.util.camelize(widgetNameParts[2]);
                }

                // 从部件源中读取路径（module 会默认附加自己的source路径）
                widgetPath = (globalConfig.sources && globalConfig.sources[widgetSource]) || widgetPath;
            }

            return widgetPath + '/' + widgetName;
        }

        // 扫描该宿主元素下的所有插件，对不在插件列表中插件进行删除
        function clearOldWidgets(host, exclusive) {
            var oldSandboxRef;
            var currWidgetList = app.widget.currWidgetList;
            var hostExpectList = _(currWidgetList).filter(function (config) {
                return config.options.host === host;
            });
            var hostActualList = $(host).children('.' + WIDGET_CLASS);
            $.each(hostActualList, function (i, item) {
                var $item = $(item);
                var expectExists = _(hostExpectList).some(function (w) {
                    var hasClass = $item.hasClass(w.name);
                    var sameTag = w.options._tag === $item.data('verTag');
                    return hasClass && sameTag;
                });
                if (exclusive || !expectExists) {
                    oldSandboxRef = $item.data(SANDBOX_REF_NAME);
                    oldSandboxRef && app.widget.stop(app.sandboxes.get(oldSandboxRef));
                }
            });

        }

        // 执行部件
        function executeWidget(executor, options) {
            var pageName = options._page;
            var name = options._name;
            var funcResult;  // 部件函数执行结果
            var widgetObj;
            var sandboxRef = _.uniqueId('sandbox$');  // 获取一个唯一的sandbox标识符

            // 部件所在的页面不是当前页面，则不执行
            if (pageName && app.isCurrPage && !app.isCurrPage(pageName)) {
                return;
            } else {
                // 创建 sandbox
                var sandbox = app.sandboxes.create(sandboxRef, name, WIDGET_TYPE);

                // 初始化 options
                options._sandboxRef = sandboxRef;
                options.sandbox = sandbox;
                options._exclusive = options._exclusive || false;  // 是否是独占式widget，一个host只能容纳一个widget

                options.host && clearOldWidgets(options.host, options._exclusive);

                // 将对象转换成执行函数
                executor = app.view.createExecutor(executor);

                if (_.isFunction(executor)) { funcResult = executor(options); }
                if (_.isUndefined(funcResult)) {
                    console.warn('Widget should return an object. [errorWidget:' + name);
                } else {
                    widgetObj = _.isFunction(funcResult) ? funcResult(options) : funcResult;
                    widgetObj = app.widget.create(widgetObj, options);
                }

                return widgetObj;
            }
        };

        // 分隔传入的 widget name
        app.widget.splitName = function (nameTags) {
            var isArray = $.isArray(nameTags);
            if (!isArray) { nameTags = [nameTags]; }
            var result = _.map(nameTags, function (nameTag) {
                var nameParts = nameTag.split('@');
                return {
                    name: nameParts[0],
                    source: nameParts[1]
                };
            });

            return isArray ? result : result[0];
        }

        // 获取 widge package 路径
        app.widget.resolvePath = function (nameParts) {
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

        // 加载 widget
        app.widget.load = function (nameTag, options, page) {
            var dfd = $.Deferred();
            var pluginNameParts = [];

            // nameTag = core.util.decamelize(nameTag);
            var widgetNameParts = app.widget.splitName(nameTag);
            var name = widgetNameParts.name;
            var nameParts = [widgetNameParts];

            if (app.plugin) {
                pluginNameParts = app.widget.splitName(app.plugin.getConfig(widgetNameParts.name));
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

        // 加载一个或一组插件
        app.widget.start = function (list, callback, page) {
            var promises = [];
            // 传入单个对象时
            if (_.isObject(list) && !_.isArray(list)) {
                list = [list];
            }

            app.widget.isLoading = true;

            // 当切换页面时候，缓存老部件列表
            if (page) {
                app.widget.oldWidgetList = app.widget.currWidgetList;
                app.widget.currWidgetList = list;
            } else {
                app.widget.currWidgetList = app.widget.currWidgetList.concat(list);
            }


            _(list).each(function (config) {
                var options = config.options || {};
                var host = options.host;
                var widgetName = config.name;
                var noWidget = $(host).find('.' + widgetName).length === 0;  // 该宿主下没有同样名称的 widget

                // 判别是否是完全相同的部件
                var same = _.find(app.widget.oldWidgetList, function (oldConfig) {
                    var sameName = oldConfig.name === config.name;
                    var sameTag = oldConfig.options._tag === config.options._tag;
                    var sameHost = oldConfig.options.host === config.options.host;
                    var sameEl = oldConfig.options.el === config.options.el;

                    return sameName && sameTag && sameHost && sameEl;
                });

                if (widgetName !== 'empty' && (noWidget || (!noWidget && !same))) {
                    promises.push(app.widget.load(widgetName, options, page));
                }

                if (widgetName === 'empty') {
                    host && clearOldWidgets(host);
                }
            });

            return $.when.apply($, promises).done(function () {
                var results = arguments;
                if (promises.length === 1) {
                    results = [arguments];
                }
                // 加载完毕后执行所有部件
                _.each(results, function (arg) {
                    var executor = arg[0];
                    var options = arg[1];
                    var others = arg[2];

                    if (others) app.plugin.cache(options._name, others);
                    var widgetObj = executeWidget(executor, options);
                    if (widgetObj) {
                        callback && callback(widgetObj);  // 每个widget执行完毕后，执行回调
                        core.mediator.emit("widgetLoaded." + widgetObj._name);
                    }
                });

                app.widget.isLoading = false;
                core.mediator.emit("widgetsLoaded");  // 广播插件已全部加载完毕的事件
                app.emitQueue.empty();
            });
        };

        // 停止插件，根据名称
        app.widget.stopByName = function (name) {
            // 传入的是 widget name
            if (_.isString(tag)) {
                // var name = core.util.decamelize(tag);
                _(app.sandboxes.getByName(name)).each(function (sandbox) {
                    app.widget.stop(sandbox);
                });
                return;
            }
        };

        // 停止插件，根据标记
        app.widget.stop = function (tag) {
            // 传入的是 sandbox 实例
            if (tag.type && tag.type === 'sandbox') {
                var sandbox = tag;
                var widgetObj;
                if (!sandbox) {
                    return;
                }
                if (sandbox._widgetObj) {
                    widgetObj = sandbox._widgetObj();
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

                // 停用所有子部件
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
                    app.widget._widgetsPool[this._ref] = null;
                    delete app.widget._widgetsPool[this._ref];
                }

                // 在 requirejs 中移除对该插件的引用
                app.widget._unload(sandbox._ref);
                return;
            } else {
                // 传入的是 jQuery 对象
                var sandboxRef, sandbox;
                var el = tag;
                sandboxRef = $(el).data(SANDBOX_REF_NAME);
                var childWidgets = $(el).find('.' + WIDGET_CLASS);
                if (childWidgets.length > 0) {
                    _.each(childWidgets, function (e) {
                        app.widget.stop($(e));
                    });
                }
                if (sandboxRef) {
                    sandbox = app.sandboxes.get(sandboxRef);
                    app.widget.stop(sandbox);
                }
            }
        };

        // 垃圾回收
        app.widget.recycle = function () {
            _(app.sandboxes._sandboxPool).each(function (sandbox) {
                if (!sandbox._widgetObj) return;
                var widgetObj = sandbox._widgetObj();
                if (widgetObj.$el && widgetObj.$el.closest(document.body).length === 0) {
                    // TODO 此种方法可能存在性能问题
                    app.widget.stop(sandbox);
                }
            });
        };

        // 卸载一个模块
        app.widget._unload = function (ref) {
            var key;
            var contextMap = require.s.contexts._.defined;

            for (key in contextMap) {
                if (contextMap.hasOwnProperty(key) && key.indexOf(ref) !== -1) {
                    // 在requirejs中移除对该插件的引用
                    require.undef(key);
                }
            }
        };

    };
});
