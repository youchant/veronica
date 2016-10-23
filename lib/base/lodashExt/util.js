// core
define([
    'lodash',
    'jquery'
], function (_, $) {

    'use strict';

    // use lodash methods:
    // _.get, _.set,

    function mixinIt(name, func) {
        var obj = {};
        obj[name] = func;
        if (!_[name]) {
            _.mixin(obj);
        } else {
            throw Error('mixin lodash !!' + name)
        }
    }

    // Array & Collection

    /**
     * 确保对象是数组
     * @function ensureArray
     * @param {Object|Array} list - 数组
     * @memberOf external:Lodash
     * @return Array
     */
    mixinIt('ensureArray', function (list) {
        if (list == null) return [];
        if (_.isObject(list) && !_.isArray(list)) {
            list = [list];
        }
        return list;
    });

    /**
     * 映射数组或单个对象
     * @function mapArrayOrSingle
     * @param {Object|Array} obj - 数组或对象
     * @param {Function} iteratee - 映射函数
     * @memberOf external:Lodash
     * @return Array|Object
     */
    mixinIt('mapArrayOrSingle', function (obj, iteratee) {
        var isArray = _.isArray(obj);
        if (!isArray) { obj = [obj]; }

        var result = _.map(obj, iteratee);
        return isArray ? result : result[0];
    })



    // Object

    /**
     * 安全调用，对象为空也不会报错
     * @function safeInvoke
     * @param {Object} context - 对象
     * @param {string} method - 方法名
     * @param {...*} params - 参数
     * @memberOf external:Lodash
     * @return {*} - 调用结果
     */
    mixinIt('safeInvoke', function (context, method, params) {
        if(context && context[method]){
            var args = Array.prototype.slice.call(arguments, 2);
            return context[method].apply(context, args);
        }
        return null;
    })


    // String

    /**
     * 将字符串转换成反驼峰表示
     * @function decamelize
     * @param {string} str - 字符串
     * @param {string} sep - 分隔符
     * @return {string}
     * @memberOf external:Lodash
     */
    mixinIt('decamelize', function (str, sep) {
        if (typeof str !== 'string') {
            throw new TypeError('Expected a string');
        }

        sep = typeof sep === 'undefined' ? '_' : sep;

        return str
            .replace(/([a-z\d])([A-Z])/g, '$1' + sep + '$2')
            .replace(/([A-Z]+)([A-Z][a-z\d]+)/g, '$1' + sep + '$2')
            .toLowerCase();
    })

    /**
     * 标准化字符串路径（url）
     * @function normalizePath
     * @param {string} path - 字符串
     * @return {string}
     * @memberOf external:Lodash
     */
    mixinIt('normalizePath', function (path) {
        return path.replace(/(\/+)/g, '/').replace('http:/', 'http://');
    })


    // Function

    // thx: https://github.com/goatslacker/get-parameter-names/blob/master/index.js
    var COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    var DEFAULT_PARAMS = /=[^,]+/mg;
    var FAT_ARROWS = /=>.*$/mg;

    /**
     * 获取函数参数名
     * @function getParameterNames
     * @param {Function} fn - 函数
     * @return {Array.<string>}
     * @memberOf external:Lodash
     * @example
     *   function foo(bar, baz) {
     *     return bar + baz
     *   }
     *
     *   _.getParameterNames(foo) // = ['bar', 'baz']
     */
    mixinIt('getParameterNames', function (fn) {
        fn || (fn = this);
        var code = fn.toString()
          .replace(COMMENTS, '')
          .replace(FAT_ARROWS, '')
          .replace(DEFAULT_PARAMS, '');

        var result = code.slice(code.indexOf('(') + 1, code.indexOf(')'))
          .match(/([^\s,]+)/g);

        return result === null ? [] : result;
    })

    // Deferred

    mixinIt('whenAjax', function () {
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
    })


    mixinIt('doneDeferred', function (result) {
        var dfd = $.Deferred();
        dfd.resolve(result);
        return dfd.promise();
    })

    mixinIt('failDeferred', function () {
        var dfd = $.Deferred();
        dfd.reject();
        return dfd.promise();
    })


    return _;
});
