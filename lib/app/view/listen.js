define(function () {

    return function (base, app) {

        var noop = function () { };
        var baseListenTo = app.core.Events.listenTo;

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
                var baseListenToDeley = this.listenToDelay;
                if (_.isString(sender)) {
                    baseListenToDeley.call(this, sender, event, handler);
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
            /**
             * 延迟监听子视图
             * @private
             * @deprecated
             * @param {string} name - 子视图名称
             * @param {string} event - 事件名称
             * @param {eventCallback} callback - 回调
             */
            listenToDelay: function (name, event, callback) {

                this._delayEvents.push({
                    name: name,
                    event: event,
                    callback: callback
                });
                if (this.view(name)) {
                    this.listenTo(this.view(name), event, callback);
                }
            },

            // 默认的监听
            _listen: function () {
                var me = this;
                this.listenTo(this, 'modelBound', function (model) {
                    // 更新子视图模型
                    _.each(me._views, function (view) {
                        view.externalModel(model);
                    });
                });
                this.listenTo(this, 'rendering', function () {
                    this.state.isRendered = false;
                    // 自动创建子视图
                    if (this.options.autoCreateSubview) {
                        this._createSubviews();
                    }
                });

                this.listenTo(this, 'rendered', function () {
                    this.state.isRendered = true;
                    // 在渲染视图后重新绑定视图模型
                    this._bindViewModel();
                });

                // 监听属性变更
                this.listenTo(this, 'attr-changed', function (name, value) {
                    var handler = this.attrChanged[name];
                    if (handler == null) { handler = this.attrChanged['defaults'] };
                    this._invoke(handler, true, value, name);
                });

                _.each(['modelBound', 'rendered'], function(evt) {
                    me[evt] && me.listenTo(me, evt, function() {
                        this._invoke(evt);
                    });
                });

            },

            /**
             * 订阅消息
             * @param {string} name 消息名
             * @param {messageCallback} listener 消息订阅处理函数
             */
            sub: function (name, listener) {

                this.options.sandbox.on(name, listener, this, this.cid);
            },

            /**
             * 发布消息
             * @param {string} name 消息名
             * @param {...*} msgParam 消息传递的参数
             */
            pub: function () {
                this.options.sandbox.emit.apply(this.options.sandbox,
                    Array.prototype.slice.call(arguments));
            },

            /**
             * 取消该视图的所有消息订阅
             */
            unsub: function () {
                this.options.sandbox.stopListening(this.cid);
            }
        };

        base._extend({
            configs: configs,
            methods: methods
        });
    };
});
