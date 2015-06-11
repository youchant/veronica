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
            this.type = 'sandbox';
            // this.mediator = core.createMediator();
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

                    listener.apply(context, args);  // 将该回调的上下文绑定到sandbox

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
            var app = core.app;
            var eventData = Array.prototype.slice.call(arguments);

            var emitFunc = _.bind(function () {
                mediator.emit.apply(mediator, eventData);
                eventData.unshift('emitted')
                this.log(eventData);
            }, this);

            if (app.widget.isLoading) {
                app.emitQueue.push(emitFunc);
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
            var app = core.app;

            return app.widget.start(list, _.bind(function (widget) {
                var sandbox = widget.sandbox;
                sandbox._parent = this._ref;
                this._children.push({ ref: sandbox._ref, caller: tag });
            }, this), page);
        };

        // 停止并销毁该沙箱
        Sandbox.prototype.stop = function () {
            var app = core.app;
            app.widget.stop(this);
        };

        // 停用子部件
        Sandbox.prototype.stopChildren = function (callerId) {
            var children = this._children;
            var app = core.app;

            if (callerId) {
                children = _(children).filter(function (cd) {
                    return cd.caller === callerId;
                });
            }

            _.invoke(_.map(children, function (cd) {
                return app.sandboxes.get(cd.ref);
            }), 'stop');

        };

        return Sandbox;
    })();

    return Sandbox;
});
