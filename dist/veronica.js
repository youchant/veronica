/*!
 * Veronica v2.0.0-alpha
 *
 * http://gochant.github.io/veronica
 *
 * Copyright (c) 2016 gochant
 * Released under the MIT license
 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD.
        define(['jquery', 'lodash'], factory);
    } else {
        // Browser globals
        root.veronica = factory(root.$, root._);
    }
}(this, function ($, dialog) {


/**
 * @license almond 0.3.2 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, http://github.com/requirejs/almond/LICENSE
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part, normalizedBaseParts,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name) {
            name = name.split('/');
            lastIndex = name.length - 1;

            // If wanting node ID compatibility, strip .js from end
            // of IDs. Have to do this here, and not in nameToUrl
            // because node allows either .js or non .js to map
            // to same file.
            if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
            }

            // Starts with a '.' so need the baseName
            if (name[0].charAt(0) === '.' && baseParts) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that 'directory' and not name of the baseName's
                //module. For instance, baseName of 'one/two/three', maps to
                //'one/two/three.js', but we want the directory, 'one/two' for
                //this normalization.
                normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                name = normalizedBaseParts.concat(name);
            }

            //start trimDots
            for (i = 0; i < name.length; i++) {
                part = name[i];
                if (part === '.') {
                    name.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    // If at the start, or previous value is still ..,
                    // keep them so that when converted to a path it may
                    // still work when converted to a path, even though
                    // as an ID it is less than ideal. In larger point
                    // releases, may be better to just kick out an error.
                    if (i === 0 || (i === 1 && name[2] === '..') || name[i - 1] === '..') {
                        continue;
                    } else if (i > 0) {
                        name.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
            //end trimDots

            name = name.join('/');
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {
        if (typeof name !== 'string') {
            throw new Error('See almond README: incorrect module build, no module name');
        }

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../node_modules/almond/almond", function(){});

/**
 * 修改的 klass 类
 * 修改内容：
 *   - 添加继承相同属性的深拷贝合并
 *   - 添加继承函数的可选操作（可扩展可覆盖）
 *   -
 */


!function (name, context, definition) {
    if (typeof define == 'function') define('base/class',definition)
    else if (typeof module != 'undefined') module.exports = definition()
    else context[name] = definition()
}('klass', this, function () {


    // Utility - DeepExtend
    // ---------------------------

    function isSpecificValue(val) {
        return (
            val instanceof Date
            || val instanceof RegExp
        ) ? true : false;
    }

    function cloneSpecificValue(val) {
        if (val instanceof Buffer) {
            var x = new Buffer(val.length);
            val.copy(x);
            return x;
        } else if (val instanceof Date) {
            return new Date(val.getTime());
        } else if (val instanceof RegExp) {
            return new RegExp(val);
        } else {
            throw new Error('Unexpected situation');
        }
    }

    /**
     * Recursive cloning array.
     */
    function deepCloneArray(arr) {
        var clone = [];
        arr.forEach(function (item, index) {
            if (typeof item === 'object' && item !== null) {
                if (Array.isArray(item)) {
                    clone[index] = deepCloneArray(item);
                } else if (isSpecificValue(item)) {
                    clone[index] = cloneSpecificValue(item);
                } else {
                    clone[index] = deepExtend({}, item);
                }
            } else {
                clone[index] = item;
            }
        });
        return clone;
    }

    /**
     * Extening object that entered in first argument.
     *
     * Returns extended object or false if have no target object or incorrect type.
     *
     * If you wish to clone source object (without modify it), just use empty new
     * object as first argument, like this:
     *   deepExtend({}, yourObj_1, [yourObj_N]);
     */
    var deepExtend = function (/*obj_1, [obj_2], [obj_N]*/) {
        if (arguments.length < 1 || typeof arguments[0] !== 'object') {
            return false;
        }

        if (arguments.length < 2) {
            return arguments[0];
        }

        var target = arguments[0];

        // convert arguments to array and cut off target object
        var args = Array.prototype.slice.call(arguments, 1);

        var val, src, clone;

        args.forEach(function (obj) {
            // skip argument if it is array or isn't object
            if (typeof obj !== 'object' || Array.isArray(obj)) {
                return;
            }

            Object.keys(obj).forEach(function (key) {
                src = target[key]; // source value
                val = obj[key]; // new value

                // recursion prevention
                if (val === target) {
                    return;

                    /**
                     * if new value isn't object then just overwrite by new value
                     * instead of extending.
                     */
                } else if (typeof val !== 'object' || val === null) {
                    target[key] = val;
                    return;

                    // just clone arrays (and recursive clone objects inside)
                } else if (Array.isArray(val)) {
                    target[key] = deepCloneArray(val);
                    return;

                    // custom cloning and overwrite for specific objects
                } else if (isSpecificValue(val)) {
                    target[key] = cloneSpecificValue(val);
                    return;

                    // overwrite by new value if source isn't object or array
                } else if (typeof src !== 'object' || src === null || Array.isArray(src)) {
                    target[key] = deepExtend({}, val);
                    return;

                    // source value and new value is objects both, extending...
                } else {
                    target[key] = deepExtend(src, val);
                    return;
                }
            });
        });

        return target;
    }


    //
    // ----------------------------

    var context = this;
    var f = 'function';
    var fnTest = /xyz/.test(function () { xyz }) ? /\bsupr\b/ : /.*/;

    /**
     * 创建类
     * @param {Object|function} ctor - 构造器或初始化对象
     * @returns {veronica.BaseClass}
     * @memberOf veronica
     */
    function createClass(ctor) {
        var context = isFn(ctor) ? ctor : function () { };
        return extend.call(context, ctor, 1);
    }

    function isFn(o) {
        return typeof o === f
    }

    function wrap(k, fn, supr) {
        return function () {
            var tmp = this.supr
            this.supr = supr.prototype[k]
            var undef = {}.fabricatedUndefined
            var ret = undef
            try {
                ret = fn.apply(this, arguments)
            } finally {
                this.supr = tmp
            }
            return ret
        }
    }

    function mergeMethod(original, newMethod){
        return function () {
            original.apply(this, Array.prototype.slice.call(arguments));
            newMethod.apply(this, Array.prototype.slice.call(arguments));
        }
    }

    // TODO: 这里进行精简
    function processMembers(obj, proto, supr, ext, opt){
        opt || (opt = {});
        opt.merge || (opt.merge = []);
        opt.initPropsMethod || (opt.initPropsMethod = '_initProps');

        if(ext.options){
            deepExtend(obj.options, ext.options);
        }
        if(ext.configs){
            deepExtend(obj, ext.configs);
        }
        if(ext.methods){
            process(proto, ext.methods, supr, opt.merge);
        }

        // 加入运行时属性
        if (ext.props) {
            var propMethods = {};
            var props = ext.props;
            propMethods[opt.initPropsMethod] = function () {
                var me = this;
                for(var name in props){
                    me[name] = props[name];
                }
            };
            process(proto, propMethods, supr, [opt.initPropsMethod])
        }
    }

    function process(what, o, supr, merge) {
        merge || (merge = [])

        for (var k in o) {
            if (o.hasOwnProperty(k)) {
                if (o[k] != null && typeof o[k] === 'object') {
                    // 深拷贝合并对象成员
                    what[k] = deepExtend({}, supr.prototype[k], what[k], o[k])
                } else {
                    var member = o[k]
                    if(isFn(o[k])){
                        if(isFn(supr.prototype[k]) && fnTest.test(o[k])){
                            member = wrap(k, o[k], supr)
                        }

                        if(isFn(what[k]) && merge.indexOf(k) >= 0){
                            // 合并 function
                            member = mergeMethod(what[k], member)
                        }
                    }

                    what[k] = member
                }
            }
        }
    }

    function extend(o, fromSub) {
        // 必须重定义，以避免从以前的类继承
        function noop() { }
        noop.prototype = this.prototype;

        var supr = this;
        var subProto = new noop();  // 子类原型
        var isFunction = isFn(o);
        var _constructor = isFunction ? o : this;
        var _methods = isFunction ? {} : o;

        /**
         * 子类构造函数
         * @class
         * @memberOf veronica
         */
        function BaseClass() {
            // 调用初始化方法
            if (this.initialize) {
                this.initialize.apply(this, arguments);
            }
            else {
                if(!fromSub && isFunction){
                    // 调用父类构造器
                    supr.apply(this, arguments);
                }
                // 调用传入的构造器
                _constructor.apply(this, arguments)
            }
        }

        /**
         * 扩展方法
         * @param {Object} o - 方法对象
         * @param {Array.<string>} merge - 需要进行合并的方法
         * @returns {this}
         * @static
         */
        BaseClass.methods = function (o, merge) {
            process(subProto, o, supr, merge);
            BaseClass.prototype = subProto;
            return this
        };

        BaseClass.methods(_methods);

        BaseClass.prototype.constructor = BaseClass;

        /**
         * 扩展子类
         * @static
         * @example
         *  var Sub = Parent.extend({
         *    initialize: function(){
         *      this.supr()
         *    }
         *  })
         */
        BaseClass.extend = extend;

        /**
         * 添加静态属性/方法
         * @param {Object|string} o - 静态对象/属性名
         * @param {function} [optFn] - 方法
         * @static
         * @example
         *  Component.statics({
         *      'test': function() { }
         *  })
         *  Component.statics('test', function(){ })
         */
        BaseClass.statics = function (o, optFn) {
            if(typeof o == 'string'){
                o = (function () {
                    var obj = {};
                    obj[o] = optFn;
                    return obj
                }());
            }

            process(this, o, supr);
            return this;
        };

        /**
         * 为实例对象添加属性/方法
         * @function
         * @param {Object|string} o - 对象/属性名
         * @param {function} [optFn] - 方法
         * @example
         *  cmp.implement({
         *      'test': function() { }
         *  })
         *  cmp.implement('test', function(){ })
         */
        BaseClass.prototype.implement = BaseClass.statics;

        /**
         * 添加成员
         * @static
         * @param {Object} o - 扩展对象
         * @param {Object} options - 扩展参数
         * @returns {this}
         */
        BaseClass.members = function(o, options){
            processMembers(subProto, subProto, supr, o, options)
            BaseClass.prototype = subProto;
            return this
        };

        return BaseClass;
    }

    var mixins = function(target, ext, options){
        processMembers(target, target, target, ext, options)
    };


    return createClass;
});

define('base/lodashExt/querystring',[
    'lodash',
    '../class'
], function (_, createClass) {
    var qs = {};

    /**
     * 查询字符串的来源
     * @enum QueryStringType
     * @type {number}
     */
    var QueryStringType = {
        /** 浏览器 URL 的查询部分 */
        SEARCH: 0,
        /** 浏览器 URL 的 hash 部分 */
        HASH: 1
    };

    /**
     * 查询字符串处理类
     * @class QueryString
     * @param {QueryStringType} choice - 查询字符串来源
     */
    var QueryString = createClass(function QueryString(choice) {
        if (choice == null) {
            choice = 1
        }
        this.choice = choice;
    }).methods(
        /**@lends QueryString.prototype */
        {
            _qsToJSON: function (str) {
                str || (str = location.search);
                var matches = /([^\?]*)\?([^\?]+)/.exec(str);
                if (matches != null) {
                    str = matches[2];
                }
                var pairs = str.split('&');

                var result = {};
                _.each(pairs, function (pair) {
                    pair = pair.split('=');
                    result[pair[0]] = decodeURIComponent(pair[1] || '');
                });

                return JSON.parse(JSON.stringify(result));
            },
            _updateQueryString: function (uri, key, value) {
                var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
                var separator = uri.indexOf('?') !== -1 ? "&" : "?";
                if (uri.match(re)) {
                    return uri.replace(re, '$1' + key + "=" + value + '$2');
                }
                else {
                    return uri + separator + key + "=" + value;
                }
            },
            /**
             * 获取查询字符串的 url
             * @private
             */
            _getUrl: function () {
                var str = this.choice;
                if (this.choice === 0) {
                    str = window.location.search;
                }
                if (this.choice === 1) {
                    str = window.location.hash;
                }
                return str;
            },

            _setUrl: function (str) {
                if (this.choice === 1) {
                    window.location.hash = str;
                }
                if (this.choice === 0) {
                    window.location.search = str;
                }
            },

            /**
             * 设置
             * @param {string} key
             * @param {Any} value
             */
            set: function (key, value) {
                var str = this._getUrl();
                var me = this;
                if (_.isObject(key)) {
                    _.each(key, function (val, k) {
                        str = me._updateQueryString(str, k, val);
                    });
                } else {
                    str = me._updateQueryString(str, key, value);
                }

                this._setUrl(str);

                return str;
            },

            /**
             * 获取值
             * @param {string} key
             * @returns {string} 结果
             */
            get: function (key) {
                var url = this._getUrl();

                key = key.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
                var regex = new RegExp("[\\?&]" + key + "=([^&#]*)");
                var results = regex.exec(url);

                return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
            },

            /**
             * 整个转换为对象
             * @returns {Object} 结果
             */
            toJSON: function (combineSearch) {
                var url = this._getUrl();
                if (combineSearch == null) {
                    combineSearch = false;
                }
                var obj1, obj2;
                obj1 = this._qsToJSON(url);
                if (combineSearch) {
                    obj2 = this._qsToJSON(window.location.search);
                }

                return _.extend({}, obj2, obj1);
            }
        });

    if (!_.qs) {
        /**
         * 创建查询字符串处理者
         * @name qs
         * @param choice
         * @returns {QueryString}
         * @memberOf external:Lodash
         */
        _.qs = function (choice) {
            return new QueryString(choice);
        }
    }
});

