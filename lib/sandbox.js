define([
    './core'
], function (core) {

    'use strict';

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
            return function (name, listener, context, tag) {
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
                this._events.push({
                    name: name,  // 消息名
                    listener: listener,  // 原始方法
                    callback: callback,
                    tag: tag  // 标识符
                });

                mediator[listenerType](name, callback);
            };
        };

        // 为每个沙箱记录日志
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

        // 停止该沙箱中的消息监听
        Sandbox.prototype.stopListening = function (tag) {
            var mediator = core.mediator;
            var events = this._events;

            if (!this._events) {
                return;
            }
            if (tag) {
                events = _(events).filter(function (evt) {
                    return evt.tag === tag;
                })
            }
            _(events).each(function (evt) {
                mediator.off(evt.name, evt.callback);
            });
        };

        // 通过沙箱开启插件，所开启的插件成为该插件的子插件
        Sandbox.prototype.startWidgets = function (list, page, tag) {
            return core.start(list, _.bind(function (widget) {
                var sandbox = widget.sandbox;
                sandbox._parent = this._ref;
                this._children.push({ ref: sandbox._ref, caller: tag });
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

        // 停用所有子插件
        Sandbox.prototype.stopChildren = function (callerId) {
            var children = this._children;
            if (callerId) {
                children = _(children).filter(function (cd) {
                    return cd.caller === callerId;
                });
            }

            _.invoke(_.map(children, function (cd) {
                return core.sandboxes.get(cd.ref);
            }), 'stop');

        };

        return Sandbox;
    })();

    core.sandboxes = {};
    core.sandboxes._sandboxPool = {};

    // 创建沙箱
    core.sandboxes.create = function (ref, widgetName, hostType) {

        var sandbox = new Sandbox;
        var sandboxPool = this._sandboxPool;  // 沙箱池

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

    // 销毁指定的沙箱
    core.sandboxes.destroy = function (ref) {
        var sandbox = this.get(ref);
        if (!sandbox) return;
        sandbox.stopListening();
        this._sandboxPool[ref] = null;
        delete this._sandboxPool[ref];
    };

    // 从沙箱集合中根据引用获取沙箱
    core.sandboxes.get = function (ref) {
        var o = this._sandboxPool[ref];
        return o;
    };

    // 根据插件名称获取沙箱
    core.sandboxes.getByName = function (name) {
        return _(this._sandboxPool).filter(function (o) {
            return o.name === name;
        });
    };
});
