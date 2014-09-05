// core
define([
    'underscore'
], function (_) {

    'use strict';

    // 将字符串转换成反驼峰表示
    function decamelize(camelCase, delimiter) {
        delimiter = (delimiter === undefined) ? '_' : delimiter;
        return camelCase.replace(/([A-Z])/g, delimiter + '$1').toLowerCase();
    }

    // 扩展实例属性
    function extend(obj, mixin) {
        var method, name;
        for (name in mixin) {
            method = mixin[name];
            obj[name] = method;
        }
        return obj;
    };

    // 扩展类属性
    function include(klass, mixin) {
        return extend(klass.prototype, mixin);
    };

    // 混入，传入对象或构造函数，分别混入实例属性和类属性
    function mixin(obj, mixin) {
        obj.prototype ? include(obj, mixin) : extend(obj, mixin);
    }

    _.mixin({
        indexOf2: function (array, test) {
            var indexOfValue = _.indexOf;
            if (!_.isFunction(test)) return indexOfValue(array, test);
            for (var x = 0; x < array.length; x++) {
                if (test(array[x])) return x;
            }
            return -1;
        },
        safeInvoke: function (context, method, params) {
            var args = Array.slice.call(arguments, 2);
            context && context[method].apply(context, args);
        }
    });

    return {
        decamelize: decamelize,
        extend: extend,
        include: include,
        mixin: mixin
    };

});