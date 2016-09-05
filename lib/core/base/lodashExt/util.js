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

    mixinIt('ensureArray', function (list) {
        if (list == null) return [];
        if (_.isObject(list) && !_.isArray(list)) {
            list = [list];
        }
        return list;
    })

    // 将数据转换成另一种形式
    mixinIt('mapArrayOrSingle', function (obj, iteratee) {
        var isArray = _.isArray(obj);
        if (!isArray) { obj = [obj]; }

        var result = _.map(obj, iteratee);
        return isArray ? result : result[0];
    })



    // Object

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
     * @function
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

    mixinIt('normalizePath', function (path) {
        return path.replace(/(\/+)/g, '/').replace('http:/', 'http://');
    })

    /**
     * 查询字符串转换成JSON对象
     */
    mixinIt('qsToJSON', function (str) {
        str || (str = location.search.slice(1));
        var pairs = str.split('&');

        var result = {};
        pairs.forEach(function (pair) {
            pair = pair.split('=');
            result[pair[0]] = decodeURIComponent(pair[1] || '');
        });

        return JSON.parse(JSON.stringify(result));
    })


    // Function

    // thx: https://github.com/goatslacker/get-parameter-names/blob/master/index.js
    var COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    var DEFAULT_PARAMS = /=[^,]+/mg;
    var FAT_ARROWS = /=>.*$/mg;

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