// core
define('base/lodashExt/request',[
    'lodash',
    'jquery'
], function (_, $) {
    // Ajax

    /**
     * 请求
     * @class
     */
    var request = {};

    /**
     * $.get 的包装
     */
    request.get = function (url, data) {
        return $.get(url, data);
    };

    /**
     * 获取JSON（$.getJSON）
     */
    request.getJSON = function (url, data) {
        return $.getJSON(url, data);
    };

    /**
     * 传入复杂对象进行 GET 请求（需要后台进行JSON字符串的反序列化）
     * @param {string} url - 地址
     * @param {Object} data - 数据
     * @param {Object} [options] - 选项
     */
    request.getComplex = function (url, data, options) {
        options || (options = {});

        return $.ajax($.extend({
            url: url,
            type: 'GET',
            contentType: "application/json",
            data: JSON.stringify(data)
        }, options));
    };

    /**
     * POST 简单对象
     * @param {string} url - 请求路径
     * @param {Object} data - 数据
     * @returns {Deferred}
     */
    request.post = function (url, data) {
        return $.post(url, data);
    }

    /**
     * POST 复杂对象（使某些后台处理程序（如 ASP.NET MVC）能够正常进行数据绑定）
     * @param {string} url - 地址
     * @param {Object} data - 数据
     * @param {Object} [options] - 选项
     */
    request.postComplex = function (url, data, options) {
        return $.ajax($.extend({
            url: url,
            type: 'POST',
            contentType: "application/json",
            dataType: 'json',
            data: JSON.stringify(data)
        }, options));
    }

    /**
     * 多个请求捆绑发送
     * @param {...string|Object} url 或 延迟对象
     * @returns {Deferred}
     */
    request.getBundle = function () {
        var urls = Array.prototype.slice.call(arguments);
        var requests = $.map(urls, function (item) {
            if (_.isString(item)) {
                return $.get(item);
            } else {
                return item.done ? item : $.get(item.url, item.data);
            }
        });

        return _.whenAjax.apply(_, requests);
    }

    var isChromeFrame = function () {
        var ua = navigator.userAgent.toLowerCase();
        return ua.indexOf('chrome') >= 0 && window.externalHost;
    };

    /**
     * 下载文件
     * @param {Object} settings - 配置对象 eg: { url: '', data: [object] }
     * @returns {}
     */
    request.download = function (settings) {
        settings || (settings = {}); //eg: { url: '', data: [object] }
        if (settings.url == undefined) {
            return;
        }
        if (!_.isString(settings.data)) {
            settings.data = $.param(settings.data, true);
        }
        if (!isChromeFrame()) {  // 当使用ChromeFrame时，采用新窗口打开
            if ($('#global-download-iframe').length === 0) {
                $('<iframe id="global-download-iframe" src="" style="width:0;height:0;display: inherit;border:0;" \>').appendTo(document.body);
            }
            $('#global-download-iframe').attr('src', settings.url + '?' + settings.data);
        } else {
            window.open(settings.url + '?' + settings.data, "newwindow");
        }
    };

    if (!_.request) {
        /**
         * 请求
         * @name request
         * @type {request}
         * @memberOf external:Lodash
         */
        _.request = request;
    }

    return _;
});

