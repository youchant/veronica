define([
    './core/base/index'
], function (baseLib) {

    var EventEmitter = baseLib.EventEmitter;
    var baseListenTo = baseLib.Events.listenTo;
    var $ = baseLib.$;
    var _ = baseLib._;
    var when = $.when;

    function Message(options) {
        this._stop = false;
        this._result = [];

        Object.assign(this, {
            flow: 'down',
            data: null,
            sender: null
        }, options);

    }

    Message.prototype = {
        stop: function () {
            this._stop = false;
        },
        isStop: function () {
            return this._stop;
        }
    };

    return function (base) {

        var noop = function () {
        };

        /** @lends veronica.View# */
        var configs = {
            /**
             * **`重写`** 订阅消息
             * @type {function}
             * @example
             *   subscribe: function(){
             *       this.sub('setTriggers', function(){
             *           alert('I received this message');
             *       })
             *       this.sub ...
             *   }
             */
            subscribe: noop,

            /**
             * **`重写`** 监听自身和子视图事件
             * @type {function}
             * @example
             *   listen: function(){
             *       this.listenTo('rendered', function(){
             *           // 处理代码
             *       });
             *       this.listenTo ...
             *       this.listenToDelay('edit', 'saved', function(){
             *       })
             *   }
             */
            listen: noop
        };

        /** @lends veronica.View# */
        var methods = {
            /**
             * 监听事件
             * @param {object|string|array} sender - 事件的发送者，如果是字符串，则为视图的名称
             * @param {string} event - 事件名称
             * @param {eventCallback} callback - 回调
             * @example
             *  listen: funciton () {
             *       this.listenTo('view', 'saved', function () {})
             *       this.listenTo(this, 'selected', function () {})
             *
             *       // 可一次性监听多个
             *       this.listenTo([
             *         [this, 'selected'],
             *         ['view', 'saved']
             *       ], function () {
             *
             *       })
             *   }
             *
             */
            listenTo: function (sender, event, handler) {
                var me = this;
                if (_.isString(sender)) {
                    if (sender === 'parent') {
                        me._listenToParent(event, handler);
                    }
                    me._listenToDelay(sender, event, handler);
                    return;
                }
                if (!_.isString(event)) {
                    var objEvents = sender;
                    handler = event;
                    var me = this;
                    _.each(objEvents, function (objEvent) {
                        me.listenTo(objEvent[0], objEvent[1], handler);
                    });
                    return;
                }

                baseListenTo.call(this, sender, event, handler);
            },
            _listenToParent: function (event, handler) {
                var app = this.app();
                var me = this;
                if (this._parent != null) {
                    var parent = app.widget.get(this._parent);
                    me.listenTo(parent, event, handler);
                }
            },
            /**
             * 延迟监听子视图
             * @private
             * @param {string} name - 子视图名称
             * @param {string} event - 事件名称
             * @param {eventCallback} callback - 回调
             */
            _listenToDelay: function (name, event, callback) {

                this._delayEvents.push({
                    name: name,
                    event: event,
                    callback: callback
                });
                if (this.view(name)) {
                    this.listenTo(this._findChild(name), event, callback);
                }
            },

            // 默认的监听
            _listen: function () {
                var me = this;

                this.listenTo(this, 'rendering', function () {
                    this.state.isRendered = false;
                });

                this.listenTo(this, 'rendered', function () {
                    this.state.isRendered = true;
                });

                // 监听属性变更
                this.listenTo(this, 'attr-changed', function (name, value) {
                    var handler = this.attrChanged[name];
                    if (handler == null) {
                        handler = this.attrChanged['defaults']
                    }
                    ;
                    this._invoke(handler, true, value, name);
                });

                _.each(['modelBound', 'rendered'], function (evt) {
                    me[evt] && me.listenTo(me, evt, function () {
                        this._invoke(evt);
                    });
                });

            },
            _attachMessageListener: function (name, listener, listenerType) {
                var app = this.app();
                var mediator = app.mediator;
                var context = this;

                var callback = function (e) {
                    var rt = listener.apply(context, e);

                    if (e.isStop()) {

                    }
                    ;
                    if (e.flow === 'up') {

                    }


                };

                this._messages = this._messages || [];
                this._messages.push({
                    name: name,  // 消息名
                    listener: listener,  // 原始回调方法
                    callback: callback,  // 绑定了 context的回调
                    tag: tag  // 标识符
                });

                mediator[listenerType](name, callback);
            },

            /**
             * 订阅消息
             * @param {string} name 消息名
             * @param {messageCallback} listener 消息订阅处理函数
             */
            sub: function (name, listener) {
                this._attachMessageListener(name, listener, 'on');
            },
            /**
             * 订阅一次
             * @function
             * @param {string} name - 名称
             * @param {function} listener - 监听器
             * @param {object} context - 执行监听器的上下文
             * @param {string} tag - 监听标记，在移除时，可根据该标记进行识别
             */
            subOnce: function (name, listener) {
                this._attachMessageListener(name, listener, 'once');
            },
            _getMediator: function (flow) {
                if (flow === 'down') {
                    return this._mediator;
                }
                if (flow === 'up') {
                    return this._upMediator;
                }
                return this.app().mediator;
            },
            /**
             * 发布消息
             * @param {string} name 消息名
             * @param {...*} msgParam 消息传递的参数
             */
            _pub: function (name, flow, data) {
                var me = this;
                var mediator = this._getMediator(flow);
                var events = [];
                var relations = [];

                if (flow === 'up') {
                    relations = me.parents();
                }
                if (flow === 'down') {
                    relations = me.children();
                }
                events = relations.map(function (p) {
                    return name + '.' + p.id;
                });

                var rt = [];
                events.forEach(function (n) {
                    var emitFunc = _.bind(function () {
                        var msg = new Message({
                            sender: this,
                            flow: flow,
                            data: data
                        });
                        this.log(['emitted', n, msg]);
                        return mediator.emitAsync(n, msg);
                    }, me);

                    if (app.widget.isLoading()) {
                        app.emitQueue.push(emitFunc);
                    } else {
                        emitFunc();
                    }
                });

            },
            pub: function (name, data, flow) {
                var me = this;
                var pubFunc = me.bind(me, name, flow, data);

                // 延迟任务
                if (app.widget.isLoading()) {
                    app.emitQueue.push(pubFunc);
                } else {
                    return pubFunc();
                }
            },
            pubUp: function () {
            },
            pubDown: function () {

            },
            /**
             * 取消该视图的所有消息订阅
             */
            unsub: function (tag) {
                var app = this.app();
                var mediator = app.mediator;
                var messages = this._messages;

                if (!this._messages) {
                    return;
                }

                if (tag) {
                    messages = _.filter(messages, function (evt) {
                        return evt.tag === tag;
                    });
                }
                _.each(messages, function (evt) {
                    mediator.off(evt.name, evt.callback);
                });
            },
            unsubOne: function (name, listener) {
                var mediator = app.mediator;
                if (!this._messages) {
                    return;
                }
                this._messages = _.reject(this._events, function (evt) {
                    var ret = (evt.name === name && evt.listener === listener);
                    if (ret) {
                        mediator.off(name, evt.callback);
                    }
                    return ret;
                });
            }
        };

        base._extend({
            configs: configs,
            methods: methods
        });

        base._extendMethod('_initProps', function () {
            this._messages = [];
            this._delayEvents = [];
        })
    };
});
