
define('veronica/logger',[], function () {
    

    if (!window.console) {
        window.console = {};
    }

    // thx aurajs
    // borrow from aura: https://github.com/aurajs/aura

    var noop = function () { },
        DEFAULT_NAME = 'veronica',
        console = window.console || {};

    var isIE8 = function _isIE8() {
        return (!Function.prototype.bind || (Function.prototype.bind && typeof window.addEventListener === 'undefined')) &&
            typeof console === 'object' &&
            typeof console.log === 'object';
    };

    function Logger(name) {
        this.name = name || DEFAULT_NAME;
        this._log = noop;
        this._warn = noop;
        this._error = noop;
        this.time = noop;
        return this;
    }

    Logger.prototype.setName = function (name) {
        name || (name = DEFAULT_NAME);
        this.name = name;
        return this;
    };

    Logger.prototype.enable = function () {
        this._log = (console.log || noop);
        this._warn = (console.warn || this._log);
        this._error = (console.error || this._log);
        this.time = this._time;

        if (Function.prototype.bind && typeof console === "object") {
            var logFns = ["log", "warn", "error"];
            for (var i = 0; i < logFns.length; i++) {
                console[logFns[i]] = Function.prototype.call.bind(console[logFns[i]], console);
            }
        }

        return this;
    };

    Logger.prototype.write = function (output, args) {
        var parameters = Array.prototype.slice.call(args);
        parameters.unshift(this.name + ":");
        if (isIE8()) {
            output(parameters.join(' '));
        } else {
            output.apply(console, parameters);
        }
    };

    Logger.prototype.log = function () {
        this.write(this._log, arguments);
    };

    Logger.prototype.warn = function () {
        this.write(this._warn, arguments);
    };

    Logger.prototype.error = function () {
        this.write(this._error, arguments);
    };

    Logger.prototype._time = function (name, tag) {
        tag || (tag = '');
        console['time' + tag](name);
    };

    return Logger;
});

