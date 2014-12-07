// 加载模块
define(function () {

    'use strict';

    return function (app) {
        var _ = app.core._;
        var $ = app.core.$;
        var core = app.core;
        var WIDGETS_PATH = '../widgets'; // 默认的插件路径
        var SANDBOX_REF_NAME = '__sandboxRef__';
        var WIDGET_CLASS = 'ver-widget';
        var WIDGET_TAG = 'ver-tag';
        var WIDGET_TYPE = 'widget';

        app.widget = {
            _localWidgetExes: {},
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

        // 注册插件为package，以便在其他插件中引用该插件
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
                    location: getWidgetPath(ref[0], {}, ref[1])
                });
            });
            require.config(config);
        };

        app.widget.register = function (name, execution) {
            app.widget._localWidgetExes[name] = execution;
        };

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

        // 获取插件路径
        function getWidgetPath(name, options, source) {
            options || (options = {});
            var widgetPath = WIDGETS_PATH;
            var globalConfig = core.getConfig();
            var widgetName = core.util.decamelize(name);
            var widgetSource = source || options._source || "default";

            if (globalConfig.debug === false) {
                widgetPath = './widgets';
            } else {

                // 如果在全局配置中配置了插件路径，则采用该路径
                if (globalConfig.paths && globalConfig.paths.hasOwnProperty('widgets')) {
                    widgetPath = globalConfig.paths.widgets;
                }
                if (!name) {
                    return widgetPath;
                }

                // 如果配置了插件源，则使用它
                widgetPath = (globalConfig.sources && globalConfig.sources[widgetSource]) || widgetPath;

                // 如果定义了插件路径映射表，采用映射表里的
                if (globalConfig.config.widgetMapping && globalConfig.config.widgetMapping[name]) {
                    widgetPath = globalConfig.config.widgetMapping[name];
                }

                // 如果为该单个插件显式指定了路径，采用这个
                if (options.path) {
                    widgetPath = options.path;
                }
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
        function executeWidget(mainFunc, options) {
            var pageName = options._page;
            var name = options._name;
            var funcResult;  // 部件函数执行结果
            var widgetObj;

            // 部件所在的页面不是当前页面，则不执行
            if (pageName && app.isCurrPage && !app.isCurrPage(pageName)) {
                return;
            } else {
                core.logger.time('widgetInit.' + name);
                // 创建 sandbox
                var sandbox = app.sandboxes.create(options._sandboxRef, name, WIDGET_TYPE);

                // 初始化 options
                options.sandbox = sandbox;
                options._exclusive = options._exclusive || false;

                options.host && clearOldWidgets(options.host, options._exclusive);

                if (_.isFunction(mainFunc)) {
                    funcResult = mainFunc(options);
                }
                if (_.isUndefined(funcResult)) {
                    console.warn('Widget should return an object. [errorWidget:' + name);
                } else {
                    widgetObj = _.isFunction(funcResult) ? funcResult(options) : funcResult;
                    widgetObj = app.widget.create(widgetObj, options);

                }

                core.logger.info('widgetLoaded ' + name);
                core.logger.time('widgetInit.' + name, 'End');

                return widgetObj;
            }
        };

        // 加载插件
        app.widget.load = function (name, options, page) {
            var dfd = $.Deferred();
            var sandboxRef = _.uniqueId('sandbox$');  // 获取一个唯一的sandbox标识符
            var reqConfig = _.clone(options.require) || { packages: [] };
            var ref = name.split('@');

            reqConfig.packages || (reqConfig.packages = []);
            name = core.util.decamelize(ref[0]);

            options._name = name;
            options._page = page;
            options._sandboxRef = sandboxRef;

            // 如果是本地部件
            if (hasLocal(name)) {
                var callback = getLocal(name);
                executeWidget(callback, options, dfd);
            } else {
                var widgetPath = getWidgetPath(name, options, ref[1]);  // 获取插件路径
                var widgetRef = widgetPath + ((widgetPath.indexOf('http') > -1 || widgetPath.indexOf('/') === 0) ? '/main.js' : '/main');

                reqConfig.packages.push({ name: name, location: widgetPath });

                require.config(reqConfig);

                core.logger.info('widgetLoading ' + name);
                core.logger.time('widgetTransfer.' + name);

                // 请求部件
                require([name], function (main) {
                    core.logger.time('widgetTransfer.' + name, 'End');

                    options._widgetRef = widgetRef;

                    // 加载该部件的插件
                    var pluginPaths = app.plugin.resolvePath(name);
                    if (pluginPaths.length > 0) {
                        require.config({
                            packages: pluginPaths
                        });

                        require(_.map(pluginPaths, function (value) { return value.name }), function () {
                            var plugins = Array.prototype.slice.call(arguments, 0);
                            // 保存插件
                            app.plugin.cache(name, plugins);

                            dfd.resolve(main, options);
                            // executeWidget(main, options, dfd);
                        });
                    } else {
                        dfd.resolve(main, options);
                        // 没有插件直接执行
                        // executeWidget(main, options, dfd);
                    }
                }, function (err) {
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

            if (!_.isArray(list)) {
                throw new Error('Widgets must be defined as an array');
            }

            app.widget.isLoading = true;

            // 当切换页面时候，缓存老部件列表
            if (page) {
                app.widget.oldWidgetList = app.widget.currWidgetList;
                app.widget.currWidgetList = list;
            } else {
                app.widget.currWidgetList = app.widget.currWidgetList.concat(list);
            }


            _(list).each(function (widgetConfig) {
                var options = widgetConfig.options || {};
                var host = options.host;
                var widgetName = widgetConfig.name;
                var noWidget = $(host).find('.' + widgetName).length === 0;

                // 判别是否有完全相同的部件
                var same = _.find(app.widget.oldWidgetList, function (oldConfig) {
                    var sameName = oldConfig.name === widgetConfig.name;
                    var sameTag = oldConfig.options._tag === widgetConfig.options._tag;
                    var sameHost = oldConfig.options.host === widgetConfig.options.host;
                    var sameEl = oldConfig.options.el === widgetConfig.options.el;

                    return sameName && sameTag && sameHost && sameEl;
                });

                if (widgetName !== 'empty' && (noWidget || (!noWidget && !same))) {
                    promises.push(app.widget.load(widgetName, options, page));
                }

                if (widgetName === 'empty') {
                    host && clearOldWidgets(host);
                }
            });

            //_(promises).each(function (prom) {
            //    prom.done(function (widgetObj) {
            //        widgetObj && callback && callback(widgetObj);
            //        core.mediator.emit("widgetLoaded." + widgetObj._name);
            //    });
            //});

            return $.when.apply($, promises).done(function () {
                var results = arguments;
                if (promises.length === 1) {
                    results = [arguments];
                }
                // 加载完毕后执行所有部件
                _.each(results, function (arg) {
                    var widgetResult = arg[0];
                    var options = arg[1];
                    var widgetObj = executeWidget(widgetResult, options);
                    if (widgetObj) {
                        callback && callback(widgetObj);
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
                var name = core.util.decamelize(tag);
                _(app.sandboxes.getByName(name)).each(function (sandbox) {
                    app.widget.stop(sandbox);
                });
                return;
            }
        };

        // 停止插件，根据宿主元素
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
