define([
], function () {

    'use strict';

    /**
     * @typedef SandboxChildren
     * @property {string} ref - sandbox 的唯一标识符
     * @property {string} caller - 开启该 sandbox 的对象的唯一标识符
     */

    return function (app) {

        var core = app.core;
        var _ = core._;
        var $ = core.$;
        var SANDBOX_REF_NAME = app.constants.SANDBOX_REF_NAME;

        var attachListener = function (listenerType) {
            return function (name, listener, context, tag) {
                var mediator = core.mediator;
                if (!_.isFunction(listener) || !_.isString(name)) {
                    throw new Error('Invalid arguments passed to sandbox.' + listenerType);
                }
                context = context || this;

                var callback = function () {
                    var args = Array.prototype.slice.call(arguments);
                    var condition = true;
                    // 有条件的触发监听器
                    if (context.options && context.options.sandbox
                        && args.length > 0 && args[0]._target) {
                        var target = args[0]._target;
                        var senderId = args[0]._senderId;
                        var app = context.sandbox.app;
                        var sender = app.sandboxes.get(senderId);
                        var thisId = context.options.sandbox._id;
                        var expectList = [];
                        condition = false;

                        if (target === 'children') {
                            expectList = sender.children();
                        }
                        if (target === 'parents') {
                            expectList = sender.parents();
                        }
                        if (expectList.indexOf(thisId) > -1) {
                            condition = true;
                        }
                    }

                    if (condition) {
                        listener.apply(context, args);  // 将该回调的上下文绑定到sandbox
                    }

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
         * @classdesc 沙箱，管理公共方法、消息传递、宿主生命周期维护
         * @class Sandbox
         * @param {object} options - 参数对象
         * @memberOf veronica
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

        /**@lends veronica.Sandbox# */
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
                    if (eventData.length > 1) {
                        // 这里取时间名称后的第一个参数
                        if (eventData[1]._target) {
                            eventData[1]._senderId = this._id;
                        }
                    }
                    mediator.emit.apply(mediator, eventData);
                    eventData.unshift('emitted');
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
                    events = _.filter(events, function (evt) {
                        return evt.tag === tag;
                    });
                }
                _.each(events, function (evt) {
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
                    children = _.filter(children, function (cd) {
                        return cd.caller === callerId;
                    });
                }

                _.invoke(_.map(children, function (cd) {
                    return app.sandboxes.get(cd.ref);
                }), 'stop');

            },
            /**
             * 获取沙箱拥有者
             * @returns {Object} 拥有者对象
             */
            getOwner: function () { },
            children: function (result) {
                if (result == null) {
                    result = [];
                }
                var children = this._children;
                var app = this.app;
                if (children == null || children.length === 0) {
                    return result;
                }

                var ids = _.map(children, function (item) {
                    return item.ref;
                });

                result = result.concat(ids);

                _.each(ids, function (id) {
                    var sandbox = app.sandboxes.get(id);
                    result = sandbox.children(result);
                });

                return result;
            },
            parents: function () {
                var parentId = this._parent;
                var app = this.app;
                var result = [];
                while (parentId != null) {
                    result.push(parentId);
                    var sandbox = app.sandboxes.get(parentId);
                    parentId = sandbox._parent;
                }

                return result;
            }
        };

        Sandbox.prototype = proto;

        /**
         * 无法直接构造
         * @classdesc 管理所有沙箱
         * @class veronica.Sandboxes
         */

        /** @lends veronica.Sandboxes# */
        var sandboxes = app.provider.create({
            /**
             * 创建沙箱
             * @param {string} name - 沙箱名称
             * @param {veronica.enums.hostType} [hostType=WIDGET] - 宿主类型
             * @returns {Sandbox}
             */
            create: function (name, ownerType) {
                var me = this;
                var id = _.uniqueId('sandbox$');
                ownerType || (ownerType = core.enums.hostType.WIDGET);
                var sandbox = new Sandbox({
                    name: name,
                    _id: id,
                    _ownerType: ownerType,
                    app: app
                });

                var exists = me.get(id);
                if (exists) {
                    throw new Error("Sandbox with ref " + id + " already exists.");
                } else {
                    me.add(id, sandbox);
                }

                return sandbox;
            },
            /**
             * 根据插件名称获取沙箱
             * @param {string} name - 沙箱名称
             * @returns {Array<Sandbox>}
             */
            getByName: function (name) {
                return _.filter(this._pool, function (o) {
                    return o.name === name;
                });
            },
            /**
             * 根据 DOM 元素获取沙箱
             * @param {object|string} el - 元素节点或选择器
             * @returns {Sandbox}
             */
            getByEl: function (el) {
                var sandboxRef = $(el).data(SANDBOX_REF_NAME);
                return this.get(sandboxRef);
            }
        });

        /**
         * @name sandboxes
         * @memberOf veronica.Application#
         * @type {veronica.Sandboxes}
         */
        app.sandboxes = sandboxes;
    };

});
