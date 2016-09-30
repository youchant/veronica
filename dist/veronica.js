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

define('base/lodashExt/querystring',[
    'lodash'
], function (_) {
    var qs = {};

    /**
     * 查询字符串的来源
     * @enum
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
     * @memberOf veronica
     * @param {QueryStringType} choice - 查询字符串来源
     */
    function QueryString(choice) {
        if (choice == null) {
            choice = 1
        }
        this.choice = choice;
    }

    /**@lends veronica.QueryString# */
    QueryString.prototype = {
        constructor: QueryString,
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
    }

    if (!_.qs) {
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

define('base/lodashExt/index',[
    'lodash',
    './querystring',
    './request',
    './util'
], function (_) {

    'use strict';

    return _;
});

/*!
 * EventEmitter2
 * https://github.com/hij1nx/EventEmitter2
 *
 * Copyright (c) 2013 hij1nx
 * Licensed under the MIT license.
 */
;!function(undefined) {

  var isArray = Array.isArray ? Array.isArray : function _isArray(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };
  var defaultMaxListeners = 10;

  function init() {
    this._events = {};
    if (this._conf) {
      configure.call(this, this._conf);
    }
  }

  function configure(conf) {
    if (conf) {

      this._conf = conf;

      conf.delimiter && (this.delimiter = conf.delimiter);
      conf.maxListeners && (this._events.maxListeners = conf.maxListeners);
      conf.wildcard && (this.wildcard = conf.wildcard);
      conf.newListener && (this.newListener = conf.newListener);

      if (this.wildcard) {
        this.listenerTree = {};
      }
    }
  }

  function EventEmitter(conf) {
    this._events = {};
    this.newListener = false;
    configure.call(this, conf);
  }
  EventEmitter.EventEmitter2 = EventEmitter; // backwards compatibility for exporting EventEmitter property

  //
  // Attention, function return type now is array, always !
  // It has zero elements if no any matches found and one or more
  // elements (leafs) if there are matches
  //
  function searchListenerTree(handlers, type, tree, i) {
    if (!tree) {
      return [];
    }
    var listeners=[], leaf, len, branch, xTree, xxTree, isolatedBranch, endReached,
        typeLength = type.length, currentType = type[i], nextType = type[i+1];
    if (i === typeLength && tree._listeners) {
      //
      // If at the end of the event(s) list and the tree has listeners
      // invoke those listeners.
      //
      if (typeof tree._listeners === 'function') {
        handlers && handlers.push(tree._listeners);
        return [tree];
      } else {
        for (leaf = 0, len = tree._listeners.length; leaf < len; leaf++) {
          handlers && handlers.push(tree._listeners[leaf]);
        }
        return [tree];
      }
    }

    if ((currentType === '*' || currentType === '**') || tree[currentType]) {
      //
      // If the event emitted is '*' at this part
      // or there is a concrete match at this patch
      //
      if (currentType === '*') {
        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+1));
          }
        }
        return listeners;
      } else if(currentType === '**') {
        endReached = (i+1 === typeLength || (i+2 === typeLength && nextType === '*'));
        if(endReached && tree._listeners) {
          // The next element has a _listeners, add it to the handlers.
          listeners = listeners.concat(searchListenerTree(handlers, type, tree, typeLength));
        }

        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            if(branch === '*' || branch === '**') {
              if(tree[branch]._listeners && !endReached) {
                listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], typeLength));
              }
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            } else if(branch === nextType) {
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+2));
            } else {
              // No match on this one, shift into the tree but not in the type array.
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            }
          }
        }
        return listeners;
      }

      listeners = listeners.concat(searchListenerTree(handlers, type, tree[currentType], i+1));
    }

    xTree = tree['*'];
    if (xTree) {
      //
      // If the listener tree will allow any match for this part,
      // then recursively explore all branches of the tree
      //
      searchListenerTree(handlers, type, xTree, i+1);
    }

    xxTree = tree['**'];
    if(xxTree) {
      if(i < typeLength) {
        if(xxTree._listeners) {
          // If we have a listener on a '**', it will catch all, so add its handler.
          searchListenerTree(handlers, type, xxTree, typeLength);
        }

        // Build arrays of matching next branches and others.
        for(branch in xxTree) {
          if(branch !== '_listeners' && xxTree.hasOwnProperty(branch)) {
            if(branch === nextType) {
              // We know the next element will match, so jump twice.
              searchListenerTree(handlers, type, xxTree[branch], i+2);
            } else if(branch === currentType) {
              // Current node matches, move into the tree.
              searchListenerTree(handlers, type, xxTree[branch], i+1);
            } else {
              isolatedBranch = {};
              isolatedBranch[branch] = xxTree[branch];
              searchListenerTree(handlers, type, { '**': isolatedBranch }, i+1);
            }
          }
        }
      } else if(xxTree._listeners) {
        // We have reached the end and still on a '**'
        searchListenerTree(handlers, type, xxTree, typeLength);
      } else if(xxTree['*'] && xxTree['*']._listeners) {
        searchListenerTree(handlers, type, xxTree['*'], typeLength);
      }
    }

    return listeners;
  }

  function growListenerTree(type, listener) {

    type = typeof type === 'string' ? type.split(this.delimiter) : type.slice();

    //
    // Looks for two consecutive '**', if so, don't add the event at all.
    //
    for(var i = 0, len = type.length; i+1 < len; i++) {
      if(type[i] === '**' && type[i+1] === '**') {
        return;
      }
    }

    var tree = this.listenerTree;
    var name = type.shift();

    while (name) {

      if (!tree[name]) {
        tree[name] = {};
      }

      tree = tree[name];

      if (type.length === 0) {

        if (!tree._listeners) {
          tree._listeners = listener;
        }
        else if(typeof tree._listeners === 'function') {
          tree._listeners = [tree._listeners, listener];
        }
        else if (isArray(tree._listeners)) {

          tree._listeners.push(listener);

          if (!tree._listeners.warned) {

            var m = defaultMaxListeners;

            if (typeof this._events.maxListeners !== 'undefined') {
              m = this._events.maxListeners;
            }

            if (m > 0 && tree._listeners.length > m) {

              tree._listeners.warned = true;
              console.error('(node) warning: possible EventEmitter memory ' +
                            'leak detected. %d listeners added. ' +
                            'Use emitter.setMaxListeners() to increase limit.',
                            tree._listeners.length);
              if(console.trace){
                console.trace();
              }
            }
          }
        }
        return true;
      }
      name = type.shift();
    }
    return true;
  }

  // By default EventEmitters will print a warning if more than
  // 10 listeners are added to it. This is a useful default which
  // helps finding memory leaks.
  //
  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.

  EventEmitter.prototype.delimiter = '.';

  EventEmitter.prototype.setMaxListeners = function(n) {
    this._events || init.call(this);
    this._events.maxListeners = n;
    if (!this._conf) this._conf = {};
    this._conf.maxListeners = n;
  };

  EventEmitter.prototype.event = '';

  EventEmitter.prototype.once = function(event, fn) {
    this.many(event, 1, fn);
    return this;
  };

  EventEmitter.prototype.many = function(event, ttl, fn) {
    var self = this;

    if (typeof fn !== 'function') {
      throw new Error('many only accepts instances of Function');
    }

    function listener() {
      if (--ttl === 0) {
        self.off(event, listener);
      }
      fn.apply(this, arguments);
    }

    listener._origin = fn;

    this.on(event, listener);

    return self;
  };

  EventEmitter.prototype.emit = function() {

    this._events || init.call(this);

    var type = arguments[0];

    if (type === 'newListener' && !this.newListener) {
      if (!this._events.newListener) {
        return false;
      }
    }

    var al = arguments.length;
    var args,l,i,j;
    var handler;

    if (this._all && this._all.length) {
      handler = this._all.slice();
      if (al > 3) {
        args = new Array(al);
        for (j = 0; j < al; j++) args[j] = arguments[j];
      }

      for (i = 0, l = handler.length; i < l; i++) {
        this.event = type;
        switch (al) {
        case 1:
          handler[i].call(this, type);
          break;
        case 2:
          handler[i].call(this, type, arguments[1]);
          break;
        case 3:
          handler[i].call(this, type, arguments[1], arguments[2]);
          break;
        default:
          handler[i].apply(this, args);
        }
      }
    }

    if (this.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    } else {
      handler = this._events[type];
      if (typeof handler === 'function') {
        this.event = type;
        switch (al) {
        case 1:
          handler.call(this);
          break;
        case 2:
          handler.call(this, arguments[1]);
          break;
        case 3:
          handler.call(this, arguments[1], arguments[2]);
          break;
        default:
          args = new Array(al - 1);
          for (j = 1; j < al; j++) args[j - 1] = arguments[j];
          handler.apply(this, args);
        }
        return true;
      } else if (handler) {
        // need to make copy of handlers because list can change in the middle
        // of emit call
        handler = handler.slice();
      }
    }

    if (handler && handler.length) {
      if (al > 3) {
        args = new Array(al - 1);
        for (j = 1; j < al; j++) args[j - 1] = arguments[j];
      }
      for (i = 0, l = handler.length; i < l; i++) {
        this.event = type;
        switch (al) {
        case 1:
          handler[i].call(this);
          break;
        case 2:
          handler[i].call(this, arguments[1]);
          break;
        case 3:
          handler[i].call(this, arguments[1], arguments[2]);
          break;
        default:
          handler[i].apply(this, args);
        }
      }
      return true;
    } else if (!this._all && type === 'error') {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }

    return !!this._all;
  };

  EventEmitter.prototype.emitAsync = function() {

    this._events || init.call(this);

    var type = arguments[0];

    if (type === 'newListener' && !this.newListener) {
        if (!this._events.newListener) { return Promise.resolve([false]); }
    }

    var promises= [];

    var al = arguments.length;
    var args,l,i,j;
    var handler;

    if (this._all) {
      if (al > 3) {
        args = new Array(al);
        for (j = 1; j < al; j++) args[j] = arguments[j];
      }
      for (i = 0, l = this._all.length; i < l; i++) {
        this.event = type;
        switch (al) {
        case 1:
          promises.push(this._all[i].call(this, type));
          break;
        case 2:
          promises.push(this._all[i].call(this, type, arguments[1]));
          break;
        case 3:
          promises.push(this._all[i].call(this, type, arguments[1], arguments[2]));
          break;
        default:
          promises.push(this._all[i].apply(this, args));
        }
      }
    }

    if (this.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    } else {
      handler = this._events[type];
    }

    if (typeof handler === 'function') {
      this.event = type;
      switch (al) {
      case 1:
        promises.push(handler.call(this));
        break;
      case 2:
        promises.push(handler.call(this, arguments[1]));
        break;
      case 3:
        promises.push(handler.call(this, arguments[1], arguments[2]));
        break;
      default:
        args = new Array(al - 1);
        for (j = 1; j < al; j++) args[j - 1] = arguments[j];
        promises.push(handler.apply(this, args));
      }
    } else if (handler && handler.length) {
      if (al > 3) {
        args = new Array(al - 1);
        for (j = 1; j < al; j++) args[j - 1] = arguments[j];
      }
      for (i = 0, l = handler.length; i < l; i++) {
        this.event = type;
        switch (al) {
        case 1:
          promises.push(handler[i].call(this));
          break;
        case 2:
          promises.push(handler[i].call(this, arguments[1]));
          break;
        case 3:
          promises.push(handler[i].call(this, arguments[1], arguments[2]));
          break;
        default:
          promises.push(handler[i].apply(this, args));
        }
      }
    } else if (!this._all && type === 'error') {
      if (arguments[1] instanceof Error) {
        return Promise.reject(arguments[1]); // Unhandled 'error' event
      } else {
        return Promise.reject("Uncaught, unspecified 'error' event.");
      }
    }

    return Promise.all(promises);
  };

  EventEmitter.prototype.on = function(type, listener) {

    if (typeof type === 'function') {
      this.onAny(type);
      return this;
    }

    if (typeof listener !== 'function') {
      throw new Error('on only accepts instances of Function');
    }
    this._events || init.call(this);

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit('newListener', type, listener);

    if(this.wildcard) {
      growListenerTree.call(this, type, listener);
      return this;
    }

    if (!this._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    }
    else if(typeof this._events[type] === 'function') {
      // Adding the second element, need to change to array.
      this._events[type] = [this._events[type], listener];
    }
    else if (isArray(this._events[type])) {
      // If we've already got an array, just append.
      this._events[type].push(listener);

      // Check for listener leak
      if (!this._events[type].warned) {

        var m = defaultMaxListeners;

        if (typeof this._events.maxListeners !== 'undefined') {
          m = this._events.maxListeners;
        }

        if (m > 0 && this._events[type].length > m) {

          this._events[type].warned = true;
          console.error('(node) warning: possible EventEmitter memory ' +
                        'leak detected. %d listeners added. ' +
                        'Use emitter.setMaxListeners() to increase limit.',
                        this._events[type].length);
          if(console.trace){
            console.trace();
          }
        }
      }
    }
    return this;
  };

  EventEmitter.prototype.onAny = function(fn) {

    if (typeof fn !== 'function') {
      throw new Error('onAny only accepts instances of Function');
    }

    if(!this._all) {
      this._all = [];
    }

    // Add the function to the event listener collection.
    this._all.push(fn);
    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  EventEmitter.prototype.off = function(type, listener) {
    if (typeof listener !== 'function') {
      throw new Error('removeListener only takes instances of Function');
    }

    var handlers,leafs=[];

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);
    }
    else {
      // does not use listeners(), so no side effect of creating _events[type]
      if (!this._events[type]) return this;
      handlers = this._events[type];
      leafs.push({_listeners:handlers});
    }

    for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
      var leaf = leafs[iLeaf];
      handlers = leaf._listeners;
      if (isArray(handlers)) {

        var position = -1;

        for (var i = 0, length = handlers.length; i < length; i++) {
          if (handlers[i] === listener ||
            (handlers[i].listener && handlers[i].listener === listener) ||
            (handlers[i]._origin && handlers[i]._origin === listener)) {
            position = i;
            break;
          }
        }

        if (position < 0) {
          continue;
        }

        if(this.wildcard) {
          leaf._listeners.splice(position, 1);
        }
        else {
          this._events[type].splice(position, 1);
        }

        if (handlers.length === 0) {
          if(this.wildcard) {
            delete leaf._listeners;
          }
          else {
            delete this._events[type];
          }
        }

        this.emit("removeListener", type, listener);

        return this;
      }
      else if (handlers === listener ||
        (handlers.listener && handlers.listener === listener) ||
        (handlers._origin && handlers._origin === listener)) {
        if(this.wildcard) {
          delete leaf._listeners;
        }
        else {
          delete this._events[type];
        }

        this.emit("removeListener", type, listener);
      }
    }

    function recursivelyGarbageCollect(root) {
      if (root === undefined) {
        return;
      }
      var keys = Object.keys(root);
      for (var i in keys) {
        var key = keys[i];
        var obj = root[key];
        if ((obj instanceof Function) || (typeof obj !== "object"))
          continue;
        if (Object.keys(obj).length > 0) {
          recursivelyGarbageCollect(root[key]);
        }
        if (Object.keys(obj).length === 0) {
          delete root[key];
        }
      }
    }
    recursivelyGarbageCollect(this.listenerTree);

    return this;
  };

  EventEmitter.prototype.offAny = function(fn) {
    var i = 0, l = 0, fns;
    if (fn && this._all && this._all.length > 0) {
      fns = this._all;
      for(i = 0, l = fns.length; i < l; i++) {
        if(fn === fns[i]) {
          fns.splice(i, 1);
          this.emit("removeListenerAny", fn);
          return this;
        }
      }
    } else {
      fns = this._all;
      for(i = 0, l = fns.length; i < l; i++)
        this.emit("removeListenerAny", fns[i]);
      this._all = [];
    }
    return this;
  };

  EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

  EventEmitter.prototype.removeAllListeners = function(type) {
    if (arguments.length === 0) {
      !this._events || init.call(this);
      return this;
    }

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      var leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);

      for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
        var leaf = leafs[iLeaf];
        leaf._listeners = null;
      }
    }
    else {
      if (!this._events || !this._events[type]) return this;
      this._events[type] = null;
    }
    return this;
  };

  EventEmitter.prototype.listeners = function(type) {
    if(this.wildcard) {
      var handlers = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handlers, ns, this.listenerTree, 0);
      return handlers;
    }

    this._events || init.call(this);

    if (!this._events[type]) this._events[type] = [];
    if (!isArray(this._events[type])) {
      this._events[type] = [this._events[type]];
    }
    return this._events[type];
  };

  EventEmitter.prototype.listenerCount = function(type) {
    return this.listeners(type).length;
  };

  EventEmitter.prototype.listenersAny = function() {

    if(this._all) {
      return this._all;
    }
    else {
      return [];
    }

  };

  if (typeof define === 'function' && define.amd) {
     // AMD. Register as an anonymous module.
    define('eventemitter',[],function() {
      return EventEmitter;
    });
  } else if (typeof exports === 'object') {
    // CommonJS
    module.exports = EventEmitter;
  }
  else {
    // Browser global.
    window.EventEmitter2 = EventEmitter;
  }
}();

