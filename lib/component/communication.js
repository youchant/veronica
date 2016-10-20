define([
    '../base/index'
], function (baseLib) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var noop = function () {};
    var Deferred = $.Deferred;
    var baseListenTo = baseLib.ClassBase.prototype.listenTo;
    var listenPattern = /^(.*)\:(.*)/;
    var eventSplitter = /^(\S+)\s*(.*)$/;
    var delegateEventSplitter = /^(\S+)\s*(.*)$/;

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

    return {
        props: {
            _messages: [],
            _delayEvents: []
        },
        configs: {
            events: {}
        },
        methods: {
            _getEvents: function (type) {
                var events = _.result(this, 'events');
                return events[type];
            },
            _listenEventBus: function () {
                var events = this._getEvents('bus');
                var me = this;
                _.each(events, function (listener, name) {
                    me.sub(name, listener);
                });
            },
            _listenComponent: function () {
                var me = this;
                var events = this._getEvents('cmp');
                _.each(events, function (listener, name) {
                    me.listenTo(name, listener);
                });
            },
            delegateDOMEvents: function (domEvents) {
                domEvents || (domEvents = this._getEvents('dom'));
                if (!domEvents) {
                    return this;
                }

                this.undelegateDOMEvents();
                for (var key in domEvents) {
                    var method = domEvents[key];
                    if (!_.isFunction(method)) method = this[domEvents[key]];
                    if (!method) continue;

                    var match = key.match(delegateEventSplitter);
                    var eventName = match[1], selector = match[2];
                    method = _.bind(method, this);
                    eventName += '.delegateEvents' + this._id;
                    if (selector === '') {
                        this.$el.on(eventName, method);
                    } else {
                        this.$el.on(eventName, selector, method);
                    }
                }
                return this;
            },
            undelegateDOMEvents: function () {
                this.$el.off('.delegateEvents' + this._id);
                return this;
            },
            _listenToParent: function (event, handler) {
                var app = this.app();
                var me = this;
                if (this._parent != null) {
                    var parent = app.part('component').get(this._parent);
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
            _listenToChild: function (name, event, callback) {

                this._delayEvents.push({
                    name: name,
                    event: event,
                    callback: callback
                });

                // 如果已存在，则直接监听
                if (this._findChild(name)) {
                    this.listenTo(this._findChild(name), event, callback);
                }
            },
            _listenToDelay: function (name, obj) {
                var me = this;
                // 取出延迟监听的事件，并进行监听
                var events = _.filter(me._delayEvents, function (obj) {
                    return obj.name === name;
                });
                _.each(events, function (evt) {
                    me.listenTo(obj, evt.event, evt.callback);
                });
            },
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
                    if (handler == null) {
                        handler = event;
                        var match = eventSplitter.exec(sender);
                        sender = match[1];
                        event = match[2];
                    }

                    if (sender === 'parent') {
                        me._listenToParent(event, handler);
                        return;
                    }
                    if (sender === 'this') {
                        me.listenTo(this, event, handler);
                        return;
                    }

                    me._listenToChild(sender, event, handler);

                    return;
                }

                // 一次性监听多组
                if (!_.isString(event)) {
                    var objEvents = sender;
                    handler = event;
                    _.each(objEvents, function (objEvent) {
                        me.listenTo(objEvent[0], objEvent[1], handler);
                    });
                    return;
                }

                // 使用基础的 listenTo
                this.supr.call(this, sender, event, handler);
                //baseListenTo.call(this, sender, event, handler);
            },
            _getMediator: function () {
                return this.get('part:app:mediator');
            },
            _attachObserver: function (name, listener, listenerType) {
                var mediator = this._getMediator();
                var context = this;

                var callback = function (e) {
                    return listener.call(context, e);
                };

                this._messages = this._messages || [];
                this._messages.push({
                    name: name,  // 消息名
                    listener: listener,  // 原始回调方法
                    callback: callback  // 绑定了 context的回调
                });

                mediator[listenerType](name, callback);
            },
            /**
             * 发布消息
             * @param {string} name 消息名
             * @param {...*} msgParam 消息传递的参数
             */
            _pub: function (name, data, dfd) {
                var me = this;
                var mediator = this._getMediator();
                var promises = [];
                var msg = new Message({
                    sender: this,
                    data: data
                });
                this.log(['emitted', name, msg]);
                promises.push(mediator.trigger(name, msg));

                $.when.apply(null, promises).then(function () {
                    var resp = _.flatten(arguments);
                    dfd.resolve(resp);
                }, function (resp) {
                    dfd.reject(resp);
                })

            },
            /**
             * 订阅消息
             * @param {string} name 消息名
             * @param {messageCallback} listener 消息订阅处理函数
             */
            sub: function (name, listener) {
                this._attachObserver(name, listener, 'on');
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
                this._attachObserver(name, listener, 'once');
            },
            pub: function (name, data) {
                var me = this;
                var app = this.app();
                var dfd = Deferred();
                var pubFunc = _.bind(function(name, data, dfd){
                    this._pub(name, data, dfd);
                }, me, name, data, dfd);

                // 延迟任务
                if (app.busy()) {
                    app.addTask(pubFunc);
                } else {
                    pubFunc();
                }

                return dfd.promise();
            },
            /**
             * 取消该视图的所有消息订阅
             */
            unsub: function () {
                var mediator = this._getMediator();
                var messages = this._messages;

                if (!this._messages) {
                    return;
                }

                _.each(messages, function (evt) {
                    mediator.off(evt.name, evt.callback);
                });
            },
            unsubOne: function (name, listener) {
                var mediator = this.get('part:app:mediator');
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
        }
    };

});
