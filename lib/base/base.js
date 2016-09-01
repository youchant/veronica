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
        _initProps: function () { },
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
        }
    }

    base.whenSingleResult = function () {
        var inputDeferreds = Array.prototype.slice.call(arguments);
        var deferred = $.Deferred();
        $.when.apply($, inputDeferreds).done(function () {
            var args = _.toArray(arguments);
            var result = _.map(args, function (prop) {
                return _.isArray(prop) ? (prop[1] === 'success' ? prop[0] : prop) : prop;
            });
            deferred.resolve.apply(deferred, result);
        }).fail(function () {
            deferred.reject(arguments);
        });
        return deferred.promise();
    }

    return base;
});
