define([
    '../base/index',
    './appComponent',
    '../../view/index'
], function (baseLib, AppComponent, widgetBase) {

    'use strict';

    var _ = baseLib._;
    var $ = baseLib.$;
    var Deffered = baseLib.$.Deferred;
    var when = baseLib.$.when;

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

    // thx: Backbone

    var delegateEventSplitter = /^(\S+)\s*(.*)$/;
    var viewOptions = [
        'model', 'collection',
        'el', 'id', 'attributes',
        'className', 'tagName', 'events',
        '_name', '_widgetName', '_context'
    ];

    var Widget = AppComponent.extend({
        initialize: function (options) {
            options || (options = {});
            this.supr(options);
            /**
             * 唯一标识符
             * @var {string} _id
             * @memberOf Widget#
             */
            this._id = _.uniqueId('widget$');
            this._type = 'widget';

            /**
             * 子集
             * @var {SandboxChildren[]} _children
             * @memberOf Sandbox#
             * @private
             */
            this._children = [];
            this._parent = null;
            /**
             * 事件池
             * @type {Array}
             * @private
             */
            this._messages = [];
            this._delayEvents = [];

            _.extend(this, _.pick(options, viewOptions));

            this._ensureElement();
            this._initialize.apply(this, arguments);
            this.delegateEvents();
        },

        _listen: function(){
            var me = this;
            this.listenTo(this, 'addChild', function(child){
                me._listenToDelay(child.options._name);
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
                if (sender === 'parent') {
                    me._listenToParent(event, handler);
                }
                me._listenToChild(sender, event, handler);
                return;
            }
            if (!_.isString(event)) {
                var objEvents = sender;
                handler = event;
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
        _listenToDelay: function(name){
            var me = this;
            // 取出延迟监听的事件，并进行监听
            _.each(_.filter(me._delayEvents, function (obj) {
                return obj.name === me;
            }), function (obj) {
                me.listenTo(view, obj.event, obj.callback);
            });
        },

        _getMediator: function(){
            return this.app().mediator;
        },
        _attachObserver: function (name, listener, listenerType) {
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
        subOnce: function(name, listener){
            this._attachObserver(name, listener, 'once');
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
        },

        /**
         * 获取所有子级
         * @param result
         * @returns {*|Array|{options, bootstrap}|{dist}|Array.<T>|string}
         */
        _descendant: function (result) {
            var app = this.app();
            if (result == null) {
                result = [];
            }
            var children = this._children;
            if (children == null || children.length === 0) {
                return result;
            }

            var ids = _.map(children, function (item) {
                return item.id;
            });

            result = result.concat(ids);

            _.each(ids, function (id) {
                var child = app.widget.get(id);
                result = child._descendant(result);
            });

            return result;
        },
        children: function(isDescendant){
            if(isDescendant == null){
                isDescendant = true;
            }
            if(!isDescendant){
                return this._children;
            }else{
                return this._descendant();
            }
        },
        parents: function () {
            var parentId = this._parent;
            var app = this.app();
            var result = [];
            while (parentId != null) {
                result.push(parentId);
                var parent = app.widget.get(parentId);
                parentId = parent._parent;
            }

            return result;
        },
        _addChild: function (child) {
            var me = this;
            child._parent = me._id;
            me._children.push({ id: child._id, name: child.options._name });
            me.trigger('addChild', child);
        },
        removeChild: function(name){
            _.remove(this._children, function(c) {
                return c.name === name;
            });
        },
        _findChild: function(name){
            return _.find(this._children, function(c){
                return c.name === name;
            });
        },

        tagName: 'div',
        $: function (selector) {
            return this.$el.find(selector);
        },
        _initialize: function () { },

        render: function () {
            return this;
        },

        remove: function () {
            this.$el.remove();
            this.stopListening();
            return this;
        },

        setElement: function (element, delegate) {
            if (this.$el) this.undelegateEvents();
            this.$el = element instanceof $ ? element : $(element);
            this.el = this.$el[0];
            if (delegate !== false) this.delegateEvents();
            return this;
        },

        delegateEvents: function (events) {
            if (!(events || (events = _.result(this, 'events')))) return this;
            this.undelegateEvents();
            for (var key in events) {
                var method = events[key];
                if (!_.isFunction(method)) method = this[events[key]];
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

        undelegateEvents: function () {
            this.$el.off('.delegateEvents' + this._id);
            return this;
        },

        _ensureElement: function () {
            if (!this.el) {
                var attrs = _.extend({}, _.result(this, 'attributes'));
                if (this.id) attrs.id = _.result(this, 'id');
                if (this.className) attrs['class'] = _.result(this, 'className');
                var $el = Backbone.$('<' + _.result(this, 'tagName') + '>').attr(attrs);
                this.setElement($el, false);
            } else {
                this.setElement(_.result(this, 'el'), false);
            }
        }
    });

    // static methods

    Widget.getBase = function () {
        return widgetBase(this.app());
    }

    /**
     * 创建一个自定义 View 定义
     * @param {object|function} [obj={}] - 自定义属性或方法
     * @param {boolean} [isFactory=false] - 是否该视图定义是个工厂方法（不需要 `new`）
     */
    Widget.define = function(obj, isFactory){
        var me = this;
        var ctor;
        if (isFactory == null) {
            isFactory = true;
        }

        if (typeof obj === 'object') {  // 普通对象
            var literal = extend({}, Widget.getBase(), obj);
            ctor = Widget.extend(literal);
        } else {
            if (obj.extend) {  // 本身是 Backbone.View 构造函数
                ctor = obj;
            } else {  // 工厂函数
                return obj;
            }
        }

        // 使用工厂模式
        if (isFactory) {
            return function (options) {
                return new ctor(options);
            }
        }

        return ctor;
    }

    Widget.create = function(initializer, options){
        // 将构造器中的 _widgetName 附加到 视图中
        var defaults = {
            _xtypeName: initializer._xtypeName,
            _xtypeContext: initializer._xtypeContext,
            _exclusive: false
        };

        options = _.extend(defaults, options);

        // 调用
        var definition = Widget.define(initializer);
        var widget = definition;
        while (widget != null && typeof widget === 'function') {
            widget = widget(options);
        }

        if (widget == null) {
            console.error('View should return an object. [errorView:' + options._name);
        }

        return widget;
    }

    return Widget;
});