// core
define('veronica/util',[
], function () {

    

    // 将字符串转换成反驼峰表示
    function decamelize(camelCase, delimiter) {
        delimiter = (delimiter === undefined) ? '_' : delimiter;
        return camelCase.replace(/([A-Z])/g, delimiter + '$1').toLowerCase();
    }

    // 扩展实例属性
    function extend(obj, mixin) {
        var method, name;
        for (name in mixin) {
            method = mixin[name];
            obj[name] = method;
        }
        return obj;
    };

    // 扩展类属性
    function include(klass, mixin) {
        return extend(klass.prototype, mixin);
    };

    // 混入，传入对象或构造函数，分别混入实例属性和类属性
    function mixin(obj, mixin) {
        obj.prototype ? include(obj, mixin) : extend(obj, mixin);
    }

    return {
        decamelize: decamelize,
        extend: extend,
        include: include,
        mixin: mixin
    }

});
define('veronica/aspect',[
    'underscore',
    'jquery',
    'exports'
], function (_, $, exports) {

    


    // thx "aralejs"
    // source:  https://github.com/aralejs/base/blob/master/src/aspect.js

    exports.before = function (methodName, callback, context) {
        return weave.call(this, 'before', methodName, callback, context);
    };


    exports.after = function (methodName, callback, context) {
        return weave.call(this, 'after', methodName, callback, context);
    };


    // Helpers
    // -------

    var eventSplitter = /\s+/;

    function weave(when, methodName, callback, context) {
        var names = methodName.split(eventSplitter);
        var name, method;

        while (name = names.shift()) {
            method = getMethod(this, name);
            if (!method.__isAspected) {
                wrap.call(this, name);
            }
            this.on(when + ':' + name, callback, context);
        }

        return this;
    }


    function getMethod(host, methodName) {
        var method = host[methodName];
        if (!method) {
            throw new Error('Invalid method name: ' + methodName);
        }
        return method;
    }


    function wrap(methodName) {
        var old = this[methodName];

        this[methodName] = function () {
            var args = Array.prototype.slice.call(arguments);
            var beforeArgs = ['before:' + methodName].concat(args);

            // prevent if trigger return false
            if (this.trigger.apply(this, beforeArgs) === false) return;

            var ret = old.apply(this, arguments);
            var afterArgs = ['after:' + methodName, ret].concat(args);
            this.trigger.apply(this, afterArgs);

            return ret;
        };

        this[methodName].__isAspected = true;
    }

    _.mixin({
        aopBefore: function (originFunc, func) {
            return function () {
                var args = arguments;


                //var args = arguments;
                //var dfd = $.when(func.apply(this, arguments));
                //dfd.then(function (ret) {
                //    if (ret === false) {
                //        return false;
                //    } else {
                //        return originFunc.apply(this, args);
                //    }
                //}, function () {
                //    return false;
                //});


                if (ret === false) { return false; }
                if (ret && ret.done) {
                    return ret.done(function () {
                        originFunc.apply(this, args);
                    }).fail(function () {
                        return false;
                    });
                } else {
                    return originFunc.apply(this, args);
                }
            };
        },
        aopAfter: function (originFunc, func) {
            return function () {
                var ret = originFunc.apply(this, arguments);
                if (ret === false) { return false; }
                if (ret && ret.done) {
                    return ret.done(function () {
                        func.apply(this, arguments);
                    }).fail(function () {
                        return false;
                    });
                } else {
                    return func.apply(this, arguments);
                }
            };
        }
    });

});
define('veronica/helper',['underscore'], function (_) {
    _.mixin({
        indexOf2: function (array, test) {
            var indexOfValue = _.indexOf;
            if (!_.isFunction(test)) return indexOfValue(array, test);
            for (var x = 0; x < array.length; x++) {
                if (test(array[x])) return x;
            }
            return -1;
        },
        safeInvoke: function (context, method, params) {
            var args = Array.slice.call(arguments, 2);
            context && context[method].apply(context, args);
        }
    });
})
;
// core
define('veronica/core',[
    'jquery',
    'underscore',
    'eventemitter',
    './logger',
    './util',
    './aspect',
    './helper'
], function ($, _, EventEmitter, Logger, util, aspect) {

    

    var core = { $: $, _: _, ext: {}, helper: {} };  // jQuery 和 Underscore对象

    // 从RequireJS中获取全局配置
    var getConfig = function () {
        return requirejs.s.contexts._.config;
    };
    var emitterConfig = _.defaults(getConfig() || {}, {
        wildcard: true,
        delimiter: '.',
        newListener: true,
        maxListeners: 50
    });
    core.getConfig = getConfig;

    core.util = util;

    core.aspect = aspect;

    core.logger = new Logger();
    if (core.getConfig().debug) {
        core.logger.enable();
    }

    // 中介者
    core.mediator = new EventEmitter(emitterConfig);

    return core;
});
// 应用程序模块
define('veronica/application',[], function () {
    

    var Application = (function () {

        function Application() {
            this._extensions = [];
        }

        // 初始化应用程序
        Application.prototype.launch = function () {
            var promises = [];
            var me = this;

            this.core.logger.time("appStart");
            _(this._extensions).each(function (ext) {
                var dfd = $.Deferred();

                if (_.isString(ext)) {
                    me.core.logger.log("extensionLoading", [ext]);
                    me.core.logger.time("extensionLoad." + ext);
                    require([ext], function (fn) {
                        _.isFunction(fn) && me.ext(fn);
                        me.core.logger.log("extensionLoaded", [ext]);
                        me.core.logger.time("extensionLoad." + ext, 'End');
                        dfd.resolve();
                    }, function () {
                        dfd.reject();
                    });
                } else {
                    _.isFunction(fn) && me.ext(fn);
                    dfd.resolve();
                }
                promises.push(dfd.promise());
            });
            return $.when.apply($, promises);
        };

        // 停止应用程序
        Application.prototype.stop = function () {
            this.sandbox.stop();
        };

        // 使用第三方组件
        Application.prototype.use = function (extension) {
            this._extensions.push(extension);
            return this;
        };

        // 使用用户扩展
        Application.prototype.ext = function (ext) {
            ext(this, Application);
            return this;
        };

        //
        Application.prototype.mixin = function (mixin, isExtend) {
            if (isExtend == null) {
                isExtend = true;
            }
            if (isExtend) {
                this.core.util.mixin(this, mixin);
            } else {
                this.core.util.mixin(Application, mixin);
            }
            return this;
        };

        // 扩展方法：应用程序广播事件，自动附加应用程序名
        Application.prototype.emit = function () {
            var args = Array.prototype.slice.call(arguments);
            // args[0] = args[0] + '.' + this.name;
            args.push(this.name);
            this.sandbox.emit.apply(this.sandbox, args);
        };

        return Application;
    })();

    return Application;

});


