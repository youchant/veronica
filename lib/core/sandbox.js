define([
    './core'
], function (core) {

    'use strict';

    var _ = core._;
    var $ = core.$;

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
                listener: listener,  // 原始回调方法
                callback: callback,  // 绑定了 context的回调
                tag: tag  // 标识符
            });

            mediator[listenerType](name, callback);
        };
    };

    /**
     * @typedef SandboxChildren
     * @property {string} ref - sandbox的唯一标识符
     * @property {string} caller - 开启该sandbox的对象的唯一标识符
     */

    /**
     * @classdesc 沙箱，管理公共方法、消息传递、宿主生命周期维护
     * @class Sandbox
     */
    function Sandbox(options) {

        /**
         * 名称
         * @var {string} name
         * @memberOf Sandbox#
         */
        this.name = options.name;
        /**
         * 当前应用程序实例
         * @var {Application} app
         * @memberOf Sandbox#
         */
        this.app = options.app;
        this.type = 'sandbox';
        /**
         * 唯一标识符
         * @var {string} _id
         * @memberOf Sandbox#
         */
        this._id = options._id;
        this._hostType = options._hostType;
        /**
         * 子集
         * @var {SandboxChildren[]} _children
         * @memberOf Sandbox#
         * @private
         */
        this._children = [];

        this._events = [];

        // this.mediator = core.createMediator();

    }

    /**@lends Sandbox# */
    var proto = {
        constructor: Sandbox,
        /**
         * 为沙箱记录日志
         */
        log: function (msg, type) {
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
        },
        /**
         * 获取全局配置
         * @function
         * @see {@link veronica.getConfig}
         */
        getConfig: core.getConfig,
        /**
         * 订阅消息
         * @function
         * @param {string} name - 名称
         * @param {function} listener - 监听器
         * @param {object} context - 执行监听器的上下文
         * @param {string} tag - 监听标记
         */
        on: attachListener('on'),
        /**
         * 订阅一次
         * @function
         * @param {string} name - 名称
         * @param {function} listener - 监听器
         * @param {object} context - 执行监听器的上下文
         * @param {string} tag - 监听标记，在移除时，可根据该标记进行识别
         */
        once: attachListener('once'),
        /**
         * 取消单个订阅
         * @param {string} name - 消息名称
         * @param {function} listener - 监听器
         */
        off: function (name, listener) {
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
        },
        /**
         * 发布消息
         * @param {string} name - 消息名称
         * @param {...*} params - 消息参数
         */
        emit: function () {
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
        },
        /**
         * 批量停止消息订阅
         * @param {string} [tag] - 只停止带有该标记的订阅
         */
        stopListening: function (tag) {
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
        },
        /**
         * 启动新的 widget，所开启的 widget 成为该 widget 的子 widget
         * @param {Array} list - widget 配置列表
         * @param {string} page - 所属页面
         * @param {string} callerId - 启动这些widget的对象标记
         * @returns {Promise}
         */
        startWidgets: function (list, page, callerId) {
            var app = core.app;

            return app.widget.start(list, _.bind(function (widget) {
                var sandbox = widget.sandbox;
                sandbox._parent = this._id;
                this._children.push({ ref: sandbox._id, caller: callerId });
            }, this), page);
        },
        /**
         * 停止并销毁该沙箱及其宿主
         */
        stop: function () {
            var app = core.app;
            app.widget.stop(this);
        },
        /**
         * 停用并销毁子沙箱及其宿主对象
         * @param {string} [callerId] - 调用者标识符，传入该参数，可只销毁拥有该调用者标识的沙箱
         */
        stopChildren: function (callerId) {
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

        },
        /**
         * 获取宿主对象
         * @returns {Object}
         */
        getHost: function () { }
    };

    Sandbox.prototype = proto;

    return Sandbox;
});
