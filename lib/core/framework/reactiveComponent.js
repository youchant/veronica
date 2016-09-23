define([
    '../base/index',
    './appComponent'
], function (baseLib, AppComponent) {

    var _ = baseLib._;
    var extend = _.extend;
    var Deffered = baseLib.$.Deferred;
    var when = baseLib.$.when;

    var ReactiveComponent = AppComponent.extend({
        initialize: function (options) {
            this.supr(options);
            this._id = _.uniqueId('cmp');
            this._children = [];
            this._messages = [];
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
        _attachMessageListener: function (name, listener, listenerType) {
            var app = this.app();
            var mediator = this._getMediator();
            var context = this;

            var callback = function (e) {
                return listener.apply(context, e);
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
        subOnce: function(name, listener){
            this._attachMessageListener(name, listener, 'once');
        },
        _getMediator: function(){
            return this.app().mediator;
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
            this.log(['emitted', n, msg]);
            promises.push(mediator.emitAsync(n, msg));

            when.apply(null, promises).then(function(){
                var resp = _.flatten(arguments);
                dfd.resolve(resp);
            }, function(resp){
                dfd.reject(resp);
            })

        },
        pub: function (name, data) {
            var me = this;
            var app = this.app();
            var dfd = Deffered();
            var pubFunc = me.bind(me, name, data, dfd);

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
            var app = this.app();
            var mediator = app._getMediator();
            var messages = this._messages;

            if (!this._messages) {
                return;
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
    });

    return AppProvider;
});