/**
 * 添加继承相同属性的深拷贝合并
 */

/*!
 * klass: a classical JS OOP façade
 * https://github.com/ded/klass
 * License MIT (c) Dustin Diaz 2014
 */

!function (name, context, definition) {
    if (typeof define == 'function') define('base/klass',definition)
    else if (typeof module != 'undefined') module.exports = definition()
    else context[name] = definition()
}('klass', this, function () {

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

    function extendDeep(obj) {
        Array.prototype.slice.call(arguments, 1).forEach(function (source) {
            if (source) {
                for (var prop in source) {
                    if (source[prop] != null && source[prop].constructor === Object) {
                        if (!obj[prop] || obj[prop].constructor === Object) {
                            obj[prop] = obj[prop] || {};
                            extend(obj[prop], source[prop]);
                        } else {
                            obj[prop] = source[prop];
                        }
                    } else {
                        obj[prop] = source[prop];
                    }
                }
            }
        });
        return obj;
    }

    var context = this
        , f = 'function'
        , fnTest = /xyz/.test(function () {
        xyz
    }) ? /\bsupr\b/ : /.*/
        , proto = 'prototype'

    function klass(o) {
        return extend.call(isFn(o) ? o : function () {
        }, o, 1)
    }

    function isFn(o) {
        return typeof o === f
    }

    function wrap(k, fn, supr) {
        return function () {
            var tmp = this.supr
            this.supr = supr[proto][k]
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

    function process(what, o, supr) {
        for (var k in o) {
            if (o.hasOwnProperty(k)) {
                if (o[k] != null && typeof o[k] === 'object') {
                    // 深拷贝合并对象成员
                    what[k] = deepExtend({}, supr[proto][k], o[k])
                } else {
                    what[k] = isFn(o[k])
                    && isFn(supr[proto][k])
                    && fnTest.test(o[k])
                        ? wrap(k, o[k], supr) : o[k]
                }
            }
        }
    }

    function extend(o, fromSub) {
        // must redefine noop each time so it doesn't inherit from previous arbitrary classes
        function noop() {
        }

        noop[proto] = this[proto]
        var supr = this
            , prototype = new noop()
            , isFunction = isFn(o)
            , _constructor = isFunction ? o : this
            , _methods = isFunction ? {} : o

        function fn() {
            if (this.initialize) this.initialize.apply(this, arguments)
            else {
                fromSub || isFunction && supr.apply(this, arguments)
                _constructor.apply(this, arguments)
            }
        }

        fn.methods = function (o) {
            process(prototype, o, supr)
            fn[proto] = prototype
            return this
        }

        fn.methods.call(fn, _methods).prototype.constructor = fn

        fn.extend = arguments.callee
        fn[proto].implement = fn.statics = function (o, optFn) {
            o = typeof o == 'string' ? (function () {
                var obj = {}
                obj[o] = optFn
                return obj
            }()) : o
            process(this, o, supr)
            return this
        }

        return fn
    }

    return klass
});

// Events
// borrow frome Backbone 1.1.2
define('base/events',[
    'lodash'
], function (_) {
    'use strict';

    var Backbone = {};
    var array = [];
    var push = array.push;
    var slice = array.slice;
    var splice = array.splice;

    // Backbone.Events
    // ---------------

    // A module that can be mixed in to *any object* in order to provide it with
    // custom events. You may bind with `on` or remove with `off` callback
    // functions to an event; `trigger`-ing an event fires all callbacks in
    // succession.
    //
    //     var object = {};
    //     _.extend(object, Backbone.Events);
    //     object.on('expand', function(){ alert('expanded'); });
    //     object.trigger('expand');
    //
    var Events = Backbone.Events = {

        // Bind an event to a `callback` function. Passing `"all"` will bind
        // the callback to all events fired.
        on: function (name, callback, context) {
            if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
            this._events || (this._events = {});
            var events = this._events[name] || (this._events[name] = []);
            events.push({ callback: callback, context: context, ctx: context || this });
            return this;
        },

        // Bind an event to only be triggered a single time. After the first time
        // the callback is invoked, it will be removed.
        once: function (name, callback, context) {
            if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
            var self = this;
            var once = _.once(function () {
                self.off(name, once);
                callback.apply(this, arguments);
            });
            once._callback = callback;
            return this.on(name, once, context);
        },

        // Remove one or many callbacks. If `context` is null, removes all
        // callbacks with that function. If `callback` is null, removes all
        // callbacks for the event. If `name` is null, removes all bound
        // callbacks for all events.
        off: function (name, callback, context) {
            var retain, ev, events, names, i, l, j, k;
            if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
            if (!name && !callback && !context) {
                this._events = void 0;
                return this;
            }
            names = name ? [name] : _.keys(this._events);
            for (i = 0, l = names.length; i < l; i++) {
                name = names[i];
                if (events = this._events[name]) {
                    this._events[name] = retain = [];
                    if (callback || context) {
                        for (j = 0, k = events.length; j < k; j++) {
                            ev = events[j];
                            if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                                (context && context !== ev.context)) {
                                retain.push(ev);
                            }
                        }
                    }
                    if (!retain.length) delete this._events[name];
                }
            }

            return this;
        },

        // Trigger one or many events, firing all bound callbacks. Callbacks are
        // passed the same arguments as `trigger` is, apart from the event name
        // (unless you're listening on `"all"`, which will cause your callback to
        // receive the true name of the event as the first argument).
        trigger: function (name) {
            if (!this._events) return this;
            var args = slice.call(arguments, 1);
            if (!eventsApi(this, 'trigger', name, args)) return this;
            var events = this._events[name];
            var allEvents = this._events.all;
            if (events) triggerEvents(events, args);
            if (allEvents) triggerEvents(allEvents, arguments);
            return this;
        },

        // Tell this object to stop listening to either specific events ... or
        // to every object it's currently listening to.
        stopListening: function (obj, name, callback) {
            var listeningTo = this._listeningTo;
            if (!listeningTo) return this;
            var remove = !name && !callback;
            if (!callback && typeof name === 'object') callback = this;
            if (obj) (listeningTo = {})[obj._listenId] = obj;
            for (var id in listeningTo) {
                obj = listeningTo[id];
                obj.off(name, callback, this);
                if (remove || _.isEmpty(obj._events)) delete this._listeningTo[id];
            }
            return this;
        }

    };

    // Regular expression used to split event strings.
    var eventSplitter = /\s+/;

    // Implement fancy features of the Events API such as multiple event
    // names `"change blur"` and jQuery-style event maps `{change: action}`
    // in terms of the existing API.
    var eventsApi = function (obj, action, name, rest) {
        if (!name) return true;

        // Handle event maps.
        if (typeof name === 'object') {
            for (var key in name) {
                obj[action].apply(obj, [key, name[key]].concat(rest));
            }
            return false;
        }

        // Handle space separated event names.
        if (eventSplitter.test(name)) {
            var names = name.split(eventSplitter);
            for (var i = 0, l = names.length; i < l; i++) {
                obj[action].apply(obj, [names[i]].concat(rest));
            }
            return false;
        }

        return true;
    };

    // A difficult-to-believe, but optimized internal dispatch function for
    // triggering events. Tries to keep the usual cases speedy (most internal
    // Backbone events have 3 arguments).
    var triggerEvents = function (events, args) {
        var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
        switch (args.length) {
            case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
            case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
            case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
            case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
            default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args); return;
        }
    };

    var listenMethods = { listenTo: 'on', listenToOnce: 'once' };

    // Inversion-of-control versions of `on` and `once`. Tell *this* object to
    // listen to an event in another object ... keeping track of what it's
    // listening to.
    _.each(listenMethods, function (implementation, method) {
        Events[method] = function (obj, name, callback) {
            var listeningTo = this._listeningTo || (this._listeningTo = {});
            var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
            listeningTo[id] = obj;
            if (!callback && typeof name === 'object') callback = this;
            obj[implementation](name, callback, this);
            return this;
        };
    });

    // Aliases for backwards compatibility.
    Events.bind = Events.on;
    Events.unbind = Events.off;

    // Allow the `Backbone` object to serve as a global event bus, for folks who
    // want global "pubsub" in a convenient place.
    _.extend(Backbone, Events);

    return Events;
});

