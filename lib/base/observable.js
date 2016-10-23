define([
    'lodash',
    './class'
], function (_, createClass) {

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

    var Observable = createClass(/** @lends veronica.Observable# */{
        /**
         * 可观察对象，是所有类型的基类，具有事件和 Aspect 特性
         * @constructs Observable
         * @augments {veronica.BaseClass}
         * @memberOf veronica
         */
        initialize: function () {
            this._events = {};
            this._listenId = _.uniqueId('l');
            this._listeningTo = {};
            this._delayEvents = [];
        },
        /**
         * 添加监听器
         * @param {string} name - 事件名
         * @param {function} callbacks - 回调处理程序
         * @param {boolean} [one=false] - 是否只监听一次
         * @param {Object} [context=this] - 回调上下文
         * @param {string} [insertMethod=push] - 插入事件队列的方法
         * @returns {this}
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
        /**
         * 添加监听器，仅监听一次
         * @param {string} name - 事件名
         * @param {function} callbacks - 回调处理程序
         * @param {Object} [context=this] - 回调上下文
         * @returns {this}
         */
        once: function (name, callbacks, context) {
            return this.on(name, callbacks, true, context);
        },
        /**
         * 添加监听器，并将监听函数放到事件队列头
         * @param {string} name - 事件名
         * @param {function} callbacks - 回调处理程序
         * @param {boolean} [one=false] - 是否只监听一次
         * @param {Object} [context=this] - 回调上下文
         * @returns {this}
         */
        onFirst: function (name, callbacks, one, context) {
            return this.on(name, callbacks, one, context, 'unshift');
        },
        /**
         * 监听
         * @param {Object} obj - 被监听者
         * @param {string} name - 事件名
         * @param {function} callbacks - 回调处理程序
         * @param {boolean} [one=false] - 是否只监听一次
         * @returns {this}
         */
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
        /**
         * 监听，仅监听一次
         * @param {Object} obj - 被监听者
         * @param {string} name - 事件名
         * @param {function} callbacks - 回调处理程序
         * @returns {this}
         */
        listenToOnce: function (obj, name, callback) {
            return this.listenTo(obj, name, callback, true);
        },
        /**
         * 移除监听器
         * @param {string} [name] - 事件名
         * @param {function} [callback] - 监听器
         * @param {Object} [context] - 上下文对象
         * @returns {Observable}
         */
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
        /**
         * 停止监听
         * @param {Object} [obj] - 被监听者
         * @param {string} [name] - 事件名
         * @param {function} [callback] - 回调处理程序
         */
        stopListen: function (obj, name, callback) {
            var listeningTo = this._listeningTo;
            var ids = obj ? [obj._listenId] : _.keys(listeningTo);

            for (var i = 0; i < ids.length; i++) {
                var listening = listeningTo[ids[i]];

                if (!listening) break;  // 这里用 continue 是否更好？

                listening.obj.off(name, callback, this);
            }
        },
        /**
         * 触发事件
         * @description 将参数用一个对象传递，避免使用多参数或原始类型参数
         * @param {string} name - 事件名
         * @param {Object} [e] - 参数对象
         * @param {Object} [second] - 可能的第二个参数
         * @returns {*} - 调用结果
         */
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
        /**
         * Aspect 机制，在某个方法前执行
         * @description 如果返回 false，则会阻止正式方法的执行
         * @param {string} methodName - 方法名
         * @param {function} callback - 回调
         * @param {Object} [context] - 上下文
         * @returns {*}
         */
        before: function (methodName, callback, context) {
            return weaveAspect.call(this, 'before', methodName, callback, context);
        },
        /**
         * Aspect 机制，在某个方法后执行
         * @param {string} methodName - 方法名
         * @param {function} callback - 回调
         * @param {Object} [context] - 上下文
         * @returns {*}
         */
        after: function (methodName, callback, context) {
            return weaveAspect.call(this, 'after', methodName, callback, context);
        },
        _initProps: function () {
        },
        _call: function (func, args) {
            func.apply(this, Array.prototype.slice.call(args));
        }
    });

    return Observable;
});
