// 加载模块
define([
    './core'
], function (core) {

    'use strict';

    var WIDGETS_PATH = 'widgets'; // 默认的插件路径
    var SANDBOX_REF_NAME = '__sandboxRef__';
    var WIDGET_CLASS = 'ver-widget';
    var WIDGET_TYPE = 'widget';
    var _ = core._;
    var $ = core.$;

    core.emitQueue = [];  // 消息发送队列，插件加载时由于异步，会导致消息监听丢失，因此使用该队列做缓存 eg. [['open', 'who'], ['send', 'msg']]
    var currWidgetList = [];  // 目前页面中的插件配置列表

    core.widgetLoading = false;

    // 清空消息队列
    core.emptyEmitQueue = function () {
        var emitQueue = core.emitQueue;
        while (emitQueue.length > 0) {
            (emitQueue.shift())();
        }
    };

    // 注册插件为package，以便在其他插件中引用该插件
    core.registerWidgets = function (widgetNames) {
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

    // 扫描该宿主元素下的所有插件，对不在插件列表中插件进行删除
    function clearOldWidgets(host) {
        var oldSandboxRef;
        var hostExpectList = _(currWidgetList).filter(function (config) {
            return config.options.host === host;
        });
        var hostActualList = $(host).find('.' + WIDGET_CLASS);
        $.each(hostActualList, function (i, item) {
            var $item = $(item);
            if (!_(hostExpectList).some(function (w) {
                return $item.hasClass(w.name);
            })) {
                oldSandboxRef = $item.data(SANDBOX_REF_NAME);
                oldSandboxRef && core.stopBySandbox(core.sandboxes.get(oldSandboxRef));
            }
        });

    }

    function initWidgetAttr(widgetObj, options, name, widgetRef) {
        var sandbox = options.sandbox;

        widgetObj._name = name;
        widgetObj._ref = widgetRef;
        widgetObj._sandbox = sandbox;
        widgetObj.options || (widgetObj.options = options);

        widgetObj.$el && widgetObj.$el
            .addClass(sandbox.name)
            .addClass(WIDGET_CLASS)
            .attr('data-ver-widget', sandbox.name)
            .data(SANDBOX_REF_NAME, sandbox._ref);  // 在该元素上保存对插件对象的引用

        sandbox._widgetObj = widgetObj;
    }

    function executeWidget(func, options, name, widgetRef) {
        var widgetObj;  // 插件主对象
        var funcResult;
        var dfd = $.Deferred();
        var sandbox = options.sandbox;

        options.host && clearOldWidgets(options.host);

        if (_.isFunction(func)) {
            funcResult = func(options);
        }
        if (_.isUndefined(funcResult)) {
            // throw new Error('Widget must return an object errorWidget:' + name);
            console.error('Widget must return an object errorWidget:' + name);
        } else {
            //  如果是延迟对象
            if (funcResult.done && funcResult.fail) {
                funcResult.done(function (callback) {
                    widgetObj = callback(options);
                    initWidgetAttr(widgetObj, options, name, widgetRef);
                    dfd.resolve(widgetObj);
                });
            } else {
                widgetObj = funcResult;
                initWidgetAttr(widgetObj, options, name, widgetRef);
                dfd.resolve(widgetObj);
            }
        }

        return dfd.promise();
    }

    // 获取插件路径
    function getWidgetPath(name, options, source) {
        options || (options = {});
        var widgetPath = WIDGETS_PATH;
        var globalConfig = core.getConfig();
        var widgetName = core.util.decamelize(name);
        var widgetSource = source || options._source || "default";

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

        return widgetPath + '/' + widgetName;
    }

    // 加载插件
    core.loadWiget = function (name, options, page) {
        var widgetPath;
        var dfd = $.Deferred();
        var sandboxRef = _.uniqueId('sandbox$');  // 获取一个唯一的sandbox标识符
        var widgetRef;
        var ref;
        var reqConfig = _.clone(options.require);
        var callback = function (main, page, sandboxRef, name, widgetRef, options) {
            if (!_.isUndefined(page) && core.app.isCurrPage && !core.app.isCurrPage(page)) {
                dfd.reject();
            } else {
                core.logger.time('widgetInit.' + name);
                var sandbox = core.sandboxes.create(sandboxRef, name, WIDGET_TYPE);
                options.sandbox = sandbox;


                if (core.getConfig().debug) {
                    executeWidget(main, options, name, widgetRef).done(function (result) {
                        core.logger.log('widgetLoaded ' + name);
                        core.logger.time('widgetInit.' + name, 'End');

                        dfd.resolve(result);
                    })
                } else {
                    try {
                        executeWidget(main, options, name, widgetRef).done(function (result) {
                            core.logger.log('widgetLoaded ' + name);
                            core.logger.time('widgetInit.' + name, 'End');

                            dfd.resolve(result);
                        }).fail(function (error) {
                            console && console.error && console.error(error);
                        });
                    } catch (e) {
                        console && console.error && console.error(e);
                    }
                }
            }
        };

        // 当是空引用时，则清理该父元素下的插件
        if (name === 'empty') {
            options.host && clearOldWidgets(options.host);
            dfd.resolve();
            return dfd.promise();
        }
        ref = name.split('@');
        name = core.util.decamelize(ref[0]);

        widgetPath = getWidgetPath(name, options, ref[1]);  // 获取插件路径
        widgetRef = widgetPath + ((widgetPath.indexOf('http') > -1 || widgetPath.indexOf('/') === 0) ? '/main.js' : '/main');

        reqConfig || (reqConfig = {});
        reqConfig.packages || (reqConfig.packages = []);
        reqConfig.packages.push({ name: name, location: widgetPath });
        require.config(reqConfig);

        core.logger.log('widgetLoading ' + name);
        core.logger.time('widgetTransfer.' + name);
        require([name], function (main) {
            core.logger.time('widgetTransfer.' + name, 'End');
            callback(main, page, sandboxRef, name, widgetRef, options);

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

        return dfd.promise();
    };

    // 加载一个或一组插件
    core.start = function (list, callback, page) {
        //if (core.widgetLoading) {  // 当插件正在加载时，不进行任何处理
        //    var dfd = $.Deferred();
        //    dfd.reject();
        //    return dfd.promise();
        //}
        var promises = [];

        // 传入单个对象时
        if (_.isObject(list) && !_.isArray(list)) {
            list = [list];
        }

        if (!_.isArray(list)) {
            throw new Error('Widgets must be defined as an array');
        }

        core.widgetLoading = true;
        currWidgetList = list;
        _(list).each(function (widgetConfig) {
            var options = widgetConfig.options || {};
            var widgetName = widgetConfig.name;
            // 检测该父元素下是否有同样的widget，如果没有，才加载
            if (widgetName !== 'empty' && (!options.host || $(options.host).find('.' + widgetName).length === 0)) {
                promises.push(core.loadWiget(widgetName, options, page));
            }
        });

        _(promises).each(function (prom) {
            prom.done(function (widgetObj) {
                widgetObj && callback && callback(widgetObj);
                core.mediator.emit("widgetLoaded." + widgetObj._name);
            });
        });

        return $.when.apply($, promises).done(function () {
            core.widgetLoading = false;
            core.mediator.emit("widgetsLoaded");  // 广播插件已全部加载完毕的事件
            core.emptyEmitQueue();
        });
    };

    // 停止一个插件
    core.stopBySandbox = function (sandbox) {
        if (!sandbox) {
            return;
        }
        var widgetObj = sandbox._widgetObj;
        // 停用所有子插件
        _.invoke(_.map(sandbox._children, function (ref) {
            return core.sandboxes.get(ref);
        }), 'stop');
        core.sandboxes.destroy(sandbox._ref);

        // 从父元素中删除该沙盒
        var parentSandbox = core.sandboxes.get(sandbox._parent);
        if (parentSandbox) {
            parentSandbox._children.splice(_(parentSandbox._children).indexOf2(function (sdRef) {
                return sdRef === sandbox._ref;
            }), 1);
        }

        if (!widgetObj) return;
        // 调用插件的自定义销毁方法
        widgetObj.destroy && widgetObj.destroy();

        // 移除dom
        widgetObj.remove ? widgetObj.remove() : widgetObj.$el.remove();
        widgetObj.options && (widgetObj.options.sandbox = null);
        widgetObj._sandbox = null;

        // 在 requirejs 中移除对该插件的引用
        // TODO: 该方法当前应该无效，应该使用如下写法
        //core._unload(sandbox._widgetObj._ref);
        core._unload(sandbox._ref);

        sandbox.clear();
    };

    core.stopByName = function (name) {
        name = core.util.decamelize(name);
        _(core.sandboxes.getByName(name)).each(function (sandbox) {
            core.stopBySandbox(sandbox);
        });
    };

    core.stop = function (el) {
        var sandboxRef, sandbox;
        sandboxRef = $(el).data(SANDBOX_REF_NAME);
        var childWidgets = $(el).find('.' + WIDGET_CLASS);
        if (!sandboxRef || childWidgets.length > 0) {
            _.each(childWidgets, function (e) {
                core.stop($(e));
            });
        } else {
            // BugFixed：修复级联插件无法销毁的问题
            if (childWidgets.length > 0) {
                _.each(childWidgets, function (e) {
                    core.stop($(e));
                });
            }
            sandbox = core.sandboxes.get(sandboxRef);
            core.stopBySandbox(sandbox);
        }
    };

    // 垃圾回收
    core.recycle = function () {
        _(core.sandboxes._sandboxPool).each(function (sandbox) {
            var widgetObj = sandbox._widgetObj;
            if (!widgetObj) return;
            if (widgetObj.$el && widgetObj.$el.closest(document.body).length === 0) {
                // TODO 可能会在移除DOM时报错, 此种方法可能存在性能问题
                // TODO 对页面上的“隐形”插件进行遍历删除
                core.stopBySandbox(sandbox);
            }


        });
    };

    // 卸载一个模块
    core._unload = function (ref) {
        var key;
        var contextMap = require.s.contexts._.defined;

        for (key in contextMap) {
            if (contextMap.hasOwnProperty(key) && key.indexOf(ref) !== -1) {
                // 在requirejs中移除对该插件的引用
                require.undef(key);
            }
        }
    };


    core.waitWidgets = function (dependency, sandbox, callback) {
        var promises = [];
        _(dependency).each(function (name) {
            var widgetSandbox = core.sandboxes.getByName(name);
            if (!(widgetSandbox && widgetSandbox._widgetObj)) {
                var dfd = $.Deferred();
                sandbox.once('widgetLoaded.' + widgetSandbox.name, function () {
                    dfd.resolve();
                })
                promises.push(dfd.promise());
            } else {

            }
        });
        var mainDfd = $.Deferred();

        $.when(promises).done(function () {
            mainDfd.resolve(callback);
        });

        return mainDfd.promise();
    };

    return core;
});