define('base/aspect',[
    'lodash',
    'jquery',
    'exports'
], function (_, $, exports) {

    'use strict';


    // thx "aralejs"
    // source:  https://github.com/aralejs/base/blob/master/src/aspect.js

    exports.before = function (methodName, callback, context) {
        return weave.call(this, 'before', methodName, callback, context);
    };


    exports.after = function (methodName, callback, context) {
        return weave.call(this, 'after', methodName, callback, context);
    };


    // Helpers
    // -------

    var eventSplitter = /\s+/;

    function weave(when, methodName, callback, context) {
        var names = methodName.split(eventSplitter);
        var name, method;

        while (name = names.shift()) {
            method = getMethod(this, name);
            if (!method.__isAspected) {
                wrap.call(this, name);
            }
            this.on(when + ':' + name, callback, context);
        }

        return this;
    }


    function getMethod(host, methodName) {
        var method = host[methodName];
        if (!method) {
            throw new Error('Invalid method name: ' + methodName);
        }
        return method;
    }


    function wrap(methodName) {
        var old = this[methodName];

        this[methodName] = function () {
            var args = Array.prototype.slice.call(arguments);
            var beforeArgs = ['before:' + methodName].concat(args);

            // prevent if trigger return false
            if (this.trigger.apply(this, beforeArgs) === false) return;

            var ret = old.apply(this, arguments);
            var afterArgs = ['after:' + methodName, ret].concat(args);
            this.trigger.apply(this, afterArgs);

            return ret;
        };

        this[methodName].__isAspected = true;
    }
});