// core
define('base/lodashExt/util',[
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

define('base/lodashExt/index',[
    'lodash',
    './querystring',
    './request',
    './util'
], function (_) {

    'use strict';

    /**
     * @external Lodash
     * @see {@link https://lodash.com/ Lodash}
     */

    /**
     * JS语言核心工具套件
     * @name _
     * @type {external:Lodash}
     * @memberOf veronica
     */
    return _;
});

define('base/Observable',[
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


define('base/logger',[], function () {
    'use strict';

    // thx h5-boilerplate
    // from: https://github.com/h5bp/html5-boilerplate/blob/master/src/js/plugins.js

    (function () {
        var method;
        var noop = function () { };
        var methods = [
            'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
            'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
            'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
            'timeline', 'timelineEnd', 'timeStamp', 'trace', 'warn'
        ];
        var length = methods.length;
        var console = (window.console = window.console || {});

        while (length--) {
            method = methods[length];

            // Only stub undefined methods.
            if (!console[method]) {
                console[method] = noop;
            }
        }
    }());

    var noop = function () { };
    var DEFAULT_NAME = 'veronica';
    var console = window.console || {};

    var isIE8 = function _isIE8() {
        return (!Function.prototype.bind || (Function.prototype.bind && typeof window.addEventListener === 'undefined')) &&
            typeof console === 'object' &&
            typeof console.log === 'object';
    };

    /**
     * @classdesc 浏览器控制台日志对象
     * @class Logger
     * @memberOf veronica
     */
    function Logger(name) {
        this.name = name || DEFAULT_NAME;
        this._log = noop;
        this._warn = noop;
        this._error = noop;
        this._info = noop;
        return this;
    }

    /**@lends veronica.Logger#*/
    var proto = {
        constructor: Logger,
        /**
         * 设置名称
         * @param {string} name - 名称
         * @returns {Logger}
         */
        setName: function (name) {
            name || (name = DEFAULT_NAME);
            this.name = name;
            return this;
        },
        /**
         * 启用
         * @returns {Logger}
         */
        enable: function () {
            this._log = (console.log || noop);
            this._info = (console.info || this._info);
            this._warn = (console.warn || this._log);
            this._error = (console.error || this._log);

            if (Function.prototype.bind && typeof console === "object") {
                var logFns = ["log", "warn", "error"];
                for (var i = 0; i < logFns.length; i++) {
                    console[logFns[i]] = Function.prototype.call.bind(console[logFns[i]], console);
                }
            }

            return this;
        },
        _write: function (output, args) {
            var parameters = Array.prototype.slice.call(args);
            parameters.unshift(this.name + ":");
            if (isIE8()) {
                output(parameters.join(' '));
            } else {
                output.apply(console, parameters);
            }
        },
        /**
         * 记录日志信息
         */
        log: function () {
            this._write(this._log, arguments);
        },
        /**
         * 记录警告信息
         */
        warn: function () {
            this._write(this._warn, arguments);
        },
        /**
         * 记录错误信息
         */
        error: function () {
            this._write(this._error, arguments);
        },
        /**
         * 记录普通消息
         */
        info: function () {
            this._write(this._info, arguments);
        },
        /**
         * 记录时间
         * @param {string} name - 时间
         * @param {string} tag - 开始计时时不传，结束计时时传 'End'
         */
        time: function (name, tag) {
            tag || (tag = '');
            console['time' + tag](name);
        }
    };

    Logger.prototype = proto;

    return Logger;
});

define('base/observable',[
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

// Router
// borrow frome Backbone 1.1.2
define('base/history',[
    './observable',
    'jquery'
], function (Observable, $) {
    'use strict';

    // Cached regex for stripping a leading hash/slash and trailing space.
    var routeStripper = /^[#\/]|\s+$/g;

    // Cached regex for stripping leading and trailing slashes.
    var rootStripper = /^\/+|\/+$/g;

    // Cached regex for detecting MSIE.
    var isExplorer = /msie [\w.]+/;

    // Cached regex for removing a trailing slash.
    var trailingSlash = /\/$/;

    // Cached regex for stripping urls of hash.
    var pathStripper = /#.*$/;

    // Handles cross-browser history management, based on either
    // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
    // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
    // and URL fragments. If the browser supports neither (old IE, natch),
    // falls back to polling.

    /**
     * 历史管理
     * @class
     * @augments {veronica.Observable}
     * @memberOf veronica
     * @see {@link http://backbonejs.org/#History Backbone.History}
     */
    // Set up all inheritable **Backbone.History** properties and methods.
    var History = Observable.extend({
        initialize: function () {
            this.handlers = [];
            _.bindAll(this, 'checkUrl');

            // Ensure that `History` can be used outside of the browser.
            if (typeof window !== 'undefined') {
                this.location = window.location;
                this.history = window.history;
            }
        },
        // The default interval to poll for hash changes, if necessary, is
        // twenty times a second.
        interval: 50,

        // Are we at the app root?
        atRoot: function () {
            return this.location.pathname.replace(/[^\/]$/, '$&/') === this.root;
        },

        // Gets the true hash value. Cannot use location.hash directly due to bug
        // in Firefox where location.hash will always be decoded.
        getHash: function (window) {
            var match = (window || this).location.href.match(/#(.*)$/);
            return match ? match[1] : '';
        },

        // Get the cross-browser normalized URL fragment, either from the URL,
        // the hash, or the override.
        getFragment: function (fragment, forcePushState) {
            if (fragment == null) {
                if (this._hasPushState || !this._wantsHashChange || forcePushState) {
                    fragment = decodeURI(this.location.pathname + this.location.search);
                    var root = this.root.replace(trailingSlash, '');
                    if (!fragment.indexOf(root)) fragment = fragment.slice(root.length);
                } else {
                    fragment = this.getHash();
                }
            }
            return fragment.replace(routeStripper, '');
        },

        // Start the hash change handling, returning `true` if the current URL matches
        // an existing route, and `false` otherwise.
        start: function (options) {
            if (History.started) throw new Error("Backbone.history has already been started");
            History.started = true;

            // Figure out the initial configuration. Do we need an iframe?
            // Is pushState desired ... is it available?
            this.options = _.extend({root: '/'}, this.options, options);
            this.root = this.options.root;
            this._wantsHashChange = this.options.hashChange !== false;
            this._wantsPushState = !!this.options.pushState;
            this._hasPushState = !!(this.options.pushState && this.history && this.history.pushState);
            var fragment = this.getFragment();
            var docMode = document.documentMode;
            var oldIE = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

            // Normalize root to always include a leading and trailing slash.
            this.root = ('/' + this.root + '/').replace(rootStripper, '/');

            if (oldIE && this._wantsHashChange) {
                var frame = $('<iframe src="javascript:0" tabindex="-1">');
                this.iframe = frame.hide().appendTo('body')[0].contentWindow;
                this.navigate(fragment);
            }

            // Depending on whether we're using pushState or hashes, and whether
            // 'onhashchange' is supported, determine how we check the URL state.
            if (this._hasPushState) {
                $(window).on('popstate', this.checkUrl);
            } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
                $(window).on('hashchange', this.checkUrl);
            } else if (this._wantsHashChange) {
                this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
            }

            // Determine if we need to change the base url, for a pushState link
            // opened by a non-pushState browser.
            this.fragment = fragment;
            var loc = this.location;

            // Transition from hashChange to pushState or vice versa if both are
            // requested.
            if (this._wantsHashChange && this._wantsPushState) {

                // If we've started off with a route from a `pushState`-enabled
                // browser, but we're currently in a browser that doesn't support it...
                if (!this._hasPushState && !this.atRoot()) {
                    this.fragment = this.getFragment(null, true);
                    this.location.replace(this.root + '#' + this.fragment);
                    // Return immediately as browser will do redirect to new url
                    return true;

                    // Or if we've started out with a hash-based route, but we're currently
                    // in a browser where it could be `pushState`-based instead...
                } else if (this._hasPushState && this.atRoot() && loc.hash) {
                    this.fragment = this.getHash().replace(routeStripper, '');
                    this.history.replaceState({}, document.title, this.root + this.fragment);
                }

            }

            if (!this.options.silent) return this.loadUrl();
        },

        // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
        // but possibly useful for unit testing Routers.
        stop: function () {
            $(window).off('popstate', this.checkUrl).off('hashchange', this.checkUrl);
            if (this._checkUrlInterval) clearInterval(this._checkUrlInterval);
            History.started = false;
        },

        // Add a route to be tested when the fragment changes. Routes added later
        // may override previous routes.
        route: function (route, callback) {
            this.handlers.unshift({route: route, callback: callback});
        },

        // Checks the current URL to see if it has changed, and if it has,
        // calls `loadUrl`, normalizing across the hidden iframe.
        checkUrl: function (e) {
            var current = this.getFragment();
            if (current === this.fragment && this.iframe) {
                current = this.getFragment(this.getHash(this.iframe));
            }
            if (current === this.fragment) return false;
            if (this.iframe) this.navigate(current);
            this.loadUrl();
        },

        // Attempt to load the current URL fragment. If a route succeeds with a
        // match, returns `true`. If no defined routes matches the fragment,
        // returns `false`.
        loadUrl: function (fragment) {
            fragment = this.fragment = this.getFragment(fragment);
            return _.some(this.handlers, function (handler) {
                if (handler.route.test(fragment)) {
                    handler.callback(fragment);
                    return true;
                }
            });
        },

        // Save a fragment into the hash history, or replace the URL state if the
        // 'replace' option is passed. You are responsible for properly URL-encoding
        // the fragment in advance.
        //
        // The options object can contain `trigger: true` if you wish to have the
        // route callback be fired (not usually desirable), or `replace: true`, if
        // you wish to modify the current URL without adding an entry to the history.
        navigate: function (fragment, options) {
            if (!History.started) return false;
            if (!options || options === true) options = {trigger: !!options};

            var url = this.root + (fragment = this.getFragment(fragment || ''));

            // Strip the hash for matching.
            fragment = fragment.replace(pathStripper, '');

            if (this.fragment === fragment) return;
            this.fragment = fragment;

            // Don't include a trailing slash on the root.
            if (fragment === '' && url !== '/') url = url.slice(0, -1);

            // If pushState is available, we use it to set the fragment as a real URL.
            if (this._hasPushState) {
                this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

                // If hash changes haven't been explicitly disabled, update the hash
                // fragment to store history.
            } else if (this._wantsHashChange) {
                this._updateHash(this.location, fragment, options.replace);
                if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
                    // Opening and closing the iframe tricks IE7 and earlier to push a
                    // history entry on hash-tag change.  When replace is true, we don't
                    // want this.
                    if (!options.replace) this.iframe.document.open().close();
                    this._updateHash(this.iframe.location, fragment, options.replace);
                }

                // If you've told us that you explicitly don't want fallback hashchange-
                // based history, then `navigate` becomes a page refresh.
            } else {
                return this.location.assign(url);
            }
            if (options.trigger) return this.loadUrl(fragment);
        },

        // Update the hash location, either replacing the current entry, or adding
        // a new one to the browser history.
        _updateHash: function (location, fragment, replace) {
            if (replace) {
                var href = location.href.replace(/(javascript:|#).*$/, '');
                location.replace(href + '#' + fragment);
            } else {
                // Some browsers require that `hash` contains a leading #.
                location.hash = '#' + fragment;
            }
        }

    });

    // Has the history handling already been started?
    History.started = false;

    return History;

});

define('base/index',[
    'jquery',
    './lodashExt/index',
    './class',
    './Observable',
    './logger',
    './history'
], function ($, _, createClass, Observable, Logger, History) {

    'use strict';

    /**
     * veronica 核心对象
     * @namespace veronica
     */
    var baseLib = {
        _: _,
        /**
         * DOM/Ajax/Promise 工具套件
         * @memberOf veronica
         */
        $: $,
        createClass: createClass,
        Observable: Observable,
        Logger: Logger,
        History: History,
        /**
         * 浏览器历史实例
         * @type {veronica.History}
         * @memberOf veronica
         */
        history: new History
    };

    return baseLib;
});

define('framework/appPart',[
    '../base/index'
], function (baseLib) {
    var _ = baseLib._;
    var $ = baseLib.$;
    var Observable = baseLib.Observable;

    var AppPart = Observable.extend(/** @lends veronica.AppPart# */{
        /**
         * 应用程序部件
         * @constructs AppPart
         * @augments veronica.Observable
         * @param {Object} options - 配置参数
         * @memberOf veronica
         */
        initialize: function (options) {
            options || (options = {});
            this.supr(options);
            this.options = $.extend(true, {}, this.options, options);
            this._app = options.app;
        },
        /**
         * 获取应用程序
         * @returns {Application} - 所属应用程序
         */
        app: function () {
            return this._app || this;
        },
        /**
         * 获取日志记录器
         * @returns {Logger} - 日志记录器
         */
        logger: function () {
            return this.get('part:app:logger');
        },
        /**
         * 获取组件加载器
         * @returns {Loader} - 加载器
         */
        loader: function () {
            return this.get('part:app:loader').get();
        }
    });

    return AppPart;
});

define('framework/appProvider',[
    '../base/index',
    './appPart'
], function (baseLib, AppPart) {

    var _ = baseLib._;
    var extend = _.extend;


    var AppProvider = AppPart.extend(/** @lends veronica.AppProvider# */{
        /**
         * 应用程序提供者容器部件
         * @class AppProvider
         * @param {Object} options - 配置参数
         * @augments veronica.AppPart
         * @memberOf veronica
         */
        initialize: function (options) {
            this.supr(options);
            this._pool = {};
            this._defaultKey = 'default';
            this._nested = false;
        },
        /**
         * 添加提供者时，进行预处理的钩子
         * @param data
         * @returns {*}
         * @private
         */
        _preprocess: function (data) {
            return data;
        },
        /**
         * 设置默认名称
         * @param {string} name - 名称
         */
        setDefault: function (name) {
            this._defaultKey = name;
        },
        /**
         * 获取提供者
         * @param {string} name - 提供者名称
         * @returns {object} - 提供者对象
         */
        get: function (name) {
            name || (name = this._defaultKey);
            var r = this._nested ? _.get(this._pool, name) :
                this._pool[name];
            return r;
        },
        /**
         * 添加提供者
         * @param {string} name - 名称，在这个容器内必须唯一
         * @param {Object} value - 提供者对象
         * @param {Object} [options] - 添加时参数
         * @param {boolean} [options.force=false] - 遇到重复名称时，是否强制添加覆盖
         * @param {string} [options.inherit='default'] - 所继承的提供者的名称
         */
        add: function add(name, value, options) {
            var me = this;
            // 按照 key-value 获取
            if (_.isObject(name)) {
                options = value;
                _.each(name, function (val, key) {
                    add.call(me, key, val, options);
                });
            } else {
                options = extend({
                    force: false,
                    inherit: 'default'
                }, options);
                var exists = this.get(name);
                if (!exists || options.force === true) {
                    if (typeof value !== 'string') {
                        var parent = this.get(options.inherit);
                        if (!_.isFunction(value)) {
                            value = extend({}, parent, value);
                        }
                    }
                    value.__id = name;
                    value = me._preprocess(value);
                    this._pool[name] = value;
                }
            }
        },
        /**
         * 判断提供者是否存在
         * @param {string} name - 提供者名称
         * @returns {boolean} - 是否存在
         */
        has: function (name) {
            return typeof this._pool[name] !== 'undefined';
        },
        /**
         * 移除提供者
         * @param {string} name - 提供者名称
         */
        remove: function (name) {
            this._pool[name] = null;
            delete this._pool[name];
        }
    });

    return AppProvider;
});

define('framework/router',[
    '../base/index',
    './appPart'
], function (baseLib, AppPart) {
    'use strict';

    var _ = baseLib._;

    // thx: Backbone 1.1.2

    var optionalParam = /\((.*?)\)/g;
    var namedParam = /(\(\?)?:\w+/g;
    var splatParam = /\*\w+/g;
    var escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;


    var Router = AppPart.extend(/** @lends Router# */ {
        /**
         * 前端路由
         * @class Router
         * @param options
         * @augments veronica.AppPart
         * @see {@link http://backbonejs.org/#Router Backbone.Router}
         */
        initialize: function (options) {
            options || (options = {});
            this.supr(options);
            if (options.routes) this.routes = options.routes;
            this.history = options.history || baseLib.history;
            this._bindRoutes();
        },
        // Manually bind a single named route to a callback. For example:
        //
        //     this.route('search/:query/p:num', 'search', function(query, num) {
        //       ...
        //     });
        //
        route: function (route, name, callback) {
            var me = this;
            if (!_.isRegExp(route)) route = this._routeToRegExp(route);
            if (_.isFunction(name)) {
                callback = name;
                name = '';
            }
            if (!callback) callback = this[name];
            var router = this;
            this.history.route(route, function (fragment) {
                var args = router._extractParameters(route, fragment);
                router.execute(callback, args);
                router.trigger.apply(router, ['route:' + name].concat(args));
                router.trigger('route', name, args);
                me.history.trigger('route', router, name, args);
            });
            return this;
        },

        // Execute a route handler with the provided parameters.  This is an
        // excellent place to do pre-route setup or post-route cleanup.
        execute: function (callback, args) {
            if (callback) callback.apply(this, args);
        },

        // Simple proxy to `Backbone.history` to save a fragment into the history.
        navigate: function (fragment, options) {
            this.history.navigate(fragment, options);
            return this;
        },

        // Bind all defined routes to `Backbone.history`. We have to reverse the
        // order of the routes here to support behavior where the most general
        // routes can be defined at the bottom of the route map.
        _bindRoutes: function () {
            if (!this.routes) return;
            this.routes = _.result(this, 'routes');
            var route, routes = _.keys(this.routes);
            while ((route = routes.pop()) != null) {
                this.route(route, this.routes[route]);
            }
        },

        // Convert a route string into a regular expression, suitable for matching
        // against the current location hash.
        _routeToRegExp: function (route) {
            route = route.replace(escapeRegExp, '\\$&')
                         .replace(optionalParam, '(?:$1)?')
                         .replace(namedParam, function (match, optional) {
                             return optional ? match : '([^/?]+)';
                         })
                         .replace(splatParam, '([^?]*?)');
            return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
        },

        // Given a route, and a URL fragment that it matches, return the array of
        // extracted decoded parameters. Empty or unmatched parameters will be
        // treated as `null` to normalize cross-browser behavior.
        _extractParameters: function (route, fragment) {
            var params = route.exec(fragment).slice(1);
            return _.map(params, function (param, i) {
                // Don't decode the search params.
                if (i === params.length - 1) return param || null;
                return param ? decodeURIComponent(param) : null;
            });
        }
    })

    return Router;
});

define('framework/appRouter',[
    '../base/index',
    './router'
], function (baseLib, Router) {
    var _ = baseLib._;
    var throttle = _.throttle;

    var AppRouter = Router.extend(/** @lends veronica.AppRouter# */{
        options: {
            homePage: 'home'
        },
        /**
         * 应用程序路由对象
         * @class AppRouter
         * @param {Object} options - 参数
         * @augments Router
         * @memberOf veronica
         */
        initialize: function (options) {
            options || (options = {});
            this.supr(options);
            this._preParams = undefined;
        },
        routes: {
            '(/)': 'entry',
            '(/)?*params': 'entry',
            'page=*page': 'openPage',
            '(/)*page': 'openPage',
            '(/)*page?*params': 'openPage',
            'widget/:widget@:context': 'executeWidget'
        },
        entry: function (params) {
            this._openPage(this.options.homePage, params);
        },
        _openPage: function (page, params) {
            var app = this.app();
            var me = this;
            var sameParams = this._preParams === params;
            this._preParams = params;

            // 更新查询字符串
            if (app.part('page').isCurrent(page)) {
                if (!sameParams) {
                    app.pub('qs-changed', _.qs(params).toJSON());
                } else {
                    return;
                }
            }
            me._changePage(page, params);
        },
        _changePage: _.throttle(function (page, params) {
            var app = this.app();
            app.part('page').change(page, params);
        }, 500),
        execute: function (name, context) {
            var app = this.app();
            app.part('component').start({
                initializer: name,
                options: {
                    _context: context || 'default',
                    el: '.v-widget-root'
                }
            });
        },

        openPage: function (page, params) {
            this._openPage(page, params);
        }
    })

    return AppRouter;
});

define('framework/layoutManager',[
    '../base/index',
    './appProvider'
], function (baseLib, AppProvider) {

    'use strict';

    var SCAFFOLD_LAYOUT_NAME = 'scaffold';
    var _ = baseLib._;

    /**
     * @typedef Layout
     * @property {string} [html] - 布局的HTML
     * @property {string} [url] - 获取布局的地址
     */

    /**
     * 布局改变前
     * @event Application#layoutChanging
     * @param {Object} e - 结果
     * @param {string} e.name - 布局名称
     * @param {jQueryObject} e.root - 布局根节点
     */

    /**
     * 布局改变后
     * @event Application#layoutChanged
     * @param {Object} e
     * @param {string} e.name - 布局名称
     */

    var LayoutManager = AppProvider.extend(/** @lends veronica.LayoutManager# */{
        /**
         * @typedef LayoutManagerOptions
         * @property {string} [rootNode='.v-layout-root'] - 布局根节点选择器
         */
        options: {
            rootNode: '.v-layout-root'
        },
        /**
         * 布局管理器
         * @constructs LayoutManager
         * @param {LayoutManagerOptions} options
         * @augments veronica.AppProvider
         * @memberOf veronica
         * @example
         *   app.layout.add({
         *     'admin': {
         *        html: '<div class="v-render-body"></div>'
         *     }
         *   });
         * */
        initialize: function(options){
            this.supr(options);
        },
        /**
         * 预处理
         * @param data
         * @returns {*}
         * @private
         */
        _preprocess: function (data) {
            if (_.isString(data)) {
                data = {
                    html: data
                };
            }
            return data;
        },
        /**
         * 获取布局根元素
         * @returns {*|jQuery|HTMLElement}
         * @private
         */
        _getLayoutRoot: function () {
            var $el = $(this.options.rootNode);
            if ($el.length === 0) {
                $el = $('body');
            }
            return $el;
        },
        /**
         * 改变布局
         * @param {string} name - 布局名称
         * @returns {Promise}
         * @fires Application#layoutChanging
         * @fires Application#layoutChanged
         */
        change: function (name) {
            var me = this;
            var app = this.app();
            var dfd = _.doneDeferred();

            var $layoutRoot = me._getLayoutRoot();
            var layout = this.get(name);

            // 找不到布局，则不进行切换
            if (!layout) {
                this.logger().warn('Could not find the layout configuration! layout name: ' + name);
                return _.doneDeferred();
            }

            app.pub('layoutChanging', {
                name: name,
                root: $layoutRoot
            });

            if (layout.url) {
                dfd = $.get(layout.url).done(function (resp) {
                    layout.html = resp;
                });
            }

            dfd.done(function () {
                $layoutRoot.html(layout.html);
                app.pub('layoutChanged', {
                    name: name
                });
            });

            return dfd;
        },
        /**
         * 布局初始化
         */
        init: function () {
            var scaffold = this.get(SCAFFOLD_LAYOUT_NAME);
            if (scaffold.html) {
                $('body').prepend(scaffold.html);
            }
        }
    });

    return LayoutManager;
});

define('framework/pageManager',[
    '../base/index',
    './appProvider'
], function (baseLib, AppProvider) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var each = _.each;
    var flatten = _.flatten;
    var doneDeferred = _.doneDeferred;
    var failDeferred = _.failDeferred;

    /**
     * **消息：** 页面未找到
     * @event Application#pageNotFound
     * @param {string} name - 页面名称
     */

    /**
     * **消息：** 页面加载中
     * @event Application#pageLoading
     * @param {string} name - 页面名称
     */

    /**
     * **消息：** 页面加载完毕
     * @event Application#pageLoaded
     * @param {string} name - 页面名称
     */

    /**
     * @typedef Page
     * @property {string} name - 页面名称
     * @property {string} layout - 布局
     * @property {Array.<ComponentStartConfig>} components - 组件启动配置
     */


    var PageManager = AppProvider.extend(/** @lends veronica.PageManager# */{
        /**
         * @typedef {Object} PageManagerOptions
         * @property {boolean} [autoResolvePage=false] - 当找不到页面配置时，自动解析页面配置
         */
        options: {
            autoResolvePage: false
        },
        /**
         * 页面管理器
         * @constructs PageManager
         * @param {PageManagerOptions} options - 参数
         * @augments veronica.AppProvider
         * @memberOf veronica
         */
        initialize: function (options) {
            this.supr(options);
            this._currPageName = '';
        },
        _build: function (name) {
            var me = this;
            if (me.options.autoResolvePage) {
                var config = {
                    name: name,
                    components: [name]
                };
                me.add(name, config);
                return config;
            }
            return null;
        },
        // 递归获取所有的父级 components 配置
        _getComponentConfigsRecursive: function getConfigs(config, context, result) {
            if (context == null) {
                context = this;
            }
            if (result == null) {
                result = [];
            }
            result.push(config.components);

            each(config.inherits, function (parentName) {
                var config = context.get(parentName);
                result = getConfigs(config, context, result);
            });

            return result;
        },
        _getAllComponentConfigs: function (config) {
            return flatten(this._getComponentConfigsRecursive(config))
        },
        isCurrent: function (pageName) {
            var currName = this.getCurrName();
            return currName === 'default' || currName === pageName;
        },
        /**
         * 获取当前页面名称
         * @returns {string}
         */
        getCurrName: function () {
            return this._currPageName;
        },
        _setCurrName: function (name) {
            this._currPageName = name;
        },
        _changeLayout: function (layout) {
            var app = this.app();
            var layoutManager = app.part('layout');
            var currPageName = this.getCurrName();
            var currPageConfig = this.get(currPageName);
            if (currPageName === '' || currPageConfig && currPageConfig.layout !== layout) {
                return layoutManager.change(layout);
            }
            return doneDeferred();
        },
        _load: function (configs, pageName) {
            var app = this.app();
            var cmpManager = app.part('component');
            return cmpManager.start(configs, pageName).done(function () {
                // 切换页面后进行垃圾回收
                cmpManager.recycle();
            });
        },
        /**
         * 获取（解决）页面
         * @param {string} name - 页面名称
         * @returns {Promise.<Page>} - 页面
         */
        resolve: function (name) {
            var config = this.get(name);
            var me = this;
            if (!config) {
                config = me._build(name);
            }
            if (config) {
                config.components = me._getAllComponentConfigs(config);
            }

            return config ? doneDeferred(config) : failDeferred();
        },
        /**
         * 改变页面
         * @param {string} name - 页面名称
         * @fires Application#pageNotFound
         * @fires Application#pageLoading
         * @fires Application#layoutChanged
         * @fires Application#pageLoaded
         */
        change: function (name, params) {
            var me = this;
            var app = this.app();
            me.resolve(name).done(function (config) {
                me._changeLayout(config.layout).done(function () {
                    app.pub('pageLoading', name);
                    me._load(config.components, name).then(function () {
                        me._setCurrName(name);
                        app.pub('pageLoaded', name);
                    });
                });
            }).fail(function () {
                app.pub('pageNotFound', name);
            });
        },
        active: function (name) {
            if (name) {
                return this.change(name);
            } else {
                name = this.getCurrName();
            }
            return name;
        }
    });

    return PageManager;
});

define('component/meta',[
    '../base/index'
], function (baseLib) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var typeNamePattern = /^(.*)\:(.*)/;
    var listenPattern = /^(.*)\:(.*)/;
    var partPattern = /^(.*?)\:(.*)/;

    return {
        methods: /** @lends Component# */{
            /**
             * 获取，`万能方法`
             * @param {string} expr - 表达式
             * @returns {*}
             * @example
             *  this.get('vm:text')
             *  this.get('ui:.grid')
             *  this.get('dom:#selector')
             *  this.get('cmp:childComponent')
             *  this.get('part:viewEngine')
             */
            get: function (expr) {
                var match = partPattern.exec(expr);
                var type = match[1];
                var name = match[2];

                if (type === 'vm') {
                    return this.model(name);
                }
                if (type === 'ui') {
                    return this.ui(name);
                }
                if (type === 'dom') {
                    return this.$(name);
                }
                if (type === 'cmp') {
                    var child = this._findChild(name);
                    return this._getComponent(child.id);
                }
                if (type === 'part') {
                    return this._getPart(name);
                }
            },
            /**
             * 监听，`万能方法`
             * @param {string} expr - 表达式
             * @param listener
             * @returns {*}
             */
            listen: function (expr, listener) {
                var match = listenPattern.exec(expr);
                var type = match[1];
                var name = match[2];

                // 内置的监听类型
                if (type === 'bus') {
                    listener = evt;
                    return this.sub(name, listener);
                }

                var match = eventPattern.exec(name);
                var event = match[1];
                var target = match[2];

                // 使用 event 逻辑
                if (type === '' || type == null) {
                    return this.listenTo(name, listener);
                }
                if (type === 'vm') {

                }


                var partKey = type + ':' + target;
                var callback = _.bind(function (type, name, listener) {
                    var partType = this._partType(type);
                    return partType.listen(this, name, listener);
                }, this, type, name, listener);

                this._addPartListen(partKey, callback);

                var part = this._getPart(partKey);
                if (part != null) {
                    return callback();
                }
            },
            /**
             * 创建，`万能方法`
             * @param {string} expr - 表达式
             * @param options
             * @returns {*}
             */
            create: function (expr, options) {
                var me = this;
                var match = partPattern.exec(expr);
                var type = match[1];
                var name = match[2];

                // part: component
                if (type === 'cmp') {
                    return this.startChildren(options);
                }

                // provider
                if (type === 'provider') {
                    return this.createProvider(name, options);
                }

                if (type === 'part') {
                    return this.createPart(name, options);
                }

                // 默认 part 类型
                var obj;
                if (_.isFunction(options)) {
                    obj = options.call(this);
                } else {
                    var partType = this._partType(type);
                    if (partType != null) {
                        obj = partType.create(this, name, options);
                    }
                }

                if (obj.then && _.isFunction(obj.then)) {
                    obj.then(function (o) {
                        me._addPart(expr, o);
                    })
                } else {
                    this._addPart(expr, obj);
                }
            },
            _getComponent: function (id) {
                return this.get('part:app:component').get(id);
            },
            _getContext: function () {
                return this.options._source;
            },
            _getBatchName: function () {
                return this.options._batchName;
            },
            _componentManager: function () {
                return this.get('part:app:component');
            },
            _mediator: function () {
                return this.get('part:app:mediator');
            },
            _i18n: function (key) {
                var i18n = this.get('part:app:i18n').get();
                return i18n[key];
            },
            _uiKit: function () {
                return this.get('part:app:uiKit');
            },
            opt: function (namePath) {
                return _.get(this.options, namePath);
            },
            /**
             * 记日志
             * @param {string} msg - 信息
             * @param {string} [type='log'] - 信息类型
             */
            log: function (msg, type) {
                var logger = this.logger();
                type || (type = 'log');
                logger.setName(this._type + '(' + this._name + ')');
                if (_.isArray(msg)) {
                    logger[type].apply(logger, msg);
                } else {
                    logger[type](msg);
                }
                logger.setName();
            }
        }
    };
});

define('component/communication',[
    '../base/index'
], function (baseLib) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var noop = function () {};
    var Deferred = $.Deferred;
    var eventSplitter = /^(\S+)\s*(.*)$/;
    var delegateEventSplitter = /^(\S+)\s*(.*)$/;

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

    return {
        props: {
            _messages: [],
            _delayEvents: []
        },
        configs: {
            events: {}
        },
        methods: {
            _getEvents: function (type) {
                var events = _.result(this, 'events');
                return events[type];
            },
            _listenEventBus: function () {
                var events = this._getEvents('bus');
                var me = this;
                _.each(events, function (listener, name) {
                    me.sub(name, listener);
                });
            },
            _listenComponent: function () {
                var me = this;
                var events = this._getEvents('cmp');
                _.each(events, function (listener, name) {
                    me.listenTo(name, listener);
                });
            },
            _delegateDOMEvents: function (domEvents) {
                domEvents || (domEvents = this._getEvents('dom'));
                if (!domEvents) {
                    return this;
                }

                this._undelegateDOMEvents();
                for (var key in domEvents) {
                    var method = domEvents[key];
                    if (!_.isFunction(method)) method = this[domEvents[key]];
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
            _undelegateDOMEvents: function () {
                this.$el.off('.delegateEvents' + this._id);
                return this;
            },
            _listenToParent: function (event, handler) {
                var app = this.app();
                var me = this;
                if (this._parent != null) {
                    var parent = app.part('component').get(this._parent);
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
            _listenToDelay: function (name, obj) {
                var me = this;
                // 取出延迟监听的事件，并进行监听
                var events = _.filter(me._delayEvents, function (obj) {
                    return obj.name === name;
                });
                _.each(events, function (evt) {
                    me.listenTo(obj, evt.event, evt.callback);
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
                    if (handler == null) {
                        handler = event;
                        var match = eventSplitter.exec(sender);
                        sender = match[1];
                        event = match[2];
                    }

                    if (sender === 'parent') {
                        me._listenToParent(event, handler);
                        return;
                    }
                    if (sender === 'this') {
                        me.listenTo(this, event, handler);
                        return;
                    }

                    me._listenToChild(sender, event, handler);

                    return;
                }

                // 一次性监听多组
                if (!_.isString(event)) {
                    var objEvents = sender;
                    handler = event;
                    _.each(objEvents, function (objEvent) {
                        me.listenTo(objEvent[0], objEvent[1], handler);
                    });
                    return;
                }

                // 使用基础的 listenTo
                this.supr.call(this, sender, event, handler);
            },
            _attachObserver: function (name, listener, listenerType) {
                var mediator = this._mediator();
                var context = this;

                var callback = function (e) {
                    return listener.call(context, e);
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
                var mediator = this._mediator();
                var promises = [];
                var msg = new Message({
                    sender: this,
                    data: data
                });
                this.log(['emitted', name, msg]);
                promises.push(mediator.trigger(name, msg));

                $.when.apply(null, promises).then(function () {
                    var resp = _.flatten(arguments);
                    dfd.resolve(resp);
                }, function (resp) {
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
            subOnce: function (name, listener) {
                this._attachObserver(name, listener, 'once');
            },
            /**
             * 全局消息
             * @param {string} name - 消息名
             * @param {Object} data - 数据
             * @return {*}
             * @private
             */
            pub: function (name, data) {
                var me = this;
                var app = this.app();
                var dfd = Deferred();
                var pubFunc = _.bind(function(name, data, dfd){
                    this._pub(name, data, dfd);
                }, me, name, data, dfd);

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
                var mediator = this._mediator();
                var messages = this._messages;

                if (!this._messages) {
                    return;
                }

                _.each(messages, function (evt) {
                    mediator.off(evt.name, evt.callback);
                });
            },
            unsubOne: function (name, listener) {
                var mediator = this.get('part:app:mediator');
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
            }
        }
    };

});

define('component/parentChild',[
    '../base/index'
], function (baseLib) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var VER_ROLE = 'data-ver-role';


    /** @lends veronica.Component# */
    var configs = {
        /**
         * 设置哪些子视图在同一时间只能显示一个
         * @type {Array}
         */
        switchable: [],
        /**
         * 设置子视图
         * @type {Object|Function}
         */
        components: null
    };

    /** @lends veronica.Component# */
    var methods = {
        /**
         * 激活子视图
         * @function
         * @param {string} name - 视图名称
         */
        active: function (name) {
            var me = this;

            this._activeViewName = _.isUndefined(name) ? this._activeViewName : name;
            var targetView = this.view(this._activeViewName);

            // 更新视图显示状态
            _.each(this.switchable, function (name) {
                me.view(name) && me.view(name).hide();
            });
            targetView.show();

            // 触发事件
            this.trigger('activeView', this._activeViewName);
            targetView.trigger('active');
        },
        /**
         * 获取所有子级 Id
         * @param result
         * @returns {Array.<string>}
         * @private
         */
        _descendant: function (result) {
            var me = this;
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
                var child = me._componentManager().get(id);
                result = child._descendant(result);
            });

            return result;
        },
        /**
         * 获取子组件 Id
         * @param {boolean} [isDescendant=false] - 是否获取子孙
         * @returns {Array.<string>} - ids
         */
        children: function (isDescendant) {
            if (isDescendant == null) {
                isDescendant = false;
            }
            if (!isDescendant) {
                return this._children;
            } else {
                return this._descendant();
            }
        },
        /**
         * 获取父组件 Id
         * @returns {string}
         */
        parent: function(){
          return this._parent;
        },
        /**
         * 获取所有父组件 Id
         * @returns {Array.<string>} - ids
         */
        parents: function () {
            var parentId = this._parent;
            var componentManager = this._componentManager();
            var result = [];
            while (parentId != null) {
                result.push(parentId);
                var parent = componentManager.get(parentId);
                parentId = parent._parent;
            }

            return result;
        },
        _addChild: function (child) {
            var me = this;
            child._parent = me._id;
            me._children.push({
                id: child._id,
                name: child.options._name
            });
            me.trigger('addChild', child);
        },
        removeChild: function (name) {
            _.remove(this._children, function (c) {
                return c.name === name;
            });
        },
        _findChild: function (name) {
            return _.find(this._children, function (c) {
                return c.name === name;
            });
        },
        /**
         * 启用子部件，会自动附加该视图标识符作为标记
         * @param {Array.<object>} list 部件配置列表
         * @return {Promise}
         */
        startChildren: function (list, batchName) {
            var me = this;
            var componentManager = this._componentManager();

            if (list == null) {
                list = _.result(this, 'components');
            }
            // normalize
            list = _.map(list, function (config) {
                if (_.isString(config)) {
                    config = {
                        name: config,
                        options: {}
                    }
                }
                var viewOptions = config.options || {};

                return config;
            });

            return componentManager.start(list, batchName).done(function () {
                var children = _.toArray(arguments);
                _.each(children, function (child) {
                    // 添加为子级
                    me._addChild(child);
                });

                // 设置默认活动视图
                me.options.activeView && me.active(me.options.activeView);
            });
        },
        /**
         * 停止所有子组件
         */
        stopChildren: function () {
            var children = this._children;
            var componentManager = this._componentManager();

            _.each(children, function (child) {
                componentManager.stop(child.id);
            });
        },
        /**
         * 解析组件并启动 DOM 上所有子组件
         * @returns {Promise}
         */
        parse: function () {
            var componentList = [];
            var me = this;
            this.$el.find('[' + VER_ROLE + ']').each(function (idx, el) {
                var $el = $(el);
                var data = $el.data();

                data.options || (data.options = {});
                data.options.el = $el;
                componentList.push({
                    name: data.name,
                    xtype: data.verRole,
                    options: data.options
                });
            });

            return me.startChildren(componentList);
        },
        /**
         * 停止单个子组件
         * @param name - 组件名称
         * @private
         */
        _stopChild: function (name) {
            var componentManager = this._componentManager();
            var me = this;
            var child = me._findChild(name);
            me.removeChild(name);
            componentManager.stop(child.id);
        }
    };

    return {
        props: {
            _children: [],
            _parent: null
        },
        configs: configs,
        methods: methods
    };
});

define('component/mvvm',[
    '../base/index'
], function (baseLib) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var noop = $.noop;

    var props = {
        _bindDOM: false
    };

    /** @lends Component# */
    var configs = {
        viewEngine: '',
        /**
         * 组件生命周期钩子，返回默认的视图模型
         * @type {function}
         * @example
         *   defaultModel: function (app) {
         *     return {
         *       listSource: app.data.source()
         *     };
         *   }
         */
        defaultModel: function () {
            return {};
        },
        /**

         /**
         * 组件生命周期钩子，模型绑定完成后调用
         * @type {function}
         * @example
         *   bound: function () {
         *       this.loadData();
         *   }
         */
        bound: noop
    };

    /** @lends Component# */
    var methods = {
        _viewEngine: function () {
            return this.get('part:app:viewEngine').get(this.viewEngine);
        },
        /**
         * 获取或设置视图模型
         * @param {Object|string} [data(propName)] - 数据对象 | 属性名称
         * @param {boolean} [autoBind=false] - 是否进行视图绑定
         * @returns {Object} 视图模型对象
         * @example
         *  var vm = this.model()
         *  this.model({ test: 'xxx' })
         *  this.model('test', 'xxx')
         */
        model: function (name, value) {
            var me = this;
            if (!_.isUndefined(name)) {

                if (_.isString(name) && this._viewModel) {
                    if (value != null) {
                        this._setModelValue(name, value, this._viewModel);
                    }
                    return this._getModelValue(name);
                }

                var data = name;
                if (data.toJSON) { // 本身就是viewModel对象
                    this._viewModel = data;
                } else {
                    this._viewModel = this._createViewModel($.extend({}, data));
                }

                this.trigger('modelCreated', {
                    data: this._viewModel
                });
            }

            return this._viewModel;
        },
        /**
         * 获取 JSON 数据
         */
        toJSON: function(namePath){
            return this._modelToJSON(this.model(namePath));
        },
        /**
         * 创建视图模型
         * @param {Object} obj - 对象
         * @returns {obj}
         * @private
         */
        _createViewModel: function (obj) {
            return this._viewEngine().create(obj, this);
        },

        /**
         * 绑定视图模型
         * @private
         */
        _bindViewModel: function () {
            var me = this;
            var vm = me.model();
            if(vm == null){
                return;
            }
            var $bindBlock = this.$('.data-bind-block').not(this.$('.ver-component .data-bind-block'));
            if ($bindBlock.length === 0) {
                $bindBlock = this.$el;
            }
            $bindBlock.each(function (i, el) {
                me._viewEngine().bind(me, $(el), vm);
            });
            this._bindDOM = true;
            this.trigger('bound', {
                data: vm
            });
            this.log(this.cid + ' bound');
        },

        /**
         * 获取模型数据
         * @param name
         * @param model
         * @returns {*}
         * @private
         */
        _getModelValue: function (name, model) {
            model || (model = this.model());
            return this._viewEngine().get(model, name);
        },
        /**
         * 设置模型值
         * @param name
         * @param value
         * @param {Object} [model] - 模型
         * @returns {*}
         * @private
         */
        _setModelValue: function (name, value, model) {
            model || (model = this.model());
            return this._viewEngine().set(model, name, value);
        },
        _modelToJSON: function(data){
            return this._viewEngine().toJSON(data);
        },
        /**
         * 销毁模型
         * @private
         */
        _destoryModel: function () {
            // TODO: 这里没有配合 bindBlock 使用
            this._viewEngine().unbind(this);
            // 清除引用
            this._viewModel = null;
        }
    };

    return {
        props: props,
        configs: configs,
        methods: methods
    };
});

define('component/dom',[
    '../base/index'
], function (baseLib) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var noop = $.noop;

    var COMPONENT_CLASS = 'ver-component';
    var COMPONENT_REF_NAME = '__componentRef__';

    var props = {
        _templateIsLoading: false,
        _compiledTpl: null,
        $mountNode: null,
        _outerEl: $({})
    };

    /** @lends veronica.Component# */
    var configs = {
        /**
         * 模板
         * @type {string|Function}
         */
        template: null,
        /**
         * 模板路径
         * @type {string|Function}
         */
        templateUrl: null,
        /**
         * 模板引擎
         * @type {string}
         * @default
         */
        templateEngine: 'lodash',
        /**
         * 组件生命周期钩子，视图渲染完毕后执行的方法
         * @type {function}
         * @example
         *   rendered: function (app) {
         *       this.getModel();
         *   }
         */
        rendered: noop
    };

    /** @lends veronica.Component# */
    var methods = {
        /**
         * 获取 UI Widget
         * @param {string} name - 名称
         */
        ui: function (name) {
            var $dom = this.$('[data-ref="' + name + '"]');
            return this._uiKit().getInstance($dom);
        },
        /**
         * 获取 DOM
         * @param {string} selector - 选择器
         * @return {jQueryDOM}
         */
        $: function (selector) {
            var rt = this.$el.find(selector);
            // 从外部元素中获取元素
            this._outerEl.each(function (i, el) {
                var isThis = $(el).is(selector);
                var r1;
                if (isThis) {
                    r1 = $(el);
                } else {
                    r1 = $(el).find(selector);
                }
                if (r1.length !== 0) {
                    $.merge(rt, r1);
                }
            });

            return rt;
        },
        _removeElement: function () {
            this._undelegateDOMEvents();
            if (this.options.replace) {
                // 换回挂载点
                this.$el.replaceWith(this.$mountNode);
            } else {
                this.$el.remove();
            }
            return this;
        },
        _setElement: function (element, delegate) {
            if (this.$el){
                this._removeElement();
            }
            this.$el = element instanceof $ ? element : $(element);

            if (this.$el.length === 0) {
                this.$el = $('<div></div>');  // 默认的元素
            }
            // 如果不是独立节点，则转换为独立节点
            if (this.$el.length > 1) {
                this.$el = $('<div></div>').append(this.$el);
            }

            this.el = this.$el[0];

            // hook element
            this.$el
                .addClass(COMPONENT_CLASS)
                .data(COMPONENT_REF_NAME, this._id);


            if (delegate !== false) this._delegateDOMEvents();
            return this;
        },
        _mountElement: function (node) {
            // ensure $mountNode
            if(!this.$mountNode){
                if (!node) {
                    node = this.options.el;
                }
                this.$mountNode = $(node);
            }

            var componetMana = this.get('part:app:component');
            if (!componetMana.isCurrBatch(this._getBatchName())) {
                return;
            }

            // 替换挂载点
            if (this.options.replace) {
                // 将挂载点属性复制到当前元素上
                var me = this;
                var attrs = this.$mountNode.prop('attributes');
                _.each(attrs, function (attr) {
                    if (attr.name === 'class') {
                        me.$el.addClass(attr.value);
                        return;
                    }
                    me.$el.attr(attr.name, attr.value);
                });

                this.$mountNode.replaceWith(this.$el);

            } else {
                // 附加到挂载点下
                this.$mountNode.append(this.$el);
            }

        },
        _templateEngine: function () {
            return this.get('part:app:templateEngine').get(this.templateEngine);
        },
        /**
         * 渲染界面
         * @param {string} [template] - 模板
         * @fires veronica.Component#rendered
         */
        render: function (template) {

            var me = this;

            // 编译模板
            if (template) {
                this._compile(template);
            } else {
                if (!this._compiledTpl) {
                    this._compile();
                }
            }

            var el = this._renderTemplate(this._compiledTpl);
            this._setElement(el, true);
            this._mountElement();
            this.trigger('rendered');

            return this;
        },
        /**
         * 编译
         * @param {string} [template] - 模板
         * @return {Promise<any>}
         * @private
         */
        _compile: function (template) {
            var me = this;
            return this._fetchTemplate(template).then(function (template) {
                me._compiledTpl = _.isFunction(template) ? template : me._compileTemplate(template);
                me.trigger('compiled');
            });
        },
        _compileTemplate: function (templateText) {
            return this._templateEngine().compile(templateText, this);
        },
        _executeTemplate: function (compiled) {
            var options = this._templateEngine().options(this);
            return compiled(options);
        },
        _renderTemplate: function (template) {
            var compiled = _.isFunction(template) ? template : this._compileTemplate(template);
            return this._executeTemplate(compiled);
        },
        _fetchTemplate: function (template) {
            var me = this;
            var dfd = $.Deferred();
            if (template == null) {
                if (this.templateUrl) {
                    var url = this._invoke('templateUrl');
                    this._templateIsLoading = true;

                    $.get(url).always(function () {
                        me._templateIsLoading = false;
                    }).then(function (template) {
                        if (_.isString(template)) {
                            dfd.resolve(template);
                        } else {
                            dfd.reject();
                        }
                    }, function () {
                        dfd.reject();
                    });
                } else {
                    template = this.template;
                    if (this.options.el && !template) {
                        // 将当前元素内容作为 template
                        template = this.template = _.unescape(this.$el.html());
                    }

                    dfd.resolve(template);
                }
            } else {
                dfd.resolve(template);
            }


            return dfd.promise();
        },
        /**
         * 显示该视图
         * @function
         */
        show: function () {
            var me = this;
            this.$el.show(false, function () {
                if (me.options.autoResize) {
                    me.resize();
                }
            });
        },
        /**
         * 隐藏该视图
         * @function
         */
        hide: function () {
            this.$el.hide(false);
        }
    };

    return {
        props: props,
        configs: configs,
        methods: methods
    };
});

define('component/part',[
    '../base/index',
    '../framework/appProvider'
], function (baseLib, AppProvider) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var partPattern = /^(.*?)\:(.*)/;
    var extend = baseLib.$.extend;

    return {
        /**
         * @lends Component#
         */
        props: {
            /**
             * 部件
             */
            _parts: {},
            _delayListens: {}
        },
        /**
         * @lends Component#
         */
        methods: {

            _partType: function (type) {
                if (type == false) {
                    type = 'default';
                }
                return this.get('part:app:partType').get(type);
            },
            _getPart: function (key) {
                var match = partPattern.exec(key);
                if(match != null){
                    var type = match[1];
                    var name = match[2];
                    if (type == 'app'){
                        return this.app().get('part:' + name);
                    }
                }

                return this._parts[key];
            },
            _addPart: function (key, part) {
                var origin = this._parts[key];
                if (origin == null) {
                    this._parts[key] = part;
                    this.trigger('addPart', key, part);
                }
            },
            _addPartListen: function (key, callback) {
                var ar = this._delayListens[key];
                if (ar == null) {
                    this._delayListens[key] = [];
                }
                this._delayListens[key].push(callback);
            },
            _callPartListen: function (key) {
                var listens = _.find(this._delayListens, function (item, i) {
                    return i === key;
                })
                if (listens != null) {
                    _.each(listens, function (callback) {
                        callback();
                    });
                }
            },
            /**
             * 获取部件
             * @param {string} key - 部件名称
             * @returns {*}
             * @example
             *  var componentMana = this.part('component')
             */
            part: function(key){
                return this._getPart(key);
            },
            /**
             * 创建部件
             * @param {string} name - 名称
             * @param {Object} options - 初始化参数
             * @param {function} options.ctor - 构造器
             * @param {Object} options.options - 构造器参数
             * @returns {AppPart}
             */
            createPart: function (name, options) {
                var ctor = options.ctor;
                options = options.options;

                var me = this;
                // 从 application 中读取配置
                options = extend({
                    app: me
                }, me.options[name], options);

                var part = new ctor(options);
                if (name != null) {
                    me._addPart(name, part);
                }
                return part;
            },
            /**
             * 创建提供者部件
             * @param {string} name - 名称
             * @param {Object} [options] - 初始化参数
             * @param {function} [options.ctor=AppProvider] - 构造器
             * @param {Object} [options.options] - 构造器参数
             * @returns {AppProvider}
             */
            createProvider: function (name, options) {
                options || (options = {});

                if (options.ctor == null) {
                    options.ctor = AppProvider;
                }
                if (typeof options.ctor === 'object') {
                    options.ctor = AppProvider.extend(options.ctor);
                }
                return this.createPart(name, options);
            }
        }
    };
});

define('component/_combine',[
    './meta',
    './communication',
    './parentChild',
    './mvvm',
    './dom',
    './part'
], function () {
    var args = Array.prototype.slice.call(arguments);
    return args;
});

define('component/index',[
    '../base/index',
    './_combine',
    '../framework/appPart'
], function (baseLib, combine, AppPart) {

    var _ = baseLib._;
    var $ = baseLib.$;
    var extend = _.extend;
    var noop = $.noop;

    var Component = AppPart.extend(/** @lends veronica.Component# */{
        /**
         * @typedef ComponentOptions
         * @property {string|DOM} el - 挂载元素
         * @property {boolean} [replace=true] - 是否替换
         * @property {boolean} [autoRender=true] - 自动渲染
         * @property {boolean} [autoChildren=true] - 自动初始化子组件
         */
        options: {
            el: null,
            replace: true,
            autoRender: true,
            autoChildren: true
            //,
            // activeView: null
        },
        /**
         * 组件
         * @constructs Component
         * @param {ComponentOptions} options - 参数
         * @augments AppPart
         * @memberOf veronica
         */
        initialize: function (options) {
            options || (options = {});
            this.supr(options);

            this._invoke('_setup');

            this.trigger('created');

            this._observeModel();

            if (this.options.autoRender) {
                this.render();
            }
        },
        /**
         * 组件生命周期钩子，在初始化阶段调用，可以设置组件属性或监听等
         * @type {Function}
         */
        created: noop,
        /**
         * 组件生命周期钩子，在销毁阶段调用，通常用于释放视图使用的全局资源
         * @type {Function}
         * @example
         *   destroyed: function () {
             *     $(window).off('resize', this.resizeHanlder);
             *   }
         */
        destroyed: noop,
        /**
         * 该视图的默认参数
         * @type {object}
         * @default
         * @private
         */
        _initProps: function () {
            /**
             * 唯一标识符
             * @var {string} _id
             * @memberOf Component#
             */
            this._id = _.uniqueId('component$');
            _.extend(this, _.pick(this.options, ['_name', '_componentName', '_context']));
        },
        _observeModel: function () {
            // 设置初始视图模型
            this.model(this._invoke('defaultModel'));
        },
        _listen: function () {

            // default listen
            this.listenTo(this, 'addChild', function (child) {
                this._listenToDelay(child.options._name, child);
            });
            this.listenTo(this, 'addPart', function (key, part) {
                this._callPartListen(key);
            });
            this.listenTo(this, 'modelCreated', function () {
                this._viewEngine().bindEvents(this._viewModel, this);
                if (this._bindDOM === true || this.$el != null) {
                    this._bindViewModel();
                }
            });
            this.listenTo(this, 'beforeCreate', function () {
                this._invoke('beforeCreate');
            });
            this.listenTo(this, 'created', function () {
                this._listenEventBus();
                this._listenComponent();
                this._invoke('created');
            });

            // 第一次挂载
            this.listenTo(this, 'rendered', function () {
                // 自动创建子视图
                var me = this;
                if (this.options.autoChildren) {
                    $.when(this.parse(), this.startChildren()).then(function () {
                        me._bindViewModel();
                    });
                } else {
                    me._bindViewModel();
                }
                me.trigger('ready');
            });

            this.listenTo(this, 'ready', function () {
                this._invoke('ready');
            });

        },
        /**
         * 设置属性和监听
         * @private
         */
        _setup: function () {
            var me = this;

            this._invoke('_initProps');
            this._invoke('_listen');
        },
        /**
         * 销毁
         * @private
         */
        _destroy: function () {
            this.stopChildren();
            this.unsub();
            this.stopListening();
            this._removeElement();
            this._destoryModel();

            // 销毁第三方组件
            this._invoke('destroyed');
        },
        /**
         * 停止该组件，彻底销毁，并从组件池中移除
         */
        stop: function () {
            this.get('part:app:component').stop(this);
        },
        /**
         * 调用成员方法，如果是对象，则直接返回
         * @param {string} methodName - 方法名
         * @param {boolean} [isWithDefaultParams=true] - 是否附加默认参数（app, _, $）
         * @returns {*}
         * @private
         */
        _invoke: function (methodName, isWithDefaultParams) {
            var app = this.app();
            var args = _.toArray(arguments);
            var sliceLen = args.length >= 2 ? 2 : 1;
            if (isWithDefaultParams == null) {
                isWithDefaultParams = true;
            }

            if (isWithDefaultParams) {
                args = args.concat([app, _, $]);
            }

            var method = methodName;
            if (_.isString(methodName)) {
                method = this[methodName];
            }

            return _.isFunction(method) ? method.apply(this, args.slice(sliceLen)) : method;
        },
        /**
         * 销毁该组件，但未从全局移除该组件，通常使用 `stop`
         */
        destroy: function () {
            this._destroy();
            this.log('destroyed');
        },
        /**
         * 重新设置参数，设置后会重新初始化视图
         * @param {object} options - 视图参数
         * @returns {void}
         */
        reset: function (options) {
            this.destroy();
            options = $.extend({}, this.options, options);
            this.initialize(options);
        }
    });

    _.each(combine, function (ext) {
        Component.members(ext, {merge: ['_listen']})
    });

    // static methods

    /**
     * 创建一个自定义 View 定义
     * @static
     * @param {object|function} [obj={}] - 自定义属性或方法
     * @param {boolean} [isFactory=false] - 是否该视图定义是个工厂方法（不需要 `new`）
     */
    Component.define = function (obj, isFactory) {
        var me = this;
        var ctor;
        if (isFactory == null) {
            isFactory = true;
        }

        if (typeof obj === 'object') {  // 普通对象
            var literal = extend(true, {}, Component.base, obj);
            ctor = Component.extend(literal);
            ctor.export = literal;
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
    };

    /**
     *
     * @param initializer
     * @param options
     */
    Component.create = function (initializer, options) {
        initializer || (initializer = {});
        // 将构造器中的 _widgetName 附加到 视图中
        var defaults = {
            _xtypeName: initializer._xtypeName,
            _xtypeContext: initializer._xtypeContext,
            _exclusive: false
        };

        options = _.extend(defaults, options);

        // 调用
        var definition = Component.define(initializer);
        var obj = definition;
        while (obj != null && typeof obj === 'function') {
            obj = obj(options);
        }

        if (obj == null) {
            console.error('Component should return an object. [errorName:' + options._name);
        }

        return obj;
    };

    return Component;
});

define('framework/componentManager',[
    '../base/index',
    '../component/index',
    './appProvider'
], function (baseLib, Component, AppProvider) {

    'use strict';

    var COMPONENT_CLASS = 'ver-component';
    var COMPONENT_REF_NAME = '__componentRef__';

    var _ = baseLib._;
    var ensureArray = _.ensureArray;
    var uniqBy = _.uniqBy;
    var each = _.each;
    var map = _.map;
    var extend = _.extend;

    /**
     * 组件启动时配置
     * @typedef ComponentStartConfig
     * @property {string} name - 组件实例名称
     * @property {string} xtype - 组件定义类型名
     * @property {Object} options - 组件参数
     * @property {string|DOM} options.el - 组件挂载元素
     */

    /**
     * 当前批次组件都加载完毕
     * @event Application#componentsLoaded
     */

    var ComponentManager = AppProvider.extend(/** @lends veronica.ComponentManager# */{
        /**
         * @typedef ComponentManagerOptions
         * @property {string} [defaultMountNode='.v-component-root'] - 默认的宿主元素
         */
        options: {
            defaultMountNode: '.v-component-root'
        },
        /**
         * 组件管理器
         * @constructs ComponentManager
         * @param {ComponentManagerOptions} options
         * @augments veronica.AppProvider
         * @memberOf veronica
         */
        initialize: function (options) {
            this.supr(options);
            this._currBatchName = null;
            this._currBatchConfigList = [];
            this._lastBatchConfigList = [];
        },
        /**
         * 注册组件定义
         * @param {string} name - 组件类型名
         * @param {Object} def - 组件类型定义对象
         * @returns {Object}
         */
        register: function(name, def){
            var app = this.app();
            return app.part('componentDef').add(name, def);
        },
        /**
         * 规范化创建 widget 的配置
         * @param {string|Object} config - 配置
         * @returns {Object}
         * @private
         */
        _normalizeConfig: function (config) {
            var me = this;
            if (_.isString(config)) {
                config = {
                    name: config,
                    options: {}
                };
            }

            // resolve name expression
            var pattern = /([\w|-]*)\(?([\w\-@]*)\)?(?:=>)?(.*)/;
            var arr = config.name ? pattern.exec(config.name) : [];

            config.name = arr[1];
            config.xtype = config.xtype || arr[2];
            if(config.options == null){
                config.options = {};
            }
            config.options.el = config.options.el ||
                arr[3] || me.options.defaultMountNode;

            config.options._name = config.name;

            return config;
        },
        /**
         * 规范化一批配置
         * @param {string|Object} config - 配置
         * @param {string} batchName - 所属批次名称
         * @returns {Object}
         * @private
         */
        _normalizeBatchConfig: function (configs, batchName) {
            var me = this;
            configs = _.map(configs, function (config) {
                var nConfig = me._normalizeConfig(config, batchName);
                nConfig.options._batchName = batchName;
                return nConfig;
            });

            // 去重
            return uniqBy(configs, function (item) {
                return item.options.el;  // 确保一个元素上只有一个插件
            });
        },
        /**
         * 是当前批
         * @param {string}  batchName - 组件批次名称
         * @returns {boolean}
         */
        isCurrBatch: function (batchName) {
            var app = this.app();
            var page = app.part('page');
            return !batchName || !page || page.isCurrent(batchName);
        },
        /**
         * 启动一个或一组组件
         * @param {Array.<ComponentStartConfig>|ComponentStartConfig} list - 组件启动时配置
         * @param {string} [batchName] - 当前加载的组件所属批次名称
         * @returns {Promise}
         * @fires Application#componentsLoaded
         */
        start: function (list, batchName) {
            var promises = [];
            var me = this;
            var app = this.app();
            var dfd = $.Deferred();
            var defManager = app.part('componentDef');

            app.busy(true);

            list = me._normalizeBatchConfig(ensureArray(list), batchName);

            me._updateCurrConfigList(list, batchName);

            each(list, function (config) {

                if (config.xtype === 'empty') {
                    me.stopByDom(config.options.el);
                    return;
                }

                if (config.xtype == null || !me._allowStart(config)) {
                    return;
                }

                var defDfd = defManager.resolve(config.xtype, config.options);
                if (defDfd != null) {
                    promises.push(defDfd);
                }
            });

            $.when.apply($, promises).done(function () {
                var args = arguments;
                if (promises.length === 1) {
                    args = [arguments];
                }

                var components = map(args, function (arg) {
                    var initializer = arg[0];  // component
                    var options = arg[1];  // options

                    // Bugfixed：修复频繁切换页面导致错误加载的bug，当部件所在的页面不是当前页面，则不执行
                    if (me.isCurrBatch(options._batchName)) {
                        me.stopByDom(options.el);

                        options.app = app;
                        var cmp = Component.create(initializer, options);
                        if (cmp) {
                            me.add(cmp._id, cmp);
                        }
                        return cmp;
                    }

                    return null;
                });

                app.busy(false);

                app.pub("componentsLoaded");

                dfd.resolve.apply(dfd, components);
            });

            return dfd.promise();
        },
        /**
         * 更新当前的配置列表
         * @param {Array} list - 配置列表
         * @param {string} batchName - 批次名称
         * @private
         */
        _updateCurrConfigList: function (list, batchName) {
            var me = this;

            if (batchName) {
                me._lastBatchConfigList = me._currBatchConfigList;
                me._currBatchName = batchName;
                me._currBatchConfigList = list;
            } else {
                me._currBatchConfigList = me._currBatchConfigList.concat(list);
            }
        },
        // 是否允许该配置的 widget 加载
        _allowStart: function (config) {
            var me = this;
            var name = config.name;
            var options = config.options || {};
            var hostNode = options.el;

            // 判别是否存在完全相同的部件
            var hasSame = !!_.find(me._lastBatchConfigList, function (oldConfig) {
                var sameName = oldConfig.name === name;
                var sameType = oldConfig.xtype === config.xtype;
                var sameHost = oldConfig.options.el === hostNode;

                return sameName && sameType && sameHost;
            });

            return !hasSame;
        },
        /**
         * 根据 DOM 元素获取
         * @param {object|string} el - 元素节点或选择器
         * @returns {Sandbox}
         */
        getByDom: function (el) {
            var id = $(el).data(COMPONENT_REF_NAME);
            return this.get(id);
        },
        /**
         * 找到所有组件的 DOM
         * @param {string|DOM|jQueryObject} parent - 父级
         * @returns {jQueryObject}
         */
        findDom: function (parent) {
            return $(parent).find('.' + COMPONENT_CLASS);
        },
        /**
         * 停止组件
         * @param {string} id - 组件 Id
         */
        stop: function (id) {
            var me = this;
            var app = this.app();

            var obj = _.isString(id) ? me.get(id) : id;
            if (obj == null) {
                return;
            }

            // 从父元素中该 component
            var parent = me.get(obj._parent);
            parent && parent.removeChild(obj._name);

            // 全局移除
            me.remove(obj._id);

            // 调用插件的自定义销毁方法
            obj.destroy();
        },
        /**
         * 停止所有组件
         */
        stopAll: function () {
            _.each(this._runningPool, function (compo) {
                compo.destroy();
            });
            this._runningPool = [];
        },
        /**
         * 停止某个 DOM 下的所有组件
         * @param {jQueryDOM} dom - 挂载点
         */
        stopByDom: function (dom) {
            var me = this;
            var compo = me.getByDom(dom);
            if (compo) {
                me.stop(compo);
            }

            me.findDom(dom).each(function (i, childDom) {
                me.stopByDom($(childDom));
            });
        },
        /**
         * 垃圾回收
         * @private
         */
        recycle: function () {
            var me = this;
            _.each(this._runningPool, function (running) {
                if (running && running.$el && running.$el.closest(document.body).length === 0) {
                    me.stop(running);
                }
            });
        },
        /**
         * 卸载一个模块
         * @private
         */
        _unload: function (ref) {
            var key;
            if (require.s) {  // 仅当存在 requirejs 时才进行卸载
                var contextMap = require.s.contexts._.defined;

                for (key in contextMap) {
                    if (contextMap.hasOwnProperty(key) && key.indexOf(ref) !== -1) {
                        // 在requirejs中移除对该插件的引用
                        require.undef(key);
                    }
                }
            }

        }
    });

    return ComponentManager;
});

define('framework/componentDefManager',[
    '../base/index',
    './appProvider'
], function (baseLib, AppProvider) {

    var _ = baseLib._;
    var $ = baseLib.$;

    /**
     * 组件定义管理器
     * @class
     * @augments veronica.AppProvider
     * @param {ComponentDefManagerOptions} options
     * @memberOf veronica
     */
    var ComponentDefManager = AppProvider.extend(/** @lends veronica.ComponentDefManager# */{
        /**
         * @typedef ComponentDefManagerOptions
         * @property {string} [defaultContext=null] - 组件的默认上下文
         * @property {boolean} [autoParseContext=false] - 自动从组件定义名称解析上下文
         */
        options: {
            defaultContext: null,
            autoParseContext: false
        },
        //TODO: 该方法要重写
        _getLoadPackage: function (name, context) {
            var me = this;
            var app = this.app();
            var isDebug = app.part('env').isDebug();
            var location = app.options.releaseComponentPath + '/' + name;  // release component

            if (isDebug) {
                var mod = app.part('module').get(context);
                location = mod.resolveLocation(name);
            }

            location = _.normalizePath(location);

            return {
                name: name,
                location: location,
                main: 'main'
            };
        },
        _parseContext: function (name) {
            if (this.options.autoParseContext) {
                return name.split('-')[0];
            }
            return null;
        },
        _parseName: function (input) {
            var me = this;
            var pattern = /([\w|-]+)@?([\w|-]*)/;
            var nameFragmentArr = pattern.exec(input);
            var name = nameFragmentArr[1];
            var context = nameFragmentArr[2] || me._parseContext(name) || me.options.defaultContext;
            return {
                name: name,
                context: context
            };
        },
        /**
         * 获取（解决）组件定义
         * @param {string|Object} name - 组件定义或名称表达式
         * @param {Object} [options] - 组件调用时参数
         * @returns {Promise.<definition, options>}
         */
        resolve: function (name, options) {
            var me = this;
            var dfd = $.Deferred();
            var def;

            if (_.isString(name)) {
                var data = me._parseName(name);
                if (options) {
                    options._xtypeName = data.name;
                    options._xtypeContext = data.context;
                }

                if (me.has(data.name)) {
                    def = me.get(data.name);
                    dfd.resolve(def, options);
                } else {
                    var loader = this.loader();

                    loader.require([data.name], true, {
                        packages: [me._getLoadPackage(data.name, data.context)]
                    }).done(function (name, defs) {
                        var def = defs;
                        //TODO: 这里检测下
                        if (_.isArray(def)) {
                            def = defs[0];
                        }
                        dfd.resolve(def, options);

                    }).fail(function (err) {
                        if (err.requireType === 'timeout') {
                            console && console.warn && console.warn('Could not load module ' + err.requireModules);
                        } else {
                            var failedId = err.requireModules && err.requireModules[0];
                            require.undef(failedId);
                            console && console.error && console.error(err);
                        }
                        dfd.reject();
                    });
                }
            } else {
                dfd.resolve(name, options);
            }

            return dfd.promise();

        }
    });

    return ComponentDefManager;
});

define('framework/index',[
    './appPart',
    './appProvider',
    './appRouter',
    './layoutManager',
    './pageManager',
    './componentManager',
    './componentDefManager'
], function (AppPart, AppProvider, AppRouter, LayoutManager, PageManager,
              ComponentManager, ComponentDefManager) {

    'use strict';

    var frameworkLib = {
        AppPart: AppPart,
        AppProvider: AppProvider,
        AppRouter: AppRouter,
        LayoutManager: LayoutManager,
        PageManager: PageManager,
        ComponentManager: ComponentManager,
        ComponentDefManager: ComponentDefManager
    };

    return frameworkLib;
});

define('application/appInjection',[
    '../base/index',
    '../framework/index'
], function (baseLib, frameworkLib) {
    var _ = baseLib._;

    return function (app) {
        /**
         * 中介者，消息总线
         * @name part:mediator
         * @type {veronica.Observable}
         * @memberOf Application#
         */
        app.create('part:mediator', {ctor: baseLib.Observable});
        /**
         * 日志记录器
         * @name part:logger
         * @type veronica.Logger
         * @memberOf Application#
         */
        app.create('part:logger', {ctor: baseLib.Logger});
        /**
         * 组件定义管理器
         * @name part:componentDef
         * @type veronica.ComponentDefManager
         * @memberOf Application#
         */
        app.create('part:componentDef', {ctor: frameworkLib.ComponentDefManager});
        /**
         * 组件管理器
         * @name part:component
         * @type veronica.ComponentManager
         * @memberOf Application#
         */
        app.create('part:component', {ctor: frameworkLib.ComponentManager});
        /**
         * 布局管理器
         * @name part:layout
         * @type veronica.LayoutManager
         * @memberOf Application#
         */
        app.create('part:layout', {ctor: frameworkLib.LayoutManager});
        /**
         * 页面管理器
         * @name part:page
         * @type veronica.PageManager
         * @memberOf Application#
         */
        app.create('part:page', {ctor: frameworkLib.PageManager});
        /**
         * 路由器
         * @name part:router
         * @type veronica.AppRouter
         * @memberOf Application#
         */
        app.create('part:router', {ctor: frameworkLib.AppRouter});
        /**
         * 部件类型提供者容器
         * @name part:partType
         * @type veronica.AppProvider
         * @memberOf Application#
         */
        app.create('provider:partType');
        /**
         * 界面套件提供者容器
         * @name part:uiKit
         * @type veronica.AppProvider
         * @memberOf Application#
         */
        app.create('provider:uiKit');
        /**
         * 模板引擎提供者容器
         * @name part:templateEngine
         * @type veronica.AppProvider
         * @memberOf Application#
         */
        app.create('provider:templateEngine');
        /**
         * 视图引擎提供者容器
         * @name part:viewEngine
         * @type veronica.AppProvider
         * @memberOf Application#
         */
        app.create('provider:viewEngine');
        /**
         * 应用程序模块提供者容器
         * @name part:module
         * @type veronica.AppProvider
         * @memberOf Application#
         */
        app.create('provider:module');
        /**
         * 本地化提供者容器
         * @name part:i18n
         * @type veronica.AppProvider
         * @memberOf Application#
         */
        app.create('provider:i18n');
        /**
         * 加载器提供者容器
         * @name part:loader
         * @type veronica.AppProvider
         * @memberOf Application#
         */
        app.create('provider:loader');
        /**
         * 浏览器历史管理器
         * @name part:history
         * @type veronica.History
         * @memberOf Application#
         */
        app._addPart('history', baseLib.history);

        // ComponentPart
        //TODO: 这里需要重写
        var eventPattern = /^(\S+)\s*(.*)$/;
        app.part('partType').add('default', {
            create: function (options) {

            },
            listen: function (view, name, listener) {

            }
        });
        app.part('partType').add('ui', {
            create: function () {

            },
            listen: function (view, name, listener) {
                var match = eventPattern.exec(name);
                var event = match[1];
                var target = match[2];
                target = view.ui('[data-ref=' + target + ']');

                if (target != null) {
                    target.bind(event, _.bind(listener, view));
                }
            }
        });

        /**
         * 界面套件提供者统一接口
         * @interface UIKit
         */
        app.part('uiKit').add('default', /** @lends UIKit# */{
                /**
                 * 初始化
                 * @param {Component} view - 视图
                 * @param {jQueryObject} $dom - 根节点
                 */
                init: function (view, $dom) {

                },
                /**
                 * 创建
                 * @param name
                 * @param options
                 */
                create: function (name, options) {

                },
                addParts: function (view) {

                },
                destroy: function () {
                },
                /**
                 * 获取实例对象
                 */
                getInstance: function ($dom) {

                }
            });

        // ViewEngine

        /**
         * 视图引擎提供者接口
         * @interface ViewEngine
         */
        app.part('viewEngine').add('default', /** @lends ViewEngine# */ {
            /**
             * 绑定界面
             * @param {veronica.Component} component - 当前组件
             * @param {jQueryDOM} $dom - 绑定元素
             * @param {Object} model - 待绑定数据
             */
            bind: function (component, $dom, model) {

            },
            /**
             * 解除绑定
             * @param {veronica.Component} component - 当前组件
             */
            unbind: function (component) {

            },
            /**
             * 创建绑定数据
             * @param {Object} data - 数据
             * @returns {Object} - 处理后数据
             */
            create: function (data) {
                return data;
            },
            /**
             * 绑定事件
             * @param {Object} vm - 视图模型
             * @param {veroncia.Component} component - 当前组件
             */
            bindEvents: function (vm, component) {

            },
            /**
             * 获取值
             * @param {Object} model - 模型
             * @param {string} name - 字段名
             */
            get: function (model, name) {

            },
            /**
             * 设置值
             * @param {Object} model - 模型
             * @param {string} name - 字段名
             * @param {string} value - 值
             */
            set: function (model, name, value) {
            },
            /**
             * 获取JSON对象数据
             * @param {Object} data - 对象
             * @returns {Object}
             */
            toJSON: function(data){
                return data;
            }
        });

        /**
         * 模板引擎提供者接口
         * @interface TemplateEngine
         */

        var templateEngine = app.get('part:templateEngine');

        templateEngine.add('default', /** @lends TemplateEngine# */{
            /**
             * 初始化模板参数
             * @param {veronica.Component} component - 当前组件
             * @returns {Object}
             */
            options: function (component) {
                return {};
            },
            /**
             * 编译模板
             * @param {string} text - 模板片段
             * @returns {Function}
             */
            compile: function (text) {
                return function () {
                    return text;
                }
            }
        });

        templateEngine.add('underscore', {
            options: function (view) {
                return _.extend({}, view.options);
            },
            compile: function (text, view) {
                return _.template(text, {variable: 'data'});
            }
        });

        templateEngine.add('lodash', {
            options: function (view) {
                return _.extend({}, view.options);
            },
            compile: function (text, view) {
                return _.template(text, {variable: 'data'});
            }
        });


        /**
         * 应用程序模块提供者接口
         * @interface Module
         */
        var mod = app.get('part:module');
        mod.add('default', /** @lends Module# */{
            /**
             * 模块名称
             */
            name: 'default',
            /**
             * 模块路径模式
             */
            path: 'widgets',
            /**
             * 是否组件是多文件夹放置
             */
            multilevel: false,
            /**
             * 组件位置模式
             */
            locationPattern: /(\w*)-?(\w*)-?(\w*)-?(\w*)-?(\w*)/,
            /**
             * 取得路径
             * @returns {string}
             */
            resolvePath: function () {
                var path = this.path;
                return path.replace('${name}', this.name);
            },
            /**
             * 取得模块组件位置
             * @param {string} name - 组件定义名
             * @returns {string}
             */
            resolveLocation: function (name) {
                var me = this;
                var resolvedName = name;
                if (me.multilevel === true) {
                    var parts = me.locationPattern.exec(name);
                    resolvedName = _.reduce(parts, function (memo, name, i) {
                        // 因为第0项是全名称，所以直接跳过
                        if (name === '') {
                            return memo;
                        }
                        if (i === 1) {
                            // 如果第一个与source名称相同，则不要重复返回路径
                            if (name === me.name) {
                                return '';
                            }
                            return name;
                        }
                        return memo + '/' + name;
                    });
                }

                return me.resolvePath() + '/' + resolvedName;
            }
        });
    };
});

define('application/index',[
    '../base/index',
    '../framework/index',
    '../component/index',
    './appInjection'
], function (baseLib, frameworkLib, Component, appInjection) {

    'use strict';

    /**
     * 应用程序页面启动完成
     * @event Application#appStarted
     */

    var Application = Component.extend(/** @lends Application# */{
        /**
         * @typedef {Object} ApplicationOptions
         * @description 可传入部件的配置参数，以部件的名称作为键
         * @property {string} [name='app'] - 应用程序名
         * @property {boolean} [global=true] - 是否全局对象
         * @extends ComponentOptions
         */
        options: {
            name: 'app',
            global: true  // 全局 app
        },
        /**
         * 应用程序
         * @constructs Application
         * @param {ApplicationOptions} [options] - 配置参数
         * @augments Component
         */
        initialize: function (options) {
            options || (options = {});
            this.supr(options);
        },
        _setup: function(){
            this.supr();
            this.supr();
            this._busy = false;
            this._taskQueue = [];
            this.name = this.options.name;
            appInjection(this);
        },
        created: function () {
            this._subscribe();
        },
        _subscribe: function () {
            // listen
            var me = this;
            me.sub('layoutChanging', function (name, $root) {
                me.part('component').stop($root);
            })
        },
        /**
         * 设置或获取是否正忙
         * @param {boolean} [busy] - 是否忙碌
         * @returns {boolean}
         */
        busy: function (busy) {
            if (busy != null) {
                var origin = this._busy;
                this._busy = busy;
                // 如果不忙碌，则运行所有任务
                if (origin !== busy && busy === false) {
                    this._runTask();
                }
            }
            return this._busy;
        },
        _runTask: function () {
            var queue = this._taskQueue;
            while (queue.length > 0) {
                (queue.shift())();
            }
        },
        addTask: function (task) {
            this._taskQueue.push(task);
        },
        /**
         * 启动应用程序，开始页面路由
         * @fires Application#appStarted
         * @returns {void}
         */
        start: function () {

            this.history.start({pushState: false});

            this.pub('appStarted');
        },
        /**
         * 停止应用程序
         */
        stop: function () {
            this.part('component').stopAll();
        },
        /**
         * 使用扩展
         * @param {function} ext - 扩展函数
         * @returns {Object} this
         * @example
         *  var extension = function(app){
         *      app.ext.sayHello = function(){
         *          alert('hello world');
         *      }
         *  }
         *  app.use(extension);
         */
        use: function (ext) {
            var me = this;
            if (!_.isArray(ext)) {
                ext = [ext];
            }
            $.each(ext, function (i, func) {
                func(me, Application);
            });
            return this;
        }

    }, false);

    return Application;
});

define('veronica',[
    './base/index',
    './framework/index',
    './component/index',
    './application/index'
], function (baseLib, frameworkLib, Component, Application) {

    'use strict';

    var extend = baseLib._.extend;
    var coreLib = {};
    extend(coreLib, baseLib);
    extend(coreLib, frameworkLib);

    coreLib.Component = Component;
    coreLib.Application = Application;

    // global method
    coreLib.createApp = function (options) {
        if (window.__verApp) {
            window.__verApp.stop();
        }
        var app = new Application(options);
        app.core = coreLib;
        if (app.options.global) {
            window.__verApp = app;
        }
        return app;
    }

    return coreLib;
});

    //Register in the values from the outer closure for common dependencies
    //as local almond modules
    define('jquery', function () {
        return $;
    });

    define('lodash', function(){
        return _;
    });

    //Use almond's special top-level, synchronous require to trigger factory
    //functions, get the final module value, and export it as the public
    //value.
    return require('veronica');
}));