define('veronica/plugins/page',[], function () {

    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;
        var PAGEVIEW_CLASS = 'page-view';

        app.mixin({
            _pages: {},
            _layouts: {
                'scaffold': '<div class="' + PAGEVIEW_CLASS + '"></div>'
            },
            _pages: {
                currPageName: ''
            }
        });

        app.mixin({
            _changeTitle: function () { },
            _inherit: function (pageConfig) {
                var me = this;
                var parentsWidgets = _(pageConfig.inherit).map(function (parentName) {
                    return me.getPage(parentName).widgets;
                });
                parentsWidgets.unshift(pageConfig.widgets);
                return _.uniq(_.union.apply(_, parentsWidgets), false, function (item) {
                    if (item.options && item.options.el) return item.options.el;  // 确保一个元素上只有一个插件
                    return item.name + item.options.host;  // 确保一个父元素下，只有一个同样的插件
                });

            },
            isCurrPage: function (page) {
                return this._pages.currPageName === 'default' || this._pages.currPageName === page;
            },
            getPage: function (name) {
                var config = this._pages[name];
                return config;
            },
            getCurrPage: function () {
                return this.getPage('currPageName');
            },
            addPage: function (configs) {
                _(configs).each(function (config, i) {
                    configs[i] = $.extend({
                        name: '',
                        layout: 'default',
                        widgets: [],
                        inherit: []
                    }, config);
                });
                $.extend(this._pages, configs);
                return this;
            },
            addLayout: function (layout) {
                $.extend(this._layouts, layout);
                return this;
            },
            getLayout: function (name) {
                return this._layouts[name];
            },
            switchPage: function (name) {
                this.core.logger.time('pageLoad.' + name);
                var config = this.getPage(name);
                var dfd;
                var widgetsConfig;
                var me = this;

                if (!config) {
                    dfd = $.Deferred();
                    this.emit('pageNotFound', name);
                    dfd.resolve();
                    return dfd.promise();
                } else {
                    widgetsConfig = this._inherit(config);
                    this.emit('pageLoading', name);
                    this._pages.currPageName = name;
                    return this.sandbox.startWidgets(widgetsConfig, name).done(function () {
                        // 切换页面后进行垃圾回收
                        me.core.recycle();
                        me.emit('pageLoaded', name);
                        me.core.logger.time('pageLoad.' + name, 'End');
                    });
                }
            },
            startPage: function () {
                var me = this;
                this.initLayout();
                return this.switchPage('default').done(function () {
                    me.emit('appStarted');
                    me.core.logger.time("appStart", 'End');
                });
            },
            switchLayout: function (layout) {
                var me = this;
                var $pageView = $('.page-view');
                this.emit('layoutSwitching', layout);

                if ($pageView.length === 0) {
                    $pageView = $('body');
                }
                _.each($pageView.find('.ver-widget'), function (el) {
                    me.core.stop($(el));
                });

                $pageView.html(this.getLayout(layout));

            },
            initLayout: function () {
                var scaffold = this.getLayout('scaffold');
                if (scaffold) {
                    $('body').prepend(scaffold);
                }
            }
        }, false);

        // TODO: API风格更改 
        app.page = {
            active: function (name) {
                if (name) {
                    return app.switchPage(name);
                } else {
                    name = app.getPage('currPageName');
                }
                return name;
            },
            // 获取页面配置
            get: function (name) {
                return app.getPage(name);
            },
            isActive: function (name) {
                return app.isCurrPage(name);
            },
            add: function (configs) {
                return app.addPage(configs);
            },
            start: function () {
                return app.startPage();
            }
        }

        app.layout = {
            add: function (layout) {
                return app.addLayout(layout);
            },
            active: function (name) {
                return app.switchLayout(name);
            },
            get: function (name) {
                return app.getLayout(name);
            },
            init: function () {
                return app.initLayout();
            }
        }

        app.sandbox.on('pageLoading', function (name, appName) {
            if (appName === app.name) {
                // 在页面加载之前，进行布局的预加载
                var config = app.getPage(name);
                var currPageName = app.getCurrPage();
                var currConfig;
                if (currPageName === '' || (currConfig = app.getPage(currPageName)) && currConfig.layout !== config.layout) {
                    app.switchLayout(config.layout);
                    app.emit('layoutSwitched', config.layout);
                }
            }
        });


    };
});