define('base/classBase',[
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

    // thx aurajs
    // borrow from aura: https://github.com/aurajs/aura

    var noop = function () { },
        DEFAULT_NAME = 'veronica',
        console = window.console || {};

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
        this.time = noop;
        return this;
    }

    /**@lends veronica.Logger#*/
    var proto = {
        constructor: Logger,
        /**设置名称*/
        setName: function (name) {
            name || (name = DEFAULT_NAME);
            this.name = name;
            return this;
        },
        /** 启用 */
        enable: function () {
            this._log = (console.log || noop);
            this._info = (console.info || this._info);
            this._warn = (console.warn || this._log);
            this._error = (console.error || this._log);
            this.time = this._time;

            if (Function.prototype.bind && typeof console === "object") {
                var logFns = ["log", "warn", "error"];
                for (var i = 0; i < logFns.length; i++) {
                    console[logFns[i]] = Function.prototype.call.bind(console[logFns[i]], console);
                }
            }

            return this;
        },
        write: function (output, args) {
            var parameters = Array.prototype.slice.call(args);
            parameters.unshift(this.name + ":");
            if (isIE8()) {
                output(parameters.join(' '));
            } else {
                output.apply(console, parameters);
            }
        },
        /** 日志 */
        log: function () {
            this.write(this._log, arguments);
        },
        /** 警告 */
        warn: function () {
            this.write(this._warn, arguments);
        },
        /** 错误 */
        error: function () {
            this.write(this._error, arguments);
        },
        /** 消息 */
        info: function () {
            this.write(this._info, arguments);
        },
        /**
         * 时间
         * @param {string} name - 时间
         * @param {string} tag - 开始计时时不传，结束计时时传 'End'
         */
        _time: function (name, tag) {
            tag || (tag = '');
            console['time' + tag](name);
        }
    };

    Logger.prototype = proto;

    return Logger;
});

// extend
// borrow frome Backbone 1.1.2
define('base/extend',[
], function ($, Events) {
    'use strict';

    // Helpers
    // -------

    // Helper function to correctly set up the prototype chain, for subclasses.
    // Similar to `goog.inherits`, but uses a hash of prototype properties and
    // class properties to be extended.
    var extend = function (protoProps, staticProps) {
        var parent = this;
        var child;

        // The constructor function for the new subclass is either defined by you
        // (the "constructor" property in your `extend` definition), or defaulted
        // by us to simply call the parent's constructor.
        if (protoProps && _.has(protoProps, 'constructor')) {
            child = protoProps.constructor;
        } else {
            child = function () { return parent.apply(this, arguments); };
        }

        // Add static properties to the constructor function, if supplied.
        _.extend(child, parent, staticProps);

        // Set the prototype chain to inherit from `parent`, without calling
        // `parent`'s constructor function.
        var Surrogate = function () { this.constructor = child; };
        Surrogate.prototype = parent.prototype;
        child.prototype = new Surrogate;

        // Add prototype properties (instance properties) to the subclass,
        // if supplied.
        if (protoProps) _.extend(child.prototype, protoProps);

        // Set a convenience property in case the parent's prototype is needed
        // later.
        child.__super__ = parent.prototype;

        return child;
    };

    return extend;
});

