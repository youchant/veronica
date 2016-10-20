define([
    'lodash',
    './klass'
], function (_, klass) {

    'use strict';

    var eventSplitter = /\s+/;

    function weaveAspect(when, methodName, callback, context) {
        var names = methodName.split(eventSplitter);
        var name, method;

        while (name = names.shift()) {
            method = this[name];
            if (!method) {
                throw new Error('Invalid method name: ' + methodName);
            }

            if (!method.__isAspected) {
                wrapAspectMethod.call(this, name);
            }
            this.on(when + ':' + name, callback, context);
        }

        return this;
    }

    function wrapAspectMethod(methodName) {
        var old = this[methodName];

        this[methodName] = function () {
            var args = Array.prototype.slice.call(arguments);
            var beforeArgs = ['before:' + methodName].concat(args);
            var beforeRet = this.trigger.apply(this, beforeArgs);
            if (beforeRet === false) return;

            var ret = old.apply(this, arguments);
            var afterArgs = ['after:' + methodName, ret].concat(args);
            this.trigger.apply(this, afterArgs);
            return ret;
        };

        this[methodName].__isAspected = true;
    }

    function preventDefault() {
        this._defaultPrevented = true;
    }

    function isDefaultPrevented() {
        return this._defaultPrevented === true;
    }

    var ClassBase = klass({
        /**
         * 基础对象，具有事件和 Aspect 特性
         * @constructs ClassBase
         */
        initialize: function () {
            this._events = {};
            this._listenId = _.uniqueId('l');
            this._listeningTo = {};
            this._delayEvents = [];
        },
        /**
         * 监听
         * @param {string} name - 事件名
         * @param {function} callbacks - 回调处理程序
         * @param {boolean} [one=false] - 是否只监听一次
         * @param {Object} [context=this] - 回调上下文
         * @param {string} [insertMethod=push] - 插入事件队列的方法
         * @returns {ClassBase}
         */
        on: function (name, callbacks, one, context, insertMethod) {

            var me = this;
            var names = typeof name === 'string' ? [name] : name;
            context || (context = me);
            if (insertMethod == null) {
                insertMethod = 'push';
            }

            var callbacksIsFunction = typeof callbacks === 'function';
            var callback;

            if (callbacks === undefined) {
                for (var key in name) {
                    callback = name[key];
                    me.on(key, callback);
                }
                return this;
            }

            for (var i = 0, len = names.length; i < len; i++) {
                name = names[i];
                callback = callbacksIsFunction ? callbacks : callbacks[name];
                if (!callback) continue;

                if (one) {
                    var original = callback;
                    callback = function () {
                        me.off(name, callback);
                        original.apply(context, arguments);
                    };
                    callback.original = original;
                }

                // 添加到事件池
                me._events[name] = me._events[name] || [];
                var events = me._events[name];
                var handler = {
                    context: context,
                    callback: callback
                };
                events[insertMethod](handler);
            }

            return this;
        },
        one: function (name, callbacks, context) {
            return this.on(name, callbacks, true, context);
        },
        onFirst: function (name, callbacks, one, context) {
            return this.on(name, callbacks, one, context, 'unshift');
        },
        listenToOnce: function (obj, name, callback) {
            return this.listenTo(obj, name, callback, true);
        },
        listenTo: function (obj, name, callback, one) {
            if (one == null) {
                one = false;
            }

            if (typeof obj === 'string') {
                this._delayEvents.push({
                    name: obj,
                    event: name,
                    callback: callback
                });
                return this;
            }

            var thisId = this._listenId;
            var objId = obj._listenId;
            var listeningTo = this._listeningTo;

            if (!listeningTo[objId]) {
                listeningTo[objId] = {
                    obj: obj,
                    objId: objId,
                    id: thisId,
                    count: 0
                };
            }

            var listening = listeningTo[objId];

            obj.on(name, callback, one, this);

            listening.count++;

            return this;
        },
        off: function (name, callback, context) {
            var me = this;
            var allEvents = this._events;
            var events = allEvents[name];

            if (name === undefined) {
                // 移除所有 hanlder
                me._events = {};
            } else if (events) {
                if (!callback && !context) {
                    // 移除某个事件所有 handler
                    me._events[name] = [];
                } else {
                    // 移除单个 handler
                    for (var i = events.length - 1; i >= 0; i--) {
                        var handler = events[i];
                        if (callback && (callback === handler.callback || callback === handler.original ) ||
                            context && handler.context === context) {
                            events.splice(i, 1);
                        }
                    }
                }
            }

            return me;
        },
        stopListen: function (obj, name, callback) {
            var listeningTo = this._listeningTo;
            var ids = obj ? [obj._listenId] : _.keys(listeningTo);

            for (var i = 0; i < ids.length; i++) {
                var listening = listeningTo[ids[i]];

                if (!listening) break;

                listening.obj.off(name, callback, this);
            }
        },
        trigger: function (name, e, second) {
            if (!this._events) return this;

            var events = this._events[name];
            var me = this;
            if (!events) return;

            var retVal;
            var args;
            if (e == null || second == null && typeof e === 'object') {
                e = e || {};
                e.sender = me;
                e._defaultPrevented = false;
                e.preventDefault = preventDefault;
                e.isDefaultPrevented = isDefaultPrevented;
                args = [e]
            } else {
                args = Array.prototype.slice.call(arguments, 1);
            }

            events = events.slice();
            for (var idx = 0, length = events.length; idx < length; idx++) {
                var evt = events[idx];
                var context = evt.context || me;
                var rt = evt.callback.apply(context, args);
                if (rt !== undefined) {
                    retVal = rt;
                }
            }

            return retVal;
        },
        before: function (methodName, callback, context) {
            return weaveAspect.call(this, 'before', methodName, callback, context);
        },
        after: function (methodName, callback, context) {
            return weaveAspect.call(this, 'after', methodName, callback, context);
        },
        _initProps: function () {
        },


        _call: function (func, args) {
            func.apply(this, Array.prototype.slice.call(args));
        },
        _extend: function (obj) {
            var me = this;
            obj.options && $.extend(this._defaults, obj.options);
            obj.configs && $.extend(this, obj.configs);
            obj.methods && $.extend(this, obj.methods);

            // 加入运行时属性
            if (obj.props) {
                this._extendMethod('_initProps', function () {
                    _.each(obj.props, function (prop, name) {
                        me[name] = prop;
                    });
                });
            }
        },
        _extendMethod: function (methodName, newMethod) {
            var original = this[methodName];
            this[methodName] = function () {
                this._call(original, arguments);
                this._call(newMethod, arguments);
            }
        }
    });

    return ClassBase;
});