define('veronica/sandbox',[
    './core'
], function (core) {

    

    var _ = core._;

    var Sandbox = (function () {

        function Sandbox() {
            this._ = core._;
            this.$ = core.$;
            this._children = [];
            this.events = [];
            this.ext = core.ext;
            this.helper = core.helper;
        }

        var attachListener = function (listenerType) {
            return function (name, listener, context) {
                var mediator = core.mediator;
                if (!_.isFunction(listener) || !_.isString(name)) {
                    throw new Error('Invalid arguments passed to sandbox.' + listenerType);
                }
                context = context || this;
                var callback = function () {
                    var args = Array.prototype.slice.call(arguments);
                    try {
                        listener.apply(context, args);  // 将该回调的上下文绑定到sandbox
                    } catch (e) {
                        console.error("Error caught in listener '" + name + "', called with arguments: ", args, "\nError:", e.message, e, args);
                    }
                };

                this._events = this._events || [];
                this._events.push({ name: name, listener: listener, callback: callback });

                mediator[listenerType](name, callback);
            };
        };

        // 为每个沙盒记录日志
        Sandbox.prototype.log = function (msg, type) {
            type || (type = 'log');
            core.logger.setName(this._hostType + '(' + this.name + ')');
            if (_.isArray(msg)) {
                var info = [];
                info.push(msg.shift());
                info.push(msg.shift());
                info.push(msg);
                core.logger[type].apply(core.logger, info);
            } else {
                core.logger[type](msg);
            }
            core.logger.setName();
        };

        Sandbox.prototype.getConfig = core.getConfig;

        // 监听
        Sandbox.prototype.on = attachListener('on');

        // 监听一次
        Sandbox.prototype.once = attachListener('once');

        // 移除监听
        Sandbox.prototype.off = function (name, listener) {
            var mediator = core.mediator;
            if (!this._events) {
                return;
            }
            this._events = _.reject(this._events, function (evt) {
                var ret = (evt.name === name && evt.listener === listener);
                if (ret) {
                    mediator.off(name, evt.callback);
                }
                return ret;
            });
        };

        // 广播事件
        Sandbox.prototype.emit = function () {
            var mediator = core.mediator;
            var emitQueue = core.emitQueue;
            var eventData = Array.prototype.slice.call(arguments);
            var emitFunc = _.bind(function () {
                mediator.emit.apply(mediator, eventData);
                eventData.unshift('emitted');
                this.log(eventData);
            }, this);
            if (core.widgetLoading) {
                emitQueue.push(emitFunc);
            } else {
                emitFunc();
            }
        };

        // 停止该沙盒中的所有事件监听
        Sandbox.prototype.stopListening = function () {
            var mediator = core.mediator;

            if (!this._events) {
                return;
            }
            _(this._events).each(function (evt) {
                mediator.off(evt.name, evt.callback);
            });
        };

        // 通过沙盒开启插件，所开启的插件成为该插件的子插件
        Sandbox.prototype.startWidgets = function (list, page) {
            return core.start(list, _.bind(function (widget) {
                var sandbox = widget.sandbox;
                sandbox._parent = this._ref;
                this._children.push(sandbox._ref);
            }, this), page);
        };

        // 清除各种引用，防止内存泄露
        Sandbox.prototype.clear = function () {
            this._widgetObj = null;
        };

        // 停止并销毁该沙箱
        Sandbox.prototype.stop = function () {
            core.stopBySandbox(this);
        };

        return Sandbox;

    })();

    core.sandboxes = {};
    core.sandboxes._sandboxPool = {};

    // 创建沙盒
    core.sandboxes.create = function (ref, widgetName, hostType) {

        var sandbox = new Sandbox;
        var sandboxPool = this._sandboxPool;  // 沙盒池

        // 即使是相同的插件的sandbox都是唯一的
        if (sandboxPool[ref]) {
            throw new Error("Sandbox with ref " + ref + " already exists.");
        } else {
            sandboxPool[ref] = sandbox;
        }

        sandbox.name = widgetName;
        sandbox._ref = ref;
        sandbox._hostType = hostType;
        sandbox.app = core.app;

        return sandbox;
    };

    // 销毁指定的沙盒
    core.sandboxes.destroy = function (ref) {
        var sandbox = this.get(ref);
        if (!sandbox) return;
        sandbox.stopListening();
        this._sandboxPool[ref] = null;
        delete this._sandboxPool[ref];
    };

    // 从沙盒集合中根据引用获取沙盒
    core.sandboxes.get = function (ref) {
        var o = this._sandboxPool[ref];
        return o;
    };

    // 根据插件名称获取沙盒
    core.sandboxes.getByName = function (name) {
        return _(this._sandboxPool).filter(function (o) {
            return o.name === name;
        });
    };
});

// 加载模块
define('veronica/loader',[
    './core'
], function (core) {

    

    var WIDGETS_PATH = '../widgets'; // 默认的插件路径
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
        widgetObj.sandbox = sandbox;
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

                // 当处于 debug 模式时，不捕获异常
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
            options.host || (options.host = 'body');
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
        widgetObj.sandbox = null;

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
define('veronica/main',[
    './core',
    './application',
    './plugins/page',
    './sandbox',
    './loader'
], function (core, Application, pageExt) {

    

    core.createApp = function (appName, config) {
        var app = new Application;
        var $ = core.$;
        if (core.app) { core.app.stop(); }
        core.app = app;

        app.core = core;
        app.config = $.extend({
            autoReport: true
        }, config);
        app.name = appName;

        app.sandbox = core.sandboxes.create('app-' + appName, appName, 'app');

        _.isFunction(pageExt) && pageExt(app, Application);

        return app;
    };

    return core;
});
define('veronica', ['veronica/main'], function (main) { return main; });