// Router
// borrow frome Backbone 1.1.2
define('base/history',[
    './events',
    './extend',
    'jquery'
], function (Events, extend, $) {
    'use strict';

    var Backbone = {
        $: $
    };

    // Backbone.History
    // ----------------

    // Handles cross-browser history management, based on either
    // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
    // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
    // and URL fragments. If the browser supports neither (old IE, natch),
    // falls back to polling.
    var History = Backbone.History = function () {
        this.handlers = [];
        _.bindAll(this, 'checkUrl');

        // Ensure that `History` can be used outside of the browser.
        if (typeof window !== 'undefined') {
            this.location = window.location;
            this.history = window.history;
        }
    };

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

    // Has the history handling already been started?
    History.started = false;

    // Set up all inheritable **Backbone.History** properties and methods.
    _.extend(History.prototype, Events, {

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
            this.options = _.extend({ root: '/' }, this.options, options);
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
                var frame = Backbone.$('<iframe src="javascript:0" tabindex="-1">');
                this.iframe = frame.hide().appendTo('body')[0].contentWindow;
                this.navigate(fragment);
            }

            // Depending on whether we're using pushState or hashes, and whether
            // 'onhashchange' is supported, determine how we check the URL state.
            if (this._hasPushState) {
                Backbone.$(window).on('popstate', this.checkUrl);
            } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
                Backbone.$(window).on('hashchange', this.checkUrl);
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
            Backbone.$(window).off('popstate', this.checkUrl).off('hashchange', this.checkUrl);
            if (this._checkUrlInterval) clearInterval(this._checkUrlInterval);
            History.started = false;
        },

        // Add a route to be tested when the fragment changes. Routes added later
        // may override previous routes.
        route: function (route, callback) {
            this.handlers.unshift({ route: route, callback: callback });
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
            if (!options || options === true) options = { trigger: !!options };

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

    return History;

});

define('base/index',[
    'jquery',
    './lodashExt/index',
    'eventemitter',
    './klass',
    './classBase',
    './events',
    './logger',
    './aspect',
    './history'

], function ($, _, EventEmitter, klass, ClassBase, Events,
    Logger, aspect, History) {

    'use strict';

    var baseLib = {
        _: _,
        $: $,
        EventEmitter: EventEmitter,
        klass: klass,
        ClassBase: ClassBase,
        Events: Events,
        Logger: Logger,
        History: History,
        history: new History,
        aspect: aspect
    };

    return baseLib;
});

define('framework/appPart',[
    '../base/index'
], function (baseLib) {
    var _ = baseLib._;
    var $ = baseLib.$;
    var ClassBase = baseLib.ClassBase;
    var AppPart = ClassBase.extend({
        initialize: function (options) {
            options || (options = {});
            this.supr(options);
            this.options = $.extend(true, this.options, options);
            this._app = options.app || baseLib;
        },
        app: function () {
            return this._app || this;
        },
        logger: function () {
            return this.app().logger;
        },
        appConfig: function (name) {
            return this.app().config;
        },
        loader: function () {
            return this.app().loader.get();
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

    var AppProvider = AppPart.extend({
        initialize: function (options) {
            this.supr(options);
            this._pool = {};
            this._defaultKey = 'default';
            this._nested = false;
        },
        _preprocess: function (data) {
            return data;
        },
        setDefault: function (key) {
            this._defaultKey = key;
        },
        get: function (name) {
            name || (name = this._defaultKey);
            var r = this._nested ? _.get(this._pool, name) :
                this._pool[name];
            return r;
        },
        attach: function (obj) {
            this._pool = extend({}, this._pool, obj);
        },
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
        has: function (name) {
            return typeof this._pool[name] !== 'undefined';
        },
        remove: function (name) {
            this._pool[name] = null;
            delete this._pool[name];
        }
    })

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

    var Router = AppPart.extend({
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

    var AppRouter = Router.extend({
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
            if (app.page.isCurrent(page)) {
                if (!sameParams) {
                    app.mediator.emit('qs-changed', qsToJSON(params));
                } else {
                    return;
                }
            }
            me._changePage(page, params);
        },
        _changePage: _.throttle(function(page, params){
            var app = this.app();
            app.page.change(page, params);
        }, 500),
        execute: function (name, context) {
            app.component.start({
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
     * 添加布局
     * @param {object} layout - 布局配置
     * @example
     * ```
     *   app.layout.add({
     *    'admin': {
     *        html: '<div class="v-render-body"></div>'
     *    }
     *   });
     * ```
     */

    /**
     * @typedef LayoutConfig
     * @property {string} html - 布局的HTML
     * @property {string} url - 获取布局的地址
     */

    /**
     * 获取布局配置
     * @param {string} name - 布局名称
     * @returns {layoutConfig}
     */

    /**
     * 无法直接构造
     * @class veronica.Layout
     * @classdesc 布局
     */

    /**
     * 布局
     * @name layout
     * @memberOf veronica.Application#
     * @type {veronica.Layout}
     */

    var LayoutManager = AppProvider.extend({
        options: {
            rootNode: '.v-layout-root'
        },
        initialize: function(options){
            this.supr(options);
        },
        _preprocess: function (data) {
            if (_.isString(data)) {
                data = {
                    html: data
                };
            }
            return data;
        },
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
         * @fires Application#layout.layoutChanging
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

            /**
             * **消息：** 布局改变中
             * @event Application#layout.layoutChanging
             * @type {string}
             * @property {string} name - 名称
             */
            app.pub('layoutChanging', name, $layoutRoot);

            if (layout.url) {
                dfd = $.get(layout.url).done(function (resp) {
                    layout.html = resp;
                });
            }

            dfd.done(function () {
                $layoutRoot.html(layout.html);
                app.pub('layoutChanged', name);
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
     * 无法通过构造函数直接构造
     * @classdesc 页面相关
     * @class veronica.Page
     */

    /**
     * **消息：** 布局加载完毕
     * @event Application#layout.layoutChanged
     * @param {string} name - 布局名称
     */

    /**
     * **消息：** 页面未找到
     * @event Application#page.pageNotFound
     * @param {string} name - 页面名称
     */

    /**
     * **消息：** 页面加载中
     * @event Application#page.pageLoading
     * @param {string} name - 页面名称
     */

    /**
     * **消息：** 页面加载完毕
     * @event Application#page.pageLoaded
     * @param {string} name - 页面名称
     */

    /**
     * @name page
     * @memberOf veronica.Application#
     * @type {veronica.Page}
     */

    var PageManager = AppProvider.extend({
        options: {
            autoResolvePage: false
        },
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
        // 递归获取所有的父级 widgets 配置
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
         * @function
         * @name currName
         * @memberOf Page#
         */
        getCurrName: function () {
            return this._currPageName;
        },
        _setCurrName: function (name) {
            this._currPageName = name;
        },
        _changeLayout: function (layout) {
            var app = this.app();
            var currPageName = this.getCurrName();
            var currPageConfig = this.get(currPageName);
            if (currPageName === '' || currPageConfig && currPageConfig.layout !== layout) {
                return app.layout.change(layout);
            }
            return doneDeferred();
        },
        _load: function (configs, pageName) {
            var app = this.app();
            return app.component.start(configs, pageName).done(function () {
                // 切换页面后进行垃圾回收
                app.component.recycle();
            });
        },
        // 解析页面配置
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
         * @fires Application#page.pageNotFound
         * @fires Application#page.pageLoading
         * @fires Application#layout.layoutChanged
         * @fires Application#page.pageLoaded
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


    return function (base) {

        base._extend({
            methods: {
                get: function (key) {
                    var match = typeNamePattern.exec(key);
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
                    if(type === 'cmp'){
                        var child = this._findChild(name);
                        return this._getComponent(child.id);
                    }
                },
                _getComponent: function(id){
                    return this.app().component.get(id);
                },
                _getContext: function () {
                    return this.options._source;
                },
                _getBatchName: function(){
                    return this.options._batchName;
                },
                _i18n: function (key) {
                    var i18n = app.i18n.get();
                    return i18n[key];
                },
                /**
                 * 获取后台请求的 url
                 * @param name - url 名称
                 * @return {string}
                 */
                url: function (url) {
                    return this.options.url[url];
                },
                when: function (args) {
                    if (_.isArray(args)) {
                        return $.when.apply($, args);
                    }
                    return $.when;
                },
                /**
                 * 为沙箱记录日志
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
        });
    };
});

define('component/lifecycle',[
    '../base/index'
], function (baseLib) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var noop = $.noop;

    var viewOptions = ['_name', '_widgetName', '_context' ];

    return function (base) {

        // lifecycle

        var lifecycleAblility = {
            /** @lends veronica.View# */
            configs: {
                /**
                 * **`重写`** 视图的自定义初始化代码
                 * @type {function}
                 * @default
                 */
                init: noop,
                setup: noop,
                /**
                 * **`重写`** 自定义销毁，通常用于释放视图使用的全局资源
                 * @type {function}
                 * @example
                 *   _customDestory: function () {
                 *     $(window).off('resize', this.resizeHanlder);
                 *   }
                 */
                destroyed: noop
            },
            /** @lends veronica.View# */
            methods: {
                initialize: function (options) {
                    options || (options = {});
                    this.supr(options);

                    /**
                     * 视图的配置参数
                     * @name options
                     * @memberOf View#
                     * @type {ViewOptions}
                     * @todo 这里参数默认值合并使用了深拷贝，大多数时候其实没必要，目前实际测试速度影响暂时不大
                     */
                    this.options = $.extend(true, {}, this._defaults, this.defaults, options);

                    /**
                     * 唯一标识符
                     * @var {string} _id
                     * @memberOf Component#
                     */
                    this._id = _.uniqueId('component$');
                    _.extend(this, _.pick(options, viewOptions));

                    // set mount node
                    this.$mountNode = $(this.options.el);

                    this._invoke('_setup');
                    this._invoke('setup');

                    this.trigger('created');

                    this.compile();
                },
                _initProps: function(){},
                _listen: function(){},
                _defaultListen: function(){
                    // default listen
                    this.listenTo(this, 'addChild', function (child) {
                        this._listenToDelay(child.options._name, child);
                    });
                    this.listenTo(this, 'addPart', function (key, part) {
                        this._callPartListen(key);
                    });
                    this.listenTo(this, 'created', function () {
                        this._invoke('created');
                    });
                    this.listenTo(this, 'ready', function () {
                        // 自动创建子视图
                        var me = this;
                        if (this.options.autoStartChildren) {
                            $.when(this.parseChildren(), this.startChildren()).then(function(){
                                me._bindViewModel();
                            });
                        }

                        me._invoke('ready');
                    });
                },
                /**
                 * 设置属性和监听
                 * @private
                 */
                _setup: function () {
                    var me = this;

                    this._invoke('_initProps');

                    this._defaultListen();

                    this._listenEventBus();
                    this._listenComponent();

                    this._invoke('_listen');

                    // 设置初始视图模型
                    this.model(this._invoke('defaultModel'));
                },
                stop: function () {
                    this.app().component.stop(this);
                },
                /**
                 * 销毁该视图
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
                },

                _destroy: function () {
                    var app = this.app();
                    this.stopChildren();
                    this.unsub();
                    this.stopListening();
                    this.removeElement();

                    // 销毁第三方组件
                    this._invoke('destroyed');
                }
            }
        };

        base._extend(lifecycleAblility);
    };
});

define('component/communication',[
    '../base/index'
], function (baseLib) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var noop = function () {
    };
    var baseListenTo = baseLib.Events.listenTo;
    var listenPattern = /^(.*)\:(.*)/;
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

    return function (base) {

        base._extend({
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
                delegateDOMEvents: function (domEvents) {
                    domEvents || (domEvents = this._getEvents('dom'));
                    if (!domEvents) {
                        return this;
                    }

                    this.undelegateDOMEvents();
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
                undelegateDOMEvents: function () {
                    this.$el.off('.delegateEvents' + this._id);
                    return this;
                },
                _listenToParent: function (event, handler) {
                    var app = this.app();
                    var me = this;
                    if (this._parent != null) {
                        var parent = app.component.get(this._parent);
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

                _getMediator: function () {
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

                    when.apply(null, promises).then(function () {
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
                    var mediator = this._getMediator();
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
                }
            }
        });

    };

});

define('component/parentChild',[
    '../base/index'
],function (baseLib) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var VER_ROLE = 'data-ver-role';

    return function (base) {

        var options = {
            activeView: null,
            /**
             * 自动创建子部件
             */
            autoStartChildren: true
        };

        /** @lends veronica.View# */
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

        /** @lends veronica.View# */
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
                    var child = app.component.get(id);
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
                    var parent = app.component.get(parentId);
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
            /**
             * 启用子部件，会自动附加该视图标识符作为标记
             * @param {Array.<object>} list 部件配置列表
             * @return {Promise}
             */
            startChildren: function (list, batchName) {
                var me = this;
                var app = this.app();
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

                return app.component.start(list, batchName).done(function () {
                    var children = _.toArray(arguments);
                    _.each(children, function (child) {
                        // 添加为子级
                        me._addChild(child);
                    });

                    // 设置默认活动视图
                    me.options.activeView && me.active(me.options.activeView);
                });
            },
            stopChildren: function () {
                var children = this._children;
                var app = this.app();

                _.each(children, function(child){
                    app.component.stop(child.id);
                });
            },
            parseChildren: function(){
                var widgetList = [];
                var me = this;
                this.$el.find('[' + VER_ROLE + ']').each(function (idx, el) {
                    var $el = $(el);
                    var data = $el.data();

                    data.options || (data.options = {});
                    data.options.el = $el;
                    widgetList.push({
                        name: data.name,
                        xtype: data.verRole,
                        options: data.options
                    });
                });

                return me.startChildren(widgetList);
            },
            _stopChild: function(name){
                var me = this;
                var app = this.app();
                var child = me._findChild(name);
                me.removeChild(name);
                app.component.stop(child.id);
            }
        };

        base._extend({
            props: {
                _children: [],
                _parent: null
            },
            options: options,
            configs: configs,
            methods: methods
        });

    };
});

define('component/mvvm',[
    '../base/index'
],function (baseLib) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var noop = $.noop;

    return function (base) {


        /**
         *
         * @type {{viewEngine: string, bindByBlock: boolean, bindWhenStabled: boolean}}
         */
        var options = {
            viewEngine: '',
            bindByBlock: false
        };

        /** @lends veronica.View# */
        var configs = {
            /**
             * **`重写`** 视图的静态视图模型，所有视图实例和不同的模型对象都会包含的模型属性
             * @type {function|object}
             * @example
             *   staticModel: function (app) {
             *     return {
             *       listSource: app.data.source()
             *     };
             *   }
             */
            defaultModel: function(){
                return {};
            },
            /**

            /**
             * **`重写`** 模型绑定完成后执行的方法
             * @type {function}
             * @example
             *   modelBound: function () {
             *       this.loadData();
             *   }
             */
            modelBound: noop
        };

        /** @lends veronica.View# */
        var methods = {

            /**
             * 创建模型，编写视图模型创建的逻辑
             * @type {function}
             * @param {object} obj - 数据对象
             * @returns {object} 视图模型对象
             * @example
             *   app.view.base._createViewModel = function () {
             *     return kendo.observable(data);
             *   }
             */
            _createViewModel: function (obj) {
                return this._viewEngine().create(obj, this);
            },

            /**
             * 模型绑定，编写视图模型如何与视图进行绑定的逻辑
             * @type {function}
             * @returns {void}
             * @example
             *   app.view.base._bind = function () {
             *     var vm = this.model();
             *     vm.$mount(this.$el.get(0));
             *   }
             */
            _bind: function () {
                var me = this;
                if (this.options.bindByBlock) {
                    this.$el.find('.data-bind-block')
                        .not(this.$el.find('.ver-widget .data-bind-block'))
                        .each(function (i, el) {
                            me._viewEngine().bind(me, $(el), me.model());
                        });
                } else {
                    me._viewEngine().bind(me, this.$el, me.model());
                }
            },
            _viewEngine: function () {
                var app = this.app();
                return app.viewEngine.get(this.options.viewEngine);
            },

            /**
             * 获取或设置视图模型
             * @function
             * @param {object|string} data(propName) - 数据对象 | 属性名称
             * @param {bool} [bind=true] - 设置视图模型后，是否进行视图绑定
             * @returns {object} 视图模型对象
             */
            model: function (data, autoBind) {
                var me = this;
                if (!_.isUndefined(data)) {

                    if (_.isString(data) && this._viewModel) {
                        if (autoBind != null) {
                            this._setModelValue(data, autoBind, this._viewModel);
                        }
                        return this._getModelValue(data);
                    }

                    if (data.toJSON) { // 本身就是viewModel对象
                        this._viewModel = data;
                    } else {
                        var baseModel = {};

                        this._viewModel = this._createViewModel($.extend({}, baseModel, data));
                    }

                    // TODO: delegate model events
                    this._viewEngine().bindEvents(me._viewModel, me);

                    this.trigger('modelInit', this._viewModel);

                    if (autoBind === true) {
                        this._bindViewModel();
                    }
                }
                return this._viewModel;
            },

            // 绑定视图模型
            _bindViewModel: function () {
                if (!this.options.bindEmptyModel && $.isEmptyObject(this._viewModel)) {
                    return;
                }

                this._bind();

                if (!this.$el.hasClass('k-bind-block')) {
                    this.$el.addClass('k-bind-block');
                }
                this.trigger('modelBound', this._viewModel);

                this._uiKit().addParts();

                this.log(this.cid + ' modelBound');
            },

            // 获取模型数据
            _getModelValue: function (name, model) {
                model || (model = this.model());
                return this._viewEngine().get(model, name);
            },
            _setModelValue: function (name, value, model) {
                model || (model = this.model());
                return this._viewEngine().set(model, name, value);
            }
        };

        base._extend({
            options: options,
            configs: configs,
            methods: methods
        });

        base._extendMethod('_setup', function () {
            if (this.model() == null) {
                this.model({});  // 设置该视图的视图模型
            }
        });


        base._extendMethod('_destroy', function () {
            // TODO: 这里没有配合 bindBlock 使用
            this._viewEngine().unbind(this);
            // 清除引用
            this._viewModel = null;
        });
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

    return function (base) {

        var options = {
            el: null,
            replace: true,
            autoRender: true
        };

        var props = {
            _templateIsLoading: false,
            _compiledTpl: null,
            _mountNode: null
        };

        /** @lends veronica.View# */
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
             * **`重写`** 视图渲染完毕后执行的方法
             * @type {function}
             * @example
             *   rendered: function (app) {
             *       this.getModel();
             *   }
             */
            rendered: noop
        };

        /** @lends veronica.View# */
        var methods = {
            $: function (selector) {
                return this.$el.find(selector);
            },
            removeElement: function () {
                if (this.options.replace) {
                    // 换回挂载点
                    this.$el.replaceWith(this.$mountNode);
                } else {
                    this.$el.remove();
                }
                return this;
            },
            setElement: function (element, delegate) {
                if (this.$el) this.undelegateDOMEvents();
                this.$el = element instanceof $ ? element : $(element);

                // 如果不是独立节点，则转换为独立节点
                if (this.$el.length > 1) {
                    this.$el = $('<div></div>').append(this.$el);
                }

                this.el = this.$el[0];

                // hook element
                this.$el
                    .addClass(COMPONENT_CLASS)
                    .data(COMPONENT_REF_NAME, this._id);

                // TODO: 这里涉及到继承时的类名设置
                if (this.options._xtypes) {
                    this.$el.addClass(this.options._xtypes.join(' '));
                }

                if (delegate !== false) this.delegateDOMEvents();
                return this;
            },
            mountElement: function () {
                var app = this.app();
                if (app.component.isCurrBatch(this._getBatchName())) {
                    if (this.options.replace) {
                        // 将挂载点属性复制到当前元素上
                        var me = this;
                        var attrs = this.$mountNode.prop('attributes');
                        _.each(attrs, function (attr) {
                            if(attr.name === 'class'){
                                me.$el.addClass(attr.value);
                                return;
                            }
                            me.$el.attr(attr.name, attr.value);
                        });

                        this.$mountNode.replaceWith(this.$el);

                    } else {
                        this.$mountNode.append(this.$el);
                    }
                }

            },
            _templateEngine: function () {
                var app = this.app();
                return app.templateEngine.get(this.templateEngine);
            },
            /**
             * 渲染界面
             * @fires View#rendered
             */
            render: function () {
                var me = this;
                var el = this._renderTemplate(this._compiledTpl);
                this.setElement(el, true);
                this.mountElement();
                this.trigger('ready');

                return this;
            },
            compile: function (template) {
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

        base._extend({
            props: props,
            options: options,
            configs: configs,
            methods: methods
        });

        base._extendMethod('_listen', function () {
            this.listenTo(this, 'compiled', function (template) {
                this.options.autoRender && this.render();
            })
        })
    };
});

define('component/_combine',[
    './meta',
    './lifecycle',
    './communication',
    './parentChild',
    './mvvm',
    './dom'
], function () {
    var args = Array.prototype.slice.call(arguments);
    return function (base) {
        args.forEach(function(arg){
            arg(base);
        });
    };
});

define('component/index',[
    '../base/index',
    './_combine',
    '../framework/appPart'
], function (baseLib, combineFunction, AppPart) {

    var _ = baseLib._;
    var $ = baseLib.$;
    var extend = _.extend;

    /**
     * @classdesc 视图
     * @class veronica.View
     * @augments Backbone.View
     */
    var componentBase = function () {
        var base = extend({}, {
            /**
             * 该视图的默认参数
             * @type {object}
             * @default
             */
            defaults: {},
            _defaults: {},

            _call: function (func, args) {
                func.apply(this, Array.prototype.slice.call(args));
            },
            _extend: function (obj) {
                obj.options && extend(this._defaults, obj.options);
                obj.configs && extend(this, obj.configs);
                obj.methods && extend(this, obj.methods);

                // 加入运行时属性
                if (obj.props) {
                    this._extendMethod('_initProps', function () {
                        var me = this;
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
            }
        });
        combineFunction(base);
        return base;
    };

    var Component = {};

    Component.base = componentBase();

    // static methods

    /**
     * 创建一个自定义 View 定义
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
            var literal = extend({}, Component.base, obj);
            ctor = AppPart.extend(literal);
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

    Component.extendBase = function (method) {
        var base = Component.base;
        method(base);
        return base;
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

    var ComponentManager = AppProvider.extend({
        options: {
            defaultHostNode: '.v-widget-root'
        },
        initialize: function (options) {
            this.supr(options);
            this._currBatchName = null;
            this._currBatchConfigList = [];
            this._lastBatchConfigList = [];
        },
        register: function(name, def){
            return this.app().componentDef.add(name, def);
        },
        /**
         * 规范化创建 widget 的配置
         * @param {string|Object} config - 配置
         * @returns {Object}
         */
        normalizeConfig: function (config) {
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
                arr[3] || me.options.defaultHostNode;

            config.options._name = config.name;

            return config;
        },
        /**
         * 规范化一批配置
         * @param {string|Object} config - 配置
         * @param {string} batchName - 所属批次名称
         * @returns {Object}
         */
        normalizeBatchConfig: function (configs, batchName) {
            var me = this;
            configs = _.map(configs, function (config) {
                var nConfig = me.normalizeConfig(config, batchName);
                nConfig.options._batchName = batchName;
                return nConfig;
            });

            // 去重
            return uniqBy(configs, function (item) {
                return item.options.el;  // 确保一个元素上只有一个插件
            });
        },
        isCurrBatch: function (batchName) {
            var app = this.app();
            return !batchName || !app.page || app.page.isCurrent(batchName);
        },
        /**
         * 启动一个或一组 widget
         * @param {WidgetStartConfig[]|WidgetStartConfig} list - widget 配置（列表）
         * @param {string} [batchName] - 当前加载的widget列表所属批次名称
         * @returns {Promise}
         * @fires Application#widget.widgetLoaded
         * @fires Application#widget.widgetsLoaded
         */
        start: function (list, batchName) {
            var promises = [];
            var me = this;
            var app = this.app();
            var dfd = $.Deferred();
            var defManager = app.componentDef;

            app.busy(true);

            list = me.normalizeBatchConfig(ensureArray(list), batchName);

            me._updateCurrConfigList(list, batchName);

            each(list, function (config) {

                if (config.xtype === 'empty') {
                    me.clearDom(config.options.el, config.options._exclusive);
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
                    var initializer = arg[0];  // widget
                    var options = arg[1];  // options

                    // Bugfixed：修复频繁切换页面导致错误加载的bug，当部件所在的页面不是当前页面，则不执行
                    if (me.isCurrBatch(options._batchName)) {
                        me.clearDom(options.el, options._exclusive);

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

                /**
                 * **消息：** 所有widget全部加载完毕
                 * @event Application#widget.widgetsLoaded
                 * @type {*}
                 */
                app.pub("widgetsLoaded");

                dfd.resolve.apply(dfd, components);
            });

            return dfd.promise();
        },
        /**
         * 清理某个宿主元素下的插件，对不在插件列表中插件进行删除
         * @param {string|DOM|jQueryObject} 宿主对象
         * @returns {void}
         */
        clearDom: function (hostNode, force) {
            var me = this;
            if (!hostNode) return;
            // if (force == null) {
            //     force = false;
            // }
            //
            // var expectList = _.filter(me._currBatchConfigList, function (config) {
            //     return config.options._hostNode === hostNode;
            // });
            var actualList = me.findDom($(hostNode));

            each(actualList, function (item) {
                var $item = $(item);
                me.stopByDom($item);

                // var stopIt = force;
                // if (!force) {
                //     // 将实际存在的widget与期望存在的列表进行匹配
                //     var expectExists = _.some(expectList, function (conf) {
                //         var hasClass = $item.hasClass(conf.name);
                //         var sameTag = conf.options._tag === $item.data('verTag');
                //         return hasClass && sameTag;
                //     });
                //     stopIt = !expectExists;
                // }
                // if (stopIt) {
                //     me.stopByDom($item);
                //     // TODO: 如果使用强制删除，这里会造成期望列表不匹配
                // }
            });

        },
        /**
         * 更新当前的配置列表
         * @param {Array} list - 配置列表
         * @param {string} batchName - 批次名称
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
         * 找到 widget 的 DOM
         * @param $context
         * @returns {*}
         */
        findDom: function (parent) {
            return $(parent).find('.' + COMPONENT_CLASS);
        },

        /**
         * 停止 widget
         * @param id
         */
        stop: function (id) {
            var me = this;
            var app = this.app();

            var obj = _.isString(id) ? me.get(id) : id;
            if (obj == null) {
                return;
            }

            // 从父元素中该 widget
            var parent = me.get(obj._parent);
            parent && parent.removeChild(obj._name);

            // 全局移除
            me.remove(obj._id);

            // 调用插件的自定义销毁方法
            obj.destroy();
        },
        stopAll: function () {
            _.each(this._runningPool, function (obj) {
                obj.destroy();
            })
            this._runningPool = [];
        },
        stopByDom: function (dom) {
            var me = this;
            var obj = me.getByDom(dom);
            if (obj) {
                me.stop(obj);
            }

            me.findDom(dom).each(function (i, child) {
                me.stop($(child));
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

    var ComponentDefManager = AppProvider.extend({
        options: {
            defaultContext: null,
            autoParseContext: false
        },
        _getLoadPackage: function (name, context) {
            var me = this;
            var app = this.app();
            var isDebug = app.env.isDebug();
            var location = app.config.releaseComponentPath + '/' + name;  // release component

            if (isDebug) {
                var mod = app.module.get(context);
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
        app.createPart('mediator', baseLib.EventEmitter);
        app.createPart('logger', baseLib.Logger);
        app.createPart('componentDef', frameworkLib.ComponentDefManager);
        app.createPart('component', frameworkLib.ComponentManager);
        app.createPart('layout', frameworkLib.LayoutManager);
        app.createPart('page', frameworkLib.PageManager);
        app.createPart('router', frameworkLib.AppRouter);
        app.createProvider('componentPart');
        app.createProvider('uiKit');
        app.createProvider('templateEngine');
        app.createProvider('viewEngine');
        app.createProvider('module');
        app.createProvider('i18n');

        app.history = baseLib.history;

        // ComponentPart

        var eventPattern = /^(\S+)\s*(.*)$/;
        app.componentPart.add('ui', {
            create: function(){

            },
            listen: function(view, name, listener){
                var match = eventPattern.exec(name);
                var event = match[1];
                var target = match[2];
                target = view.ui('[data-ref='+ target +']');

                if(target != null){
                    target.bind(event, _.bind(listener, view));
                }
            }
        });

        // UIKit

        app.uiKit.add('default', {
            init: function (view, $dom) {

            },
            create: function (name, options) {

            },
            addParts: function (view) {

            },
            destroy: function () {
            },
            getInstance: function () {
            }
        });

        // ViewEngine

        app.viewEngine.add('default', {
            bind: function (view, $dom, model) {

            },
            unbind: function () {

            },
            create: function (data) {
                return data;
            },
            bindEvents: function (vm, view) {

            },
            get: function () {

            },
            set: function () { }
        });

        // Template Engine

        app.templateEngine.add('default', {
            options: function (view) {
                return {};
            },
            compile: function (text) {
                return function () {
                    return text;
                }
            }
        });

        app.templateEngine.add('underscore', {
            options: function (view) {
                return _.extend({ }, view.options);
            },
            compile: function (text, view) {
                return _.template(text, { variable: 'data' });
            }
        });

        app.templateEngine.add('lodash', {
            options: function(view) {
                return _.extend({ }, view.options);
            },
            compile: function(text, view) {
                return _.template(text, { variable: 'data' });
            }
        });

        // Module

        /**
         * @name module
         * @type {veronica.ModuleManager}
         * @memberOf veronica.Application#
         */
        app.module.add('default', {
            name: 'default',
            path: 'widgets',
            multilevel: false,
            locationPattern: /(\w*)-?(\w*)-?(\w*)-?(\w*)-?(\w*)/,
            resolvePath: function () {
                var path = this.path;
                return path.replace('${name}', this.name);
            },
            resolveLocation: function (name) {
                var me = this;
                var resolvedName = name;
                if (me.multilevel === true) {
                    var parts = me.locationPattern.exec(name);
                    resolvedName = _.reduce(parts, function (memo, name, i) {
                        // 因为第0项是全名称，所以直接跳过
                        if (name === '') { return memo; }
                        if (i === 1) {
                            // 如果第一个与source名称相同，则不要重复返回路径
                            if (name === me.name) { return ''; }
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
    './appInjection'
], function (baseLib, frameworkLib, appInjection) {

    'use strict';

    var extend = baseLib.$.extend;
    var AppPart = frameworkLib.AppPart;
    var AppProvider = frameworkLib.AppProvider;

    /**
     * @classdesc 应用程序类
     * @class Application
     * @memberOf veronica
     */
    var Application = AppPart.extend({
        initialize: function (options) {
            var me = this;
            var defaultOptions = {
                name: 'app',
                autoBuildPage: false,  // 自动生成页面配置
                autoParseWidgetName: false,  // 自动解析 widget 名称
                autoParseContext: false,
                releaseWidgetPath: './widgets',  // 发布后的 widget 路径

                global: true,  // 全局 app
                layout: {
                    rootNode: '.v-layout-root'
                },
                page: {
                    autoResolvePage: false,
                    autoBuild: false,
                    defaultConfig: {
                        layout: 'default',
                        inherits: ['_common']
                    },
                    defaultLayout: 'default',  // 默认布局
                    defaultLayoutRoot: 'v-render-body',  // 默认布局根
                    defaultSource: 'basic',  // 默认源
                    defaultInherit: '_common'  // 默认页面继承
                },
                component: {
                    namePattern: '',
                    releasePath: './widgets'
                },
                mediator: {
                    wildcard: true,
                    delimiter: '.',
                    newListener: true,
                    maxListeners: 50
                },
                router: {
                    homePage: 'home'
                }
            };

            options = extend(true, {}, defaultOptions, options || {});
            
            this._busy = false;
            this._taskQueue = [];
            this.name = options.name;
            this.config = options;
            
            appInjection(this);

            this._subscribe();
        },
        _subscribe: function () {
            // listen
            var me = this;
            me.sub('layoutChanging', function (name, $root) {
                me.widget.stop($root);
            })
        },
        /**
         * 设置或获取是否忙
         * @param {boolean} [busy] - 是否忙碌
         * @returns {boolean}
         */
        busy: function(busy){
            if(busy != null){
                var origin = this._busy;
                this._busy = busy;
                // 如果不忙碌，则运行所有任务
                if(origin !== busy && busy === false){
                    this._runTask();
                }
            }
            return this._busy;
        },
        _runTask: function(){
            var queue = this._taskQueue;
            while (queue.length > 0) {
                (queue.shift())();
            }
        },
        addTask: function(task){
            this._taskQueue.push(task);
        },
        /**
         * 启动应用程序，开始页面路由
         * @fires Application#appStarted
         * @returns {void}
         */
        start: function () {
           
            this.history.start({pushState: false});
            /**
             * **消息：** 应用程序页面启动完成
             * @event Application#appStarted
             */
            this.pub('appStarted');
        },
        /**
         * 停止应用程序
         */
        stop: function () {
            this.widget.stopAll();
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
        },
        /**
         * 应用程序广播事件，它会在广播时自动附加应用程序名
         * @param {string} name 消息名称
         * @param {...unknowned} args  消息参数
         */
        pub: function () {
            var args = Array.prototype.slice.call(arguments);
            // args[0] = args[0] + '.' + this.name;
            args.push(this.name);
            this.mediator.emit.apply(this.mediater, args);
        },
        sub: function (name, callback) {
            this.mediator.on(name, callback);
        },
        /**
         * 创建部件
         * @param {string} name - 名称
         * @param {function} ctor - 构造器
         * @param {Object} [options] - 初始化参数
         * @returns {Object}
         */
        createPart: function (name, ctor, options) {
            var me = this;
            // 从 application 中读取配置
            options = extend({
                app: me
            }, me.config[name], options);
            
            var part = new ctor(options);
            if (name != null) {
                me[name] = part;
            }
            return part;
        },
        /**
         * 创建提供者部件
         * @param {string} name - 名称
         * @param {function} [ctor=AppProvider] - 构造器
         * @param {Object} options - 调用参数
         * @returns {*|Object}
         */
        createProvider: function (name, ctor, options) {
            if (ctor == null) {
                ctor = AppProvider;
            }
            if (typeof ctor === 'object') {
                ctor = AppProvider.extend(ctor);
            }
            return this.createPart(name, ctor, options);
        }
    });

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

    // entry method
    coreLib.createApp = function (options) {
        if (window.__verApp) {
            window.__verApp.stop();
        }
        var app = new Application(options);
        app.core = coreLib;
        if (app.config.global) {
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
