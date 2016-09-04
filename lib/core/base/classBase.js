define([
    'lodash',
    './klass',
    './events',
    './aspect'
], function (_, klass, Events, Aspect) {

    'use strict';

    var ClassBase = klass(_.extend({}, Aspect, Events, {
        initialize: function () { },
        _initProps: function () { },
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
    }));

    return ClassBase;
});
