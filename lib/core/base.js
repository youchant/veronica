define([
    'jquery',
    'underscore',
    'eventemitter'
], function ($, _, EventEmitter) {

    'use strict';

    var base = {
        $: $,
        _: _,
        EventEmitter: EventEmitter
    };

    base.classBase = {
        _call: function (func, args) {
            func.apply(this, Array.prototype.slice.call(args));
        },
        _extend: function (obj) {
            obj.options && $.extend(this._defaults, obj.options);
            obj.configs && $.extend(this, obj.configs);
            obj.methods && $.extend(this, obj.methods);

            // 加入运行时属性
            if (obj.props) {
                this._extendMethod('_initProps', function () {
                    _.each(obj.props, function (prop, name) {
                        this[name] = prop;
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
        },
        _invoke: function (methodName, isWithDefaultParams) {
            var args = _.toArray(arguments);
            var sliceLen = args.length >= 2 ? 2 : 1;
            if (isWithDefaultParams == null) { isWithDefaultParams = true; }

            if (isWithDefaultParams) {
                args = args.concat([app, _, $]);
            }

            var method = methodName;
            if (_.isString(methodName)) {
                method = this[methodName];
            }

            return _.isFunction(method) ? method.apply(this, args.slice(sliceLen)) : method;
        }
    }

    return base;
});
