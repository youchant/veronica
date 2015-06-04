//Copyright 2012, etc.

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD.
        define(['jquery', 'underscore'], factory);
    } else {
        // Browser globals
        root.veronica = factory(root.$, root._);
    }
}(this, function ($, dialog) {


/**
 * @license almond 0.3.0 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
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
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                name = baseParts.concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
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

define("../bower_components/almond/almond", function(){});

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
              console.trace();
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
      if (!this._events.newListener) { return false; }
    }

    // Loop through the *_all* functions and invoke them.
    if (this._all) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
      for (i = 0, l = this._all.length; i < l; i++) {
        this.event = type;
        this._all[i].apply(this, args);
      }
    }

    // If there is no 'error' event listener then throw.
    if (type === 'error') {

      if (!this._all &&
        !this._events.error &&
        !(this.wildcard && this.listenerTree.error)) {

        if (arguments[1] instanceof Error) {
          throw arguments[1]; // Unhandled 'error' event
        } else {
          throw new Error("Uncaught, unspecified 'error' event.");
        }
        return false;
      }
    }

    var handler;

    if(this.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    }
    else {
      handler = this._events[type];
    }

    if (typeof handler === 'function') {
      this.event = type;
      if (arguments.length === 1) {
        handler.call(this);
      }
      else if (arguments.length > 1)
        switch (arguments.length) {
          case 2:
            handler.call(this, arguments[1]);
            break;
          case 3:
            handler.call(this, arguments[1], arguments[2]);
            break;
          // slower
          default:
            var l = arguments.length;
            var args = new Array(l - 1);
            for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
            handler.apply(this, args);
        }
      return true;
    }
    else if (handler) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

      var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        this.event = type;
        listeners[i].apply(this, args);
      }
      return (listeners.length > 0) || !!this._all;
    }
    else {
      return !!this._all;
    }

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
          console.trace();
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
      }
    }

    return this;
  };

  EventEmitter.prototype.offAny = function(fn) {
    var i = 0, l = 0, fns;
    if (fn && this._all && this._all.length > 0) {
      fns = this._all;
      for(i = 0, l = fns.length; i < l; i++) {
        if(fn === fns[i]) {
          fns.splice(i, 1);
          return this;
        }
      }
    } else {
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
      if (!this._events[type]) return this;
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
    exports.EventEmitter2 = EventEmitter;
  }
  else {
    // Browser global.
    window.EventEmitter2 = EventEmitter;
  }
}();

// Events
// borrow frome Backbone 1.1.2
define('core/events',[
    'underscore'
], function (_) {
    

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

// extend
// borrow frome Backbone 1.1.2
define('core/extend',[
], function ($, Events) {
    

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

// View
// borrow frome Backbone 1.1.2
define('core/view',[
    'jquery',
    'underscore',
    './events',
    './extend'
], function ($, _, Events, extend) {
    

    var Backbone = {
        $: $
    };

    // Backbone.View
    // -------------

    // Backbone Views are almost more convention than they are actual code. A View
    // is simply a JavaScript object that represents a logical chunk of UI in the
    // DOM. This might be a single item, an entire list, a sidebar or panel, or
    // even the surrounding frame which wraps your whole app. Defining a chunk of
    // UI as a **View** allows you to define your DOM events declaratively, without
    // having to worry about render order ... and makes it easy for the view to
    // react to specific changes in the state of your models.

    // Creating a Backbone.View creates its initial element outside of the DOM,
    // if an existing element is not provided...
    var View = Backbone.View = function (options) {
        this.cid = _.uniqueId('view');
        options || (options = {});
        _.extend(this, _.pick(options, viewOptions));
        this._ensureElement();
        this.initialize.apply(this, arguments);
        this.delegateEvents();
    };

    // Cached regex to split keys for `delegate`.
    var delegateEventSplitter = /^(\S+)\s*(.*)$/;

    // List of view options to be merged as properties.
    var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

    // Set up all inheritable **Backbone.View** properties and methods.
    _.extend(View.prototype, Events, {

        // The default `tagName` of a View's element is `"div"`.
        tagName: 'div',

        // jQuery delegate for element lookup, scoped to DOM elements within the
        // current view. This should be preferred to global lookups where possible.
        $: function (selector) {
            return this.$el.find(selector);
        },

        // Initialize is an empty function by default. Override it with your own
        // initialization logic.
        initialize: function () { },

        // **render** is the core function that your view should override, in order
        // to populate its element (`this.el`), with the appropriate HTML. The
        // convention is for **render** to always return `this`.
        render: function () {
            return this;
        },

        // Remove this view by taking the element out of the DOM, and removing any
        // applicable Backbone.Events listeners.
        remove: function () {
            this.$el.remove();
            this.stopListening();
            return this;
        },

        // Change the view's element (`this.el` property), including event
        // re-delegation.
        setElement: function (element, delegate) {
            if (this.$el) this.undelegateEvents();
            this.$el = element instanceof Backbone.$ ? element : Backbone.$(element);
            this.el = this.$el[0];
            if (delegate !== false) this.delegateEvents();
            return this;
        },

        // Set callbacks, where `this.events` is a hash of
        //
        // *{"event selector": "callback"}*
        //
        //     {
        //       'mousedown .title':  'edit',
        //       'click .button':     'save',
        //       'click .open':       function(e) { ... }
        //     }
        //
        // pairs. Callbacks will be bound to the view, with `this` set properly.
        // Uses event delegation for efficiency.
        // Omitting the selector binds the event to `this.el`.
        // This only works for delegate-able events: not `focus`, `blur`, and
        // not `change`, `submit`, and `reset` in Internet Explorer.
        delegateEvents: function (events) {
            if (!(events || (events = _.result(this, 'events')))) return this;
            this.undelegateEvents();
            for (var key in events) {
                var method = events[key];
                if (!_.isFunction(method)) method = this[events[key]];
                if (!method) continue;

                var match = key.match(delegateEventSplitter);
                var eventName = match[1], selector = match[2];
                method = _.bind(method, this);
                eventName += '.delegateEvents' + this.cid;
                if (selector === '') {
                    this.$el.on(eventName, method);
                } else {
                    this.$el.on(eventName, selector, method);
                }
            }
            return this;
        },

        // Clears all callbacks previously bound to the view with `delegateEvents`.
        // You usually don't need to use this, but may wish to if you have multiple
        // Backbone views attached to the same DOM element.
        undelegateEvents: function () {
            this.$el.off('.delegateEvents' + this.cid);
            return this;
        },

        // Ensure that the View has a DOM element to render into.
        // If `this.el` is a string, pass it through `$()`, take the first
        // matching element, and re-assign it to `el`. Otherwise, create
        // an element from the `id`, `className` and `tagName` properties.
        _ensureElement: function () {
            if (!this.el) {
                var attrs = _.extend({}, _.result(this, 'attributes'));
                if (this.id) attrs.id = _.result(this, 'id');
                if (this.className) attrs['class'] = _.result(this, 'className');
                var $el = Backbone.$('<' + _.result(this, 'tagName') + '>').attr(attrs);
                this.setElement($el, false);
            } else {
                this.setElement(_.result(this, 'el'), false);
            }
        }

    });

    View.extend = extend;

    return View;
});

// Router
// borrow frome Backbone 1.1.2
define('core/history',[
    './events',
    './extend',
    'jquery'
], function (Events, extend, $) {
    

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
            return _.any(this.handlers, function (handler) {
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

    // Create the default Backbone.history.
    Backbone.history = new History;

    return Backbone.history;

});

// Router
// borrow frome Backbone 1.1.2
define('core/router',[
    'underscore',
    './events',
    './extend',
    './history'
], function (_, Events, extend, history) {
    

    var Backbone = { history: history };

    // Backbone.Router
    // ---------------

    // Routers map faux-URLs to actions, and fire events when routes are
    // matched. Creating a new one sets its `routes` hash, if not set statically.
    var Router = Backbone.Router = function (options) {
        options || (options = {});
        if (options.routes) this.routes = options.routes;
        this._bindRoutes();
        this.initialize.apply(this, arguments);
    };

    // Cached regular expressions for matching named param parts and splatted
    // parts of route strings.
    var optionalParam = /\((.*?)\)/g;
    var namedParam = /(\(\?)?:\w+/g;
    var splatParam = /\*\w+/g;
    var escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;

    // Set up all inheritable **Backbone.Router** properties and methods.
    _.extend(Router.prototype, Events, {

        // Initialize is an empty function by default. Override it with your own
        // initialization logic.
        initialize: function () { },

        // Manually bind a single named route to a callback. For example:
        //
        //     this.route('search/:query/p:num', 'search', function(query, num) {
        //       ...
        //     });
        //
        route: function (route, name, callback) {
            if (!_.isRegExp(route)) route = this._routeToRegExp(route);
            if (_.isFunction(name)) {
                callback = name;
                name = '';
            }
            if (!callback) callback = this[name];
            var router = this;
            Backbone.history.route(route, function (fragment) {
                var args = router._extractParameters(route, fragment);
                router.execute(callback, args);
                router.trigger.apply(router, ['route:' + name].concat(args));
                router.trigger('route', name, args);
                Backbone.history.trigger('route', router, name, args);
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
            Backbone.history.navigate(fragment, options);
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

    });

    Router.extend = extend;

    return Router;
});

// core
define('core/loader',[
    'jquery'
], function ($) {

    

    var loader = {};

    loader.useGlobalRequire = function () {
        return window.require ? window.require : require;
    };

    loader.useGlobalRequirejs = function () {
        return window.requirejs ? window.requirejs : requirejs;
    }

    loader.require = function (modules, condition, requireConfig) {

        var dfd = $.Deferred();
        var require = loader.useGlobalRequire();

        if (condition) {
            if (!$.isArray(modules)) { modules = [modules]; }

            if (requireConfig) {
                require.config(requireConfig);
            }

            require(modules, function () {
                var args;
                if (arguments.length === 1) {
                    args = arguments[0];
                } else {
                    args = Array.prototype.slice.call(arguments);
                }
                dfd.resolve(modules, args);
            }, function (err) {
                console.error(err);
                dfd.reject(err);
            });
        } else {
            dfd.resolve(modules, null);
        }
        return dfd.promise();
    }

    return loader;

});


define('util/logger',[], function () {
    

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

    function Logger(name) {
        this.name = name || DEFAULT_NAME;
        this._log = noop;
        this._warn = noop;
        this._error = noop;
        this._info = noop;
        this.time = noop;
        return this;
    }

    Logger.prototype.setName = function (name) {
        name || (name = DEFAULT_NAME);
        this.name = name;
        return this;
    };

    Logger.prototype.enable = function () {
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
    };

    Logger.prototype.write = function (output, args) {
        var parameters = Array.prototype.slice.call(args);
        parameters.unshift(this.name + ":");
        if (isIE8()) {
            output(parameters.join(' '));
        } else {
            output.apply(console, parameters);
        }
    };

    Logger.prototype.log = function () {
        this.write(this._log, arguments);
    };

    Logger.prototype.warn = function () {
        this.write(this._warn, arguments);
    };

    Logger.prototype.error = function () {
        this.write(this._error, arguments);
    };

    Logger.prototype.info = function () {
        this.write(this._info, arguments);
    };

    Logger.prototype._time = function (name, tag) {
        tag || (tag = '');
        console['time' + tag](name);
    };

    return Logger;
});

// core
define('util/util',[
    'underscore'
], function (_) {

    

    function qsToJSON(str) {
        str || (str = location.search.slice(1));
        var pairs = str.split('&');

        var result = {};
        pairs.forEach(function (pair) {
            pair = pair.split('=');
            result[pair[0]] = decodeURIComponent(pair[1] || '');
        });

        return JSON.parse(JSON.stringify(result));
    }

    // 将字符串转换成反驼峰表示
    function decamelize(camelCase, delimiter) {
        delimiter = (delimiter === undefined) ? '_' : delimiter;
        return camelCase.replace(/([A-Z])/g, delimiter + '$1').toLowerCase();
    }

    // 将字符串转换成驼峰表示
    function camelize(str) {
        return str.replace(/(?:^|[-_])(\w)/g, function (_, c) {
            return c ? c.toUpperCase() : '';
        });
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

    // Thx: http://stackoverflow.com/questions/6491463/accessing-nested-javascript-objects-with-string-key
    function getter(o, s) {
        s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
        s = s.replace(/^\./, '');           // strip a leading dot
        var a = s.split('.');
        while (a.length) {
            var n = a.shift();
            if (n in o) {
                o = o[n];
            } else {
                return;
            }
        }
        return o;
    }

    function setter(o, s, v) {
        s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
        s = s.replace(/^\./, '');           // strip a leading dot
        var a = s.split('.');
        var body = 'o';
        var p = o;
        while (a.length) {
            var n = a.shift();
            if (n in p || a.length === 0) {
                body += '["' + n + '"]';
                p = p[n];
            } else {
                return;
            }
        }
        body += '=v;';
        (new Function('o, v', body))(o, v);
    }

    return {
        decamelize: decamelize,
        camelize: camelize,
        extend: extend,
        include: include,
        mixin: mixin,
        getter: getter,
        setter: setter,
        qsToJSON: qsToJSON
    };

});

define('util/aspect',[
    'underscore',
    'jquery',
    'exports'
], function (_, $, exports) {

    


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

    _.mixin({
        aopBefore: function (originFunc, func) {
            return function () {
                var args = arguments;
                var ret = func.call(this, args);
                if (ret === false) { return false; }
                if (ret && ret.done) {
                    return ret.done(function () {
                        originFunc.apply(this, args);
                    }).fail(function () {
                        return false;
                    });
                } else {
                    return originFunc.apply(this, args);
                }
            };
        },
        aopAfter: function (originFunc, func) {
            return function () {
                var ret = originFunc.apply(this, arguments);
                if (ret === false) { return false; }
                if (ret && ret.done) {
                    return ret.done(function () {
                        func.apply(this, arguments);
                    }).fail(function () {
                        return false;
                    });
                } else {
                    return func.apply(this, arguments);
                }
            };
        }
    });

});

// core
define('core/core',[
    'jquery',
    'underscore',
    'eventemitter',
    './events',
    './view',
    './history',
    './router',
    './loader',
    '../util/logger',
    '../util/util',
    '../util/aspect'

], function ($, _, EventEmitter, Events,
    View, history, Router, loader, Logger, util, aspect) {

    

    var core = {
        $: $,
        _: _,
        ext: {},
        helper: {},
        View: View,
        Router: Router,
        history: history,
        Events: Events,
        constant: {
            DEFAULT_MODULE_NAME: '__default__'
        }
    };

    core.loader = loader;
    core.util = util;

    core.aspect = aspect;


    // 获取全局配置
    core.getConfig = (function () {
        var requirejs = core.loader.useGlobalRequirejs();
        var globalConfig = requirejs.s ? requirejs.s.contexts._.config : {
            sources: {}
        };

        globalConfig.sources || (globalConfig.sources = {});

        return function () {
            return globalConfig;
        };
    }());

    core.logger = new Logger();
    if (core.getConfig().debug) {
        core.logger.enable();
    }

    // 中介者
    var emitterConfig = _.defaults(core.getConfig() || {}, {
        wildcard: true,
        delimiter: '.',
        newListener: true,
        maxListeners: 50
    });

    core.mediator = new EventEmitter(emitterConfig);

    return core;
});

// 应用程序模块
define('core/application',[
    './core'
], function (core) {
    

    var Application = (function () {

        function Application(options) {
            var $ = core.$;

            this._extensions = [];
            this.name = options.name;
            this.core = core;
            this.lang = {};
            this.config = $.extend({
                extensions: [],
                modules: []
            }, options);
        }

        // 初始化应用程序
        Application.prototype.launch = function () {
            var promises = [];
            var me = this;

            // 加载扩展
            _(this.config.extensions).each(function (ext) {

                var dfd = core.loader.require(ext, _.isString(ext)).done(function (ext, fn) {
                    _.isFunction(fn) && me.use(fn);
                });

                promises.push(dfd);
            });

            // 加载模块
            _(this.config.modules).each(function (moduleConfig) {

                var module = me.module.create(moduleConfig);
                var entryFileUrl = module.path + '/' + module.config.entryPath;
                var dfd = core.loader.require(entryFileUrl, moduleConfig.hasEntry)
                    .done(function (m, fn) {
                        module.execution = fn;
                        me.module.add(module);
                    });

                promises.push(dfd);
            });

            return $.when.apply($, promises).done(function () {
                me.module.apply();
                me.widget.package();
            });
        };

        // 停止应用程序
        Application.prototype.stop = function () {
            this.sandbox.stop();
        };

        // 使用用户扩展
        Application.prototype.use = function (ext) {
            var me = this;
            if (!_.isArray(ext)) {
                ext = [ext];
            }
            $.each(ext, function (i, func) {
                func(me, Application);
            });
            return this;
        };

        // 混入
        Application.prototype.mixin = function (mixin, isExtend) {
            if (isExtend == null) {
                isExtend = true;
            }
            if (isExtend) {
                this.core.util.mixin(this, mixin);
            } else {
                this.core.util.mixin(Application, mixin);
            }
            return this;
        };

        // 扩展方法：应用程序广播事件，自动附加应用程序名
        Application.prototype.emit = function () {
            var args = Array.prototype.slice.call(arguments);
            // args[0] = args[0] + '.' + this.name;
            args.push(this.name);
            this.sandbox.emit.apply(this.sandbox, args);
        };

        Application.prototype.hasFeature = function () {

        }

        return Application;
    })();

    return Application;

});

define('app/emitQueue',[
], function () {

    

    return function (app) {
        var _ = app.core._;
        var $ = app.core.$;

        // 消息发送队列，插件加载时由于异步，会导致消息监听丢失，因此使用该队列做缓存
        // eg. [['open', 'who'], ['send', 'msg']]
        app.emitQueue = {
            _emitQueue: [],
            empty: function () {
                var emitQueue = this._emitQueue;
                while (emitQueue.length > 0) {
                    (emitQueue.shift())();
                }
            },
            push: function (emit) {
                this._emitQueue.push(emit);
            }
        }
    };

});

define('app/page',[], function () {

    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;
        var appConfig = app.config;

        app.mixin({
            _pages: {
                // 页面的基类
                '_common': {
                    widgets: []
                },
                currPageName: ''
            }
        });

        function preprocessPageConfig(item) {
            if (item.widgets && item.widgets.length !== 0) {
                _.each(item.widgets, function (widget, j) {
                    if (_.isString(widget)) {
                        var sep = widget.split('@');
                        item.widgets[j] = {
                            name: sep[0],
                            options: {
                                host: sep[1] || appConfig.page.defaultHost,
                                _source: sep[2] || appConfig.page.defaultSource
                            }
                        };
                    }
                });
            } else {
                item.widgets.push({
                    name: ''
                });
            }
            return item;
        }

        app.mixin({
            _changeTitle: function () { },
            _inherit: function (pageConfig) {
                var me = this;
                var parentsWidgets = _(pageConfig.inherit).map(function (parentName) {
                    return me.getPage(parentName).widgets;
                });
                parentsWidgets.unshift(pageConfig.widgets);
                return _.uniq(_.union.apply(_, parentsWidgets), false, function (item) {
                    if (item.options && item.options.el) return item.options.el;  // 确保一个元素上只有一个插件
                    return item.name + item.options.host;  // 确保一个父元素下，只有一个同样的插件
                });

            },
            isCurrPage: function (page) {
                return this._pages.currPageName === 'default' || this._pages.currPageName === page;
            },
            getPage: function (name) {
                var config = this._pages[name];
                return config;
            },
            getCurrPage: function () {
                return this.getPage('currPageName');
            },
            addPage: function (configs) {
                if (!_.isArray(configs)) {
                    configs = [configs];
                }
                _.each(configs, function (config) {
                    _(config).each(function (item, pageName) {
                        item = preprocessPageConfig(item);
                        config[pageName] = $.extend({
                            name: '',
                            layout: appConfig.page.defaultLayout,
                            widgets: [{
                                name: pageName,
                                options: {
                                    _host: appConfig.page.defaultHost,
                                    _source: appConfig.page.defaultSource
                                }
                            }],
                            inherit: [appConfig.page.defaultInherit]
                        }, item);
                    });

                    $.extend(app._pages, config);
                });

                return this;
            },
            switchPage: function (name, params) {
                var config = this.getPage(name);
                var dfd;
                var widgetsConfig;
                var me = this;

                // 自动生成页面配置
                if (!config && app.config.autoBuildPage) {
                    var obj = {};
                    obj[name] = app.page.defaultConfig(name);
                    app.page.add(obj);
                    config = this.getPage(name);
                }

                // 未找到页面配置
                if (!config) {

                    // 尝试从后台获取页面配置
                    dfd = $.Deferred();
                    var pageUrl = name.replace('-', '/');
                    $.getJSON(pageUrl).done(function (resp) {
                        config = resp;
                        me._loadPage(name, config, params).done(function () {
                            dfd.resolve();
                        }).fail(function () {
                            dfd.reject();
                        });
                    }).fail(function () {
                        me.emit('pageNotFound', name);
                        dfd.reject();
                    });

                    return dfd.promise();
                } else {
                    return this._loadPage(name, config, params);
                }
            },
            _loadPage: function (name, config, params) {
                var me = this;
                var widgetsConfig = this._inherit(config);
                if (params) {  // 如果传入了页面参数
                    var paramsObj = app.core.util.qsToJSON(params);
                    if (paramsObj) {
                        _.each(widgetsConfig, function (conf) {
                            conf.options = $.extend(conf.options, paramsObj);
                        });
                    }
                }
                var currPageName = app.getCurrPage();
                var currPageConfig;
                var dfd = $.Deferred();

                this.emit('pageLoading', name);

                // 在页面加载之前，进行布局的预加载
                if (currPageName === '' ||
                    (currPageConfig = app.getPage(currPageName)) && currPageConfig.layout !== config.layout) {

                    app.switchLayout(config.layout).done(function () {
                        app.emit('layoutSwitched', config.layout);
                        me._pages.currPageName = name;
                        me.sandbox.startWidgets(widgetsConfig, name).done(function () {
                            // 切换页面后进行垃圾回收
                            me.widget.recycle();
                            me.emit('pageLoaded', name);
                            dfd.resolve();
                        });

                    }).fail(function () {
                        dfd.reject();
                    });
                } else {
                    this._pages.currPageName = name;
                    return this.sandbox.startWidgets(widgetsConfig, name).done(function () {
                        // 切换页面后进行垃圾回收
                        me.widget.recycle();
                        me.emit('pageLoaded', name);
                        dfd.resolve();
                    });
                }
                return dfd.promise();
            },
            startPage: function (initLayout) {
                var me = this;
                me.startRouter();
                if (initLayout) {
                    this.initLayout();
                }
                me.emit('appStarted');
            }

        }, false);

        // API风格更改
        app.page = {
            active: function (name) {
                if (name) {
                    return app.switchPage(name);
                } else {
                    name = app.getPage('currPageName');
                }
                return name;
            },
            // 获取默认配置
            defaultConfig: function (pageName) {
                var data = app.page.parseName(pageName);
                return {
                    widgets: [
                        data.fullname + '@' + app.config.page.defaultHost + '@' + data.module
                    ]
                };
            },
            parseName: function (pageName) {

                var result;
                var token = pageName.indexOf('/') > -1 ? '/' : '-';
                var arr = pageName.split(token);
                // TODO: 这里
                switch (arr.length) {
                    case 1:
                        result = {
                            module: 'basic',
                            controller: 'Home',
                            action: arr[0]
                        };
                        break;
                    case 2:
                        result = {
                            module: 'basic',
                            controller: arr[0],
                            action: arr[1]
                        };
                        break;
                    case 3:
                        result = {
                            module: arr[0],
                            controller: arr[1],
                            action: arr[2]
                        };
                        break;
                }

                result.fullname = result.module + '-' + result.controller + '-' + result.action;
                return result;
            },
            // 获取页面配置
            get: function (name) {
                return app.getPage(name);
            },
            isActive: function (name) {
                return app.isCurrPage(name);
            },
            add: function (configs) {
                return app.addPage(configs);
            },
            start: function (preLoad) {
                return app.startPage(preLoad);
            },
            change: function (name) {
                return app.switchPage(name);
            }
        }

    };
});

define('app/layout',[
], function () {

    

    return function (app) {
        var _ = app.core._;
        var $ = app.core.$;
        var PAGEVIEW_CLASS = 'v-render-body';

        app.mixin({
            _layouts: {
                'scaffold': { html: '<div class="' + PAGEVIEW_CLASS + '"></div>' }
            }
        });

        app.mixin({
            addLayout: function (layout) {
                $.extend(this._layouts, layout);
                return this;
            },
            getLayout: function (name) {
                return this._layouts[name];
            },
            switchLayout: function (layoutName) {
                var me = this;
                var dfd = $.Deferred();
                var $pageView = $('.' + PAGEVIEW_CLASS);

                if ($pageView.length === 0) {
                    $pageView = $('body');
                }
                _.each($pageView.find('.ver-widget'), function (el) {
                    me.widget.stop($(el));
                });
                var layout = this.getLayout(layoutName);
                if (layout) {
                    this.emit('layoutSwitching', layoutName);
                    if (layout.url) {
                        $.get(layout.url).done(function (resp) {
                            $pageView.html(resp);
                            dfd.resolve();
                        });
                    } else {
                        $pageView.html(layout.html);
                        dfd.resolve();
                    }
                } else {
                    dfd.resolve();
                }

                return dfd.promise();
            },
            // 初始化布局
            initLayout: function () {
                var scaffold = this.getLayout('scaffold');
                if (scaffold.html) {
                    $('body').prepend(scaffold.html);
                }
            }
        }, false);

        app.layout = {
            add: function (layout) {
                return app.addLayout(layout);
            },
            active: function (name) {
                return app.switchLayout(name);
            },
            get: function (name) {
                return app.getLayout(name);
            },
            init: function () {
                return app.initLayout();
            }
        }
    };

});
define('app/module',[
], function () {

    

    return function (app) {
        var _ = app.core._;

        var Mod = (function () {
            function Mod(options) {
                _.extend(this, options);
            }

            Mod.prototype = {
                constructor: Mod,
                // 添加源
                addSource: function (sources) {
                    var me = this;
                    _.each(sources, function (src, name) {
                        app.core.getConfig().sources[name] = me.path + '/' + src;
                    });
                },
                // 添加插件
                addPlugin: function (plugin) {
                    app.plugin.add(plugin, this.name);
                },
                // 添加组件
                addControl: function (control) {
                    var cts = app.core.getConfig().controls;

                    cts || (cts = []);
                    if (!_.isArray(control)) {
                        control = [control];
                    }
                    app.core.getConfig().controls = _.uniq(cts.concat(control));
                },
                // 添加页面
                addPage: function (page) {
                    app.addPage(page);
                },
                addExtension: function (extensions) {
                    app.use(extensions);
                },
                addLayout: function (layouts) {
                    app.addLayout(layouts);
                }
            };

            return Mod;
        })();

        // 模块
        app.module = {
            _modules: {}, // { path, execution }
            // 应用模块
            apply: function () {
                var me = this;

                _.each(this._modules, function (mod) {
                    var src = {};
                    src[mod.name] = mod.config.widgetPath;

                    mod = new Mod(mod);

                    // 将模块路径添加为源
                    mod.addSource(src);

                    mod.execution && mod.execution(mod, app);
                });
            },
            create: function (options, execution) {
                // 将字符类型的模块配置转换成对象
                if (_.isString(options)) {
                    options = {
                        name: options,
                        source: dms
                    };
                }

                _.defaults(options, app.config.module.defaults);

                var source = app.core.getConfig().sources[options.source] || options.source;

                return {
                    name: options.name,
                    config: options,
                    path: options.path || source + '/' + options.name,
                    execution: execution
                };
            },
            add: function (module) {
                this._modules[module.name] = module;
            },
            get: function (name) {
                return this._modules[name];
            },
            // 获取模块路径
            path: function (moduleName) {
                return this._modules[moduleName].path;
            }
        };
    };

});

define('app/navigation',[
], function () {

    

    return function (app) {
        var _ = app.core._;

        function createNav(data) {
            _.each(data, function (item, index) {
                if (item.items) {
                    createNav(item.items);
                    item.items = _.compact(item.items);
                }
                if (item.url) {
                    var pageConfig = app.page.get(item.url);
                    if (pageConfig) {
                        if (!item.name) {
                            item.name = pageConfig.name;
                        }
                        if (!item.code && pageConfig.code) {
                            item.code = pageConfig.code;
                        }
                    } else {
                        data[index] = false;
                    }
                }
            });
        }

        app.navigation = {
            _nav: null,

            create: function (data) {
                createNav(data);
                this._nav = _.compact(data);
            },
            get: function () {
                return this._nav;
            }
        }
    };

});

define('app/plugin',[
], function () {

    

    return function (app) {
        var _ = app.core._;

        // 插件
        app.plugin = {
            _plugins: {},
            _pluginCache: {},
            getConfig: function (widgetName) {
                var pluginRelations = app.config.plugins[widgetName];
                if (pluginRelations == null) return [];
                return pluginRelations;
            },
            // 解析部件下所有插件请求路径
            resolvePath: function (widgetName) {
       
                var widgetPlugins = this._plugins[widgetName];
                var globalConfig = app.core.getConfig();
                if (_.isUndefined(widgetPlugins)) {
                    return [];
                }
                return _.map(widgetPlugins, function (plugin) {
                    var path;
                    var name = plugin.name;
                    var prefix = 'pl-' + plugin.module + '-';

                    // 非调试模式下，路径是固定的
                    if (globalConfig.debug === true) {
                        path = app.module.path(plugin.module) + '/plugins/';
                        //var idx = plugin.name.indexOf(prefix);
                        //if (idx > -1) {
                        //    name = plugin.name.substr(idx + prefix.length);
                        //}
                    } else {
                        path = './plugins/';
                    }
                    return {
                        name: plugin.name,
                        location: path + name
                    };
                });
            },
            // 添加插件配置
            add: function (pluginConfigs, moduleName) {
                var allPlugins = this._plugins;
                _.each(pluginConfigs, function (config) {
                    if (_.isString(config)) { config = { name: 'pl-' + moduleName + '-' + config, target: config }; }
                    var pluginName = config.name;
                    var widgetName = config.target;

                    if (_.isUndefined(allPlugins[widgetName])) {
                        allPlugins[widgetName] = [];
                    }

                    allPlugins[widgetName].push({ name: pluginName, module: moduleName });
                });
            },
            cache: function (widgetName, plugins) {
                // 清空缓存
                var cache = this._pluginCache[widgetName] = {};

                _.each(plugins, function (plugin) {
                    var result = plugin(app);
                    _.each(result, function (execution, key) {
                        if (_.isUndefined(cache[key])) {
                            cache[key] = [];
                        }
                        cache[key].push(execution);
                    });
                });
            },
            execute: function (widgetName, viewObj) {
                var name = viewObj._name;
                if (widgetName === name) {
                    name = 'main';
                }
                if (!this._pluginCache[widgetName]) {
                    return;
                }
                // 获取某个 widget 下的某个 _name 的 view
                var plugins = this._pluginCache[widgetName][name];
                _.each(plugins, function (plugin) {
                    plugin.call(viewObj);
                });
            }
        }

    };

});

define('core/sandbox',[
    './core'
], function (core) {

    

    var _ = core._;

    var Sandbox = (function () {

        function Sandbox() {
            this._ = core._;
            this.$ = core.$;
            this._children = [];
            this.events = [];
            this.ext = core.ext;
            this.helper = core.helper;
            this.type = 'sandbox';
        }

        var attachListener = function (listenerType) {
            return function (name, listener, context, tag) {
                var mediator = core.mediator;
                if (!_.isFunction(listener) || !_.isString(name)) {
                    throw new Error('Invalid arguments passed to sandbox.' + listenerType);
                }
                context = context || this;
                var callback = function () {
                    var args = Array.prototype.slice.call(arguments);

                    listener.apply(context, args);  // 将该回调的上下文绑定到sandbox

                };

                this._events = this._events || [];
                this._events.push({
                    name: name,  // 消息名
                    listener: listener,  // 原始方法
                    callback: callback,
                    tag: tag  // 标识符
                });

                mediator[listenerType](name, callback);
            };
        };

        // 为每个沙箱记录日志
        Sandbox.prototype.log = function (msg, type) {
            type || (type = 'log');
            core.logger.setName(this._hostType + '(' + this.name + ')');
            if (_.isArray(msg)) {
                var info = [];
                info.push(msg.shift());
                info.push(msg.shift());
                info.push(msg);
                core.logger[type].apply(core.logger, info);
            } else {
                core.logger[type](msg);
            }
            core.logger.setName();
        };

        Sandbox.prototype.getConfig = core.getConfig;

        // 监听
        Sandbox.prototype.on = attachListener('on');

        // 监听一次
        Sandbox.prototype.once = attachListener('once');

        // 移除监听
        Sandbox.prototype.off = function (name, listener) {
            var mediator = core.mediator;
            if (!this._events) {
                return;
            }
            this._events = _.reject(this._events, function (evt) {
                var ret = (evt.name === name && evt.listener === listener);
                if (ret) {
                    mediator.off(name, evt.callback);
                }
                return ret;
            });
        };

        // 广播事件
        Sandbox.prototype.emit = function () {
            var mediator = core.mediator;
            var app = core.app;
            var eventData = Array.prototype.slice.call(arguments);

            var emitFunc = _.bind(function () {
                mediator.emit.apply(mediator, eventData);
                eventData.unshift('emitted')
                this.log(eventData);
            }, this);

            if (app.widget.isLoading) {
                app.emitQueue.push(emitFunc);
            } else {
                emitFunc();
            }
        };

        // 停止该沙箱中的消息监听
        Sandbox.prototype.stopListening = function (tag) {
            var mediator = core.mediator;
            var events = this._events;

            if (!this._events) {
                return;
            }

            if (tag) {
                events = _(events).filter(function (evt) {
                    return evt.tag === tag;
                })
            }
            _(events).each(function (evt) {
                mediator.off(evt.name, evt.callback);
            });
        };

        // 通过沙箱开启插件，所开启的插件成为该插件的子插件
        Sandbox.prototype.startWidgets = function (list, page, tag) {
            var app = core.app;

            return app.widget.start(list, _.bind(function (widget) {
                var sandbox = widget.sandbox;
                sandbox._parent = this._ref;
                this._children.push({ ref: sandbox._ref, caller: tag });
            }, this), page);
        };

        // 停止并销毁该沙箱
        Sandbox.prototype.stop = function () {
            var app = core.app;
            app.widget.stop(this);
        };

        // 停用子部件
        Sandbox.prototype.stopChildren = function (callerId) {
            var children = this._children;
            var app = core.app;

            if (callerId) {
                children = _(children).filter(function (cd) {
                    return cd.caller === callerId;
                });
            }

            _.invoke(_.map(children, function (cd) {
                return app.sandboxes.get(cd.ref);
            }), 'stop');

        };

        return Sandbox;
    })();

    return Sandbox;
});

define('app/sandboxes',[
    '../core/core',
    '../core/sandbox'
], function (core, Sandbox) {

    

    var _ = core._;

    return function (app) {
        app.sandboxes = {
            _sandboxPool: {}
        };

        // 创建沙箱
        app.sandboxes.create = function (ref, widgetName, hostType) {

            var sandbox = new Sandbox;
            var sandboxPool = this._sandboxPool;  // 沙箱池

            // 即使是相同的插件的sandbox都是唯一的
            if (sandboxPool[ref]) {
                throw new Error("Sandbox with ref " + ref + " already exists.");
            } else {
                sandboxPool[ref] = sandbox;
            }

            sandbox.name = widgetName;
            sandbox._ref = ref;
            sandbox._hostType = hostType;
            sandbox.app = core.app;

            return sandbox;
        };

        // 销毁指定的沙箱
        app.sandboxes.remove = function (ref) {
            this._sandboxPool[ref] = null;
            delete this._sandboxPool[ref];
        };

        // 从沙箱集合中根据引用获取沙箱
        app.sandboxes.get = function (ref) {
            var o = this._sandboxPool[ref];
            return o;
        };

        // 根据插件名称获取沙箱
        app.sandboxes.getByName = function (name) {
            return _(this._sandboxPool).filter(function (o) {
                return o.name === name;
            });
        };
    };

});

// 加载模块
define('app/widget',[],function () {

    

    return function (app) {
        var _ = app.core._;
        var $ = app.core.$;
        var core = app.core;
        var WIDGETS_PATH = app.config.module.defaultWidgetPath; // 默认的插件路径
        var SANDBOX_REF_NAME = '__sandboxRef__';
        var WIDGET_CLASS = 'ver-widget';
        var WIDGET_TAG = 'ver-tag';
        var WIDGET_TYPE = 'widget';
        var require = core.loader.useGlobalRequire();  // 使用 requirejs，而不是

        app.widget = {
            _localWidgetExes: {},  // 本地 widget 初始化器
            _widgetsPool: {},  // 所有部件引用
            currWidgetList: [],  // 当前活动的部件配置列表
            oldWidgetList: [],  // 上一页部件配置列表
            isLoading: false  // 当前批部件是否正在加载
        };

        function hasLocal(name) {
            return !!app.widget._localWidgetExes[name];
        }

        function getLocal(name) {
            return app.widget._localWidgetExes[name];
        }

        // 声明widget为package，以便在其他widget中引用该widget
        app.widget.package = function (widgetNames) {
            var config = { packages: [] };
            widgetNames || (widgetNames = core.getConfig().controls);
            if (_.isString(widgetNames)) {
                widgetNames = [widgetNames];
            }
            _(widgetNames).each(function (name) {
                var ref = name.split('@');
                config.packages.push({
                    name: ref[0],
                    location: getWidgetPath(ref[0], ref[1])
                });
            });
            require.config(config);
        };

        // 注册 widget 为 本地 widget
        app.widget.register = function (name, execution) {
            app.widget._localWidgetExes[name] = execution;
        };

        // 创建 widget
        app.widget.create = function (widgetObj, options) {
            var sandbox = options.sandbox;

            widgetObj._name = options._name;
            widgetObj._ref = options._widgetRef;
            widgetObj.sandbox = sandbox;
            widgetObj.options || (widgetObj.options = options);

            widgetObj.$el && widgetObj.$el
                .addClass(sandbox.name)
                .addClass(WIDGET_CLASS)
                .data(WIDGET_CLASS, sandbox.name)
                .data(WIDGET_TAG, options._tag)
                .data(SANDBOX_REF_NAME, sandbox._ref);  // 在该元素上保存对插件对象的引用

            // 添加到 pool 中
            app.widget._widgetsPool[sandbox._ref] = widgetObj;

            // 获取 widget 实例对象
            sandbox._widgetObj = function () {
                return app.widget._widgetsPool[sandbox._ref];
            };

            return widgetObj;
        };

        // 获取widget路径
        function getWidgetPath(name, source) {
            var widgetPath = WIDGETS_PATH;
            var globalConfig = core.getConfig();
            var widgetName = name;
            var widgetSource = source || core.constant.DEFAULT_MODULE_NAME;

            var widgetNameParts = widgetName.split(app.config.widgetNameSeparator);
            if (widgetSource === core.constant.DEFAULT_MODULE_NAME
                && app.config.autoParseWidgetName === true) {
                widgetSource = widgetNameParts[0];  // 这种情况会覆盖 default 的 source 配置
            }

            var mod = app.module.get(widgetSource); // 根据 source，找出 source 所指向的模块

            if (globalConfig.debug === false) {
                widgetPath = app.config.releaseWidgetPath;
                if (mod && mod.config.build) {
                    widgetPath = (_.template(mod.config.build, {
                        interpolate: /\{\{(.+?)\}\}/g
                    }))({
                        dir: '',
                        baseUrl: './',
                        type: 'widgets'
                    })
                }
            } else {

                // 如果该 source 源下对应的 module 配置为多层级放置 widget
                if (mod && mod.config.multilevel) {

                    widgetName = core.util.camelize(widgetNameParts[1]) + '/' + core.util.camelize(widgetNameParts[2]);
                }

                // 从部件源中读取路径（module 会默认附加自己的source路径）
                widgetPath = (globalConfig.sources && globalConfig.sources[widgetSource]) || widgetPath;
            }

            return widgetPath + '/' + widgetName;
        }

        // 扫描该宿主元素下的所有插件，对不在插件列表中插件进行删除
        function clearOldWidgets(host, exclusive) {
            var oldSandboxRef;
            var currWidgetList = app.widget.currWidgetList;
            var hostExpectList = _(currWidgetList).filter(function (config) {
                return config.options.host === host;
            });
            var hostActualList = $(host).children('.' + WIDGET_CLASS);
            $.each(hostActualList, function (i, item) {
                var $item = $(item);
                var expectExists = _(hostExpectList).some(function (w) {
                    var hasClass = $item.hasClass(w.name);
                    var sameTag = w.options._tag === $item.data('verTag');
                    return hasClass && sameTag;
                });
                if (exclusive || !expectExists) {
                    oldSandboxRef = $item.data(SANDBOX_REF_NAME);
                    oldSandboxRef && app.widget.stop(app.sandboxes.get(oldSandboxRef));
                }
            });

        }

        // 执行部件
        function executeWidget(executor, options) {
            var pageName = options._page;
            var name = options._name;
            var funcResult;  // 部件函数执行结果
            var widgetObj;
            var sandboxRef = _.uniqueId('sandbox$');  // 获取一个唯一的sandbox标识符

            // 部件所在的页面不是当前页面，则不执行
            if (pageName && app.isCurrPage && !app.isCurrPage(pageName)) {
                return;
            } else {
                // 创建 sandbox
                var sandbox = app.sandboxes.create(sandboxRef, name, WIDGET_TYPE);

                // 初始化 options
                options._sandboxRef = sandboxRef;
                options.sandbox = sandbox;
                options._exclusive = options._exclusive || false;  // 是否是独占式widget，一个host只能容纳一个widget

                options.host && clearOldWidgets(options.host, options._exclusive);

                // 将对象转换成执行函数
                executor = app.view.createExecutor(executor);

                if (_.isFunction(executor)) { funcResult = executor(options); }
                if (_.isUndefined(funcResult)) {
                    console.warn('Widget should return an object. [errorWidget:' + name);
                } else {
                    widgetObj = _.isFunction(funcResult) ? funcResult(options) : funcResult;
                    widgetObj = app.widget.create(widgetObj, options);
                }

                return widgetObj;
            }
        };

        // 分隔传入的 widget name
        app.widget.splitName = function (nameTags) {
            var isArray = $.isArray(nameTags);
            if (!isArray) { nameTags = [nameTags]; }
            var result = _.map(nameTags, function (nameTag) {
                var nameParts = nameTag.split('@');
                return {
                    name: nameParts[0],
                    source: nameParts[1]
                };
            });

            return isArray ? result : result[0];
        }

        // 获取 widge package 路径
        app.widget.resolvePath = function (nameParts) {
            var isArray = $.isArray(nameParts);
            if (!isArray) {
                nameParts = [nameParts];
            }

            var result = _.map(nameParts, function (np) {
                return {
                    name: np.name,
                    location: getWidgetPath(np.name, np.source)
                };
            });

            return isArray ? result : result[0];

        };

        // 加载 widget
        app.widget.load = function (nameTag, options, page) {
            var dfd = $.Deferred();
            var pluginNameParts = [];

            // nameTag = core.util.decamelize(nameTag);
            var widgetNameParts = app.widget.splitName(nameTag);
            var name = widgetNameParts.name;
            var nameParts = [widgetNameParts];

            if (app.plugin) {
                pluginNameParts = app.widget.splitName(app.plugin.getConfig(widgetNameParts.name));
                nameParts = nameParts.concat(pluginNameParts);
            }
            var packages = app.widget.resolvePath(nameParts);

            options._name = name;
            options._page = page;

            // 如果是本地部件
            if (hasLocal(name)) {
                var executor = getLocal(name);
                dfd.resolve(executor, options);
            } else {
                core.loader.require(_.map(nameParts, function (p) { return p.name }), true, { packages: packages })
                    .done(function (name, executors) {
                        var others;
                        var executor = executors;
                        if (_.isArray(executor)) {
                            executor = executors[0];
                            others = executors.slice(1);
                        }
                        dfd.resolve(executor, options, others);
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

            return dfd.promise();
        };

        // 加载一个或一组插件
        app.widget.start = function (list, callback, page) {
            var promises = [];
            // 传入单个对象时
            if (_.isObject(list) && !_.isArray(list)) {
                list = [list];
            }

            app.widget.isLoading = true;

            // 当切换页面时候，缓存老部件列表
            if (page) {
                app.widget.oldWidgetList = app.widget.currWidgetList;
                app.widget.currWidgetList = list;
            } else {
                app.widget.currWidgetList = app.widget.currWidgetList.concat(list);
            }


            _(list).each(function (config) {
                var options = config.options || {};
                var host = options.host;
                var widgetName = config.name;
                var noWidget = $(host).find('.' + widgetName).length === 0;  // 该宿主下没有同样名称的 widget

                // 判别是否是完全相同的部件
                var same = _.find(app.widget.oldWidgetList, function (oldConfig) {
                    var sameName = oldConfig.name === config.name;
                    var sameTag = oldConfig.options._tag === config.options._tag;
                    var sameHost = oldConfig.options.host === config.options.host;
                    var sameEl = oldConfig.options.el === config.options.el;

                    return sameName && sameTag && sameHost && sameEl;
                });

                if (widgetName !== 'empty' && (noWidget || (!noWidget && !same))) {
                    promises.push(app.widget.load(widgetName, options, page));
                }

                if (widgetName === 'empty') {
                    host && clearOldWidgets(host);
                }
            });

            return $.when.apply($, promises).done(function () {
                var results = arguments;
                if (promises.length === 1) {
                    results = [arguments];
                }
                // 加载完毕后执行所有部件
                _.each(results, function (arg) {
                    var executor = arg[0];
                    var options = arg[1];
                    var others = arg[2];

                    if (others) app.plugin.cache(options._name, others);
                    var widgetObj = executeWidget(executor, options);
                    if (widgetObj) {
                        callback && callback(widgetObj);  // 每个widget执行完毕后，执行回调
                        core.mediator.emit("widgetLoaded." + widgetObj._name);
                    }
                });

                app.widget.isLoading = false;
                core.mediator.emit("widgetsLoaded");  // 广播插件已全部加载完毕的事件
                app.emitQueue.empty();
            });
        };

        // 停止插件，根据名称
        app.widget.stopByName = function (name) {
            // 传入的是 widget name
            if (_.isString(tag)) {
                // var name = core.util.decamelize(tag);
                _(app.sandboxes.getByName(name)).each(function (sandbox) {
                    app.widget.stop(sandbox);
                });
                return;
            }
        };

        // 停止插件，根据标记
        app.widget.stop = function (tag) {
            // 传入的是 sandbox 实例
            if (tag.type && tag.type === 'sandbox') {
                var sandbox = tag;
                var widgetObj;
                if (!sandbox) {
                    return;
                }
                if (sandbox._widgetObj) {
                    widgetObj = sandbox._widgetObj();
                    if (widgetObj && widgetObj.loadingTemplate) { return; }
                }

                // 从父元素中移除该沙箱
                var parentSandbox = app.sandboxes.get(sandbox._parent);
                if (parentSandbox) {
                    parentSandbox._children.splice(_(parentSandbox._children).indexOf2(function (cd) {
                        return cd.ref === sandbox._ref;
                    }), 1);
                }
                // 从全局移除该沙箱
                app.sandboxes.remove(sandbox._ref);

                // 停用所有子部件
                sandbox.stopChildren();
                // 取消所有消息订阅
                sandbox.stopListening();

                // 清除部件对象
                if (widgetObj) {
                    // 调用插件的自定义销毁方法
                    widgetObj.destroy && widgetObj.destroy();

                    // 移除dom
                    widgetObj.remove ? widgetObj.remove() : widgetObj.$el.remove();
                    widgetObj.options && (widgetObj.options.sandbox = null);
                    widgetObj.sandbox = null;

                    // 全局移除部件对象
                    app.widget._widgetsPool[this._ref] = null;
                    delete app.widget._widgetsPool[this._ref];
                }

                // 在 requirejs 中移除对该插件的引用
                app.widget._unload(sandbox._ref);
                return;
            } else {
                // 传入的是 jQuery 对象
                var sandboxRef, sandbox;
                var el = tag;
                sandboxRef = $(el).data(SANDBOX_REF_NAME);
                var childWidgets = $(el).find('.' + WIDGET_CLASS);
                if (childWidgets.length > 0) {
                    _.each(childWidgets, function (e) {
                        app.widget.stop($(e));
                    });
                }
                if (sandboxRef) {
                    sandbox = app.sandboxes.get(sandboxRef);
                    app.widget.stop(sandbox);
                }
            }
        };

        // 垃圾回收
        app.widget.recycle = function () {
            _(app.sandboxes._sandboxPool).each(function (sandbox) {
                if (!sandbox._widgetObj) return;
                var widgetObj = sandbox._widgetObj();
                if (widgetObj.$el && widgetObj.$el.closest(document.body).length === 0) {
                    // TODO 此种方法可能存在性能问题
                    app.widget.stop(sandbox);
                }
            });
        };

        // 卸载一个模块
        app.widget._unload = function (ref) {
            var key;
            var contextMap = require.s.contexts._.defined;

            for (key in contextMap) {
                if (contextMap.hasOwnProperty(key) && key.indexOf(ref) !== -1) {
                    // 在requirejs中移除对该插件的引用
                    require.undef(key);
                }
            }
        };

    };
});

define('app/parser',[
], function () {

    

    return function (app) {
        var _ = app.core._;
        var $ = app.core.$;
        var VER_ROLE = 'data-ver-role';

        app.parser = {}

        app.parser.parse = function (dom, type) {
            dom || (dom = 'body');

            var widgetList = [];
            $(dom).find('[' + VER_ROLE + ']').each(function (idx, el) {
                var $el = $(el);
                var data = $el.data();

                data.options || (data.options = {});
                data.options.el = $el;
                widgetList.push({
                    name: data.verRole,
                    options: data.options
                });
            });

            app.sandbox.startWidgets(widgetList);
        }

        app.parser.parseView = function (widget, views) {
            $(widget.$el).find('[' + VER_ROLE + ']').each(function (idx, el) {
                var $el = $(el);
                var data = $el.data();

                data.options || (data.options = {});
                data.options.el = $el;
                widget.view(data.verRole, {
                    name: data.verRole,
                    initializer: views[data.verRole],
                    options: data.options
                });
            });
        }
    };

});
define('app/view/view-mvvm',[],function () {

    //var WND_CONTAINER = '#ver-modal';

    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;
        var noop = $.noop;

        app.view.base._createViewModel = function (obj) {
            return obj;
        };
        // 装载视图模型（数据， 是否更新视图绑定-默认更新）
        app.view.base.model = function (data, bind) {
            if (!_.isUndefined(data)) {

                if (_.isString(data) && this.viewModel) {
                    return this.viewModel.get(data);
                }

                if (data.toJSON) { // 本身就是viewModel对象
                    this.viewModel = data;
                } else {
                    this.viewModel = this._createViewModel($.extend({}, this.baseModel, data));
                }

                this.delegateModelEvents(this.viewModel);
                if (bind !== false) {
                    this._bindViewModel();
                }
            }
            return this.viewModel;
        };
        // 创建共享视图模型
        app.view.base.shareModel = function (model) {
            if (_.isUndefined(model)) {
                model = this.options.sharedModel;
            }
            var props = this.options.sharedModelProp;
            if (model) {
                if (props) {
                    var r = {};
                    _.each(props, function (prop) {
                        if (_.isString(prop)) {
                            r[prop] = model.get(prop);
                        } else {
                            r[prop[0]] = model.get(prop[1]);
                        }
                    });
                    return r;
                }
                return model;
            }
            return {};
        };
        // 绑定视图模型
        app.view.base._bindViewModel = function () {
            var sandbox = this.options.sandbox;
            if (!this.options.bindEmptyModel && $.isEmptyObject(this.viewModel)) {
                return;
            }

            this._bind();

            if (!this.$el.hasClass('k-bind-block')) {
                this.$el.addClass('k-bind-block');
            }
            this.trigger('modelBound', this.viewModel);
            sandbox.log(this.cid + ' modelBound');
        };
    };
});

define('app/view/view-view',[],function () {

    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;
        var noop = $.noop;

        // 获取或设置子视图
        app.view.base.view = function (name, view) {
            var me = this;
            if (_.isUndefined(view)) {
                // 获取子视图
                view = this._views[name];
            } else {
                this._destroyView(name);

                view = this._views[name] = this._createSubview(view, name);

                // 取出延迟监听的事件，并进行监听
                _.chain(this._delayEvents).filter(function (obj) {
                    return obj.name === name;
                }).each(function (obj) {
                    me.listenTo(view, obj.event, obj.callback);
                });
            }
            return view;
        };

        // 创建已配置的子视图
        app.view.base._createSubviews = function (views) {
            var me = this;
            views || (views = this.views);
            if (views) {
                var views = _.result(this, 'views');
                // 渲染子视图
                _.each(views, function (func, name) {
                    if (_.isString(func)) { return; }  // 为了排除 active: 'xxx' 的情况
                    me.view(name, func);
                });
                // 设置默认活动视图
                views['active'] && this.active(views['active']);
            }
        };
        // 创建子视图
        app.view.base._createSubview = function (view, name) {
            if (_.isFunction(view)) {  // 方法
                view = view.apply(this);
            }

            if (view.cid) {  // 视图对象
                view._name = name;
                return view;
            }

            // 配置对象
            view.options = view.options || {};
            if (_.isString(view.options.host)) {
                view.options.host = this.$(view.options.host);
            }

            // 确保 initializer 是个方法
            view.initializer = app.view.createExecutor(view.initializer);

            return view.initializer(_.extend({
                sandbox: this.options.sandbox,
                host: view.options.el ? false : this.$el,
                _name: name
            }, view.options));
        };

        // 销毁视图
        app.view.base._destroyView = function (viewName) {
            var me = this;
            if (_.isUndefined(viewName)) {
                // 销毁所有子视图
                _(this._views).each(function (view, name) {
                    me._destroyView(name);
                });
            } else {
                var view = this.view(viewName);
                if (view) {
                    view.stopChildren && view.stopChildren();
                    view.unsub && view.unsub();
                    view.destroy && view.destroy();
                    view.remove && view.remove();
                    view.sandbox && (view.sandbox = null);

                    // 移除对该 view 的引用
                    this._views[viewName] = null;
                    delete this._views[viewName]
                }
            }
        };

        // 激活子视图
        app.view.base.active = function (name) {
            var me = this;
            var targetView;
            if (_.isUndefined(name)) {
                targetView = this.view(this._activeViewName);
                return targetView;
            }

            this._activeViewName = name;
            targetView = this.view(this._activeViewName);

            _(this.options.switchable).each(function (name) {
                me.view(name) && me.view(name).hide();
            });

            targetView.show();

            // 触发事件
            this.trigger('activeView', this._activeViewName);
            targetView.trigger('active');
        };

        // 激活UI
        app.view.base._activeUI = function () {

            // 启用布局控件
            if ($.layout) {
                var me = this;
                setTimeout(function () {
                    _.each(this.$('[data-part=layout]'), function (el) {
                        $(el).layout({
                            applyDemoStyles: false,
                            closable: false,
                            resizable: false,
                            slidable: false,
                            spacing_open: 0
                        });
                    });
                }, 0);
              
            }

        }
    };
});

define('app/view/view-window',[],function () {

    //var WND_CONTAINER = '#ver-modal';

    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;
        var noop = $.noop;

        var loadingText = 'Loading..';

        function removeLoading($el) {
            $el.find('.fn-s-loading').remove();
        }

        // 创建对话框实例
        app.view.base._windowInstance = function ($el, config, destroy, appendToEl) {

            // window 实例
            var dlg = app.ui.dialog($.extend({
                title: '对话框',
                content: $el,// $el.get(0),
                fixed: true,
                drag: config.options.draggable
            }, config.options)).close();  // 解决开始对话框默认显示的问题

            var wnd = {
                element: $el,

                core: dlg,

                positionTo: config.positionTo,
                close: function () {
                    this.core.remove();
                },
                destroy: function () {

                },
                center: function () {
                    this.core.reset();
                },
                open: function () {
                    if (config.options.modal === true) {
                        this.core.showModal(this.positionTo);
                    } else {
                        this.core.show(this.positionTo);
                    }
                },
                rendered: function (view) {
                    var $f = view.$el.find('.footer');
                    if ($f.length > 0 || config.footer === true) {
                        $f.addClass('modal-footer').closest('.ui-dialog-body').addClass('with-footer');
                    }
                    removeLoading(this.element);
                    this.center();
                },
                setOptions: function (opt) {
                    this.core.width(opt.width).height(opt.height).title(opt.title);
                }
            };
            // 移除之前销毁
            wnd.core.addEventListener('beforeremove', destroy);
            wnd.core.addEventListener('remove', function () {
                // 清除添加的对话框元素 TODO: 这里可能会误杀一些隐藏的对话框，后面要进行解决！！
                $('.fn-wnd-placeholder:hidden').remove();
            });

            return wnd;
        };

        // 创建一个显示view的窗口
        app.view.base.viewWindow = function (viewName, viewInitializer, options, wndOptions) {
            return this.window($.extend({
                name: 'wnd_' + viewName,
                children: [{
                    type: 'view',
                    name: viewName,
                    initializer: viewInitializer,
                    options: options
                }]
            }, wndOptions));
        };

        app.view.base.widgetWindow = function (name, options, wndOptions) {
            return this.window($.extend({
                name: 'wnd_' + name,
                children: [{
                    type: 'widget',
                    name: name,
                    options: options
                }]
            }, wndOptions));
        };

        app.view.base.windowName = function () {
            return _.uniqueId('wnd_');
        };

        // 创建显示普通HTML的窗口（必须传入window name）
        app.view.base.htmlWindow = function (html, options, wndOptions) {
            return this.window($.extend({
                options: options,
                el: html
            }, wndOptions));
        }

        // 获取或创建一个window
        app.view.base.window = function (config, isShow) {

            var wnd;
            var me = this;
            var windows = this._windows;
            // 获取窗口
            if (_.isString(config)) {
                return windows[config];
            }
            if (windows[config.name]) {
                return windows[config.name];
            }
            var toBeDestroyed = {};

            // 默认配置
            var defaults = {
                name: '',  // 窗口的唯一标识码
                type: '',
                el: null,
                center: true,
                footer: false,
                destroyedOnClose: true,
                // 窗口配置
                options: {
                    // appendTo: $(WND_CONTAINER),
                    animation: {
                        open: false,
                        close: false
                    },
                    width: 300,
                    height: 200,
                    resizable: false,
                    draggable: false,
                    show: false,
                    visible: false,
                    pinned: false,
                    modal: false
                },
                children: null
            };

            var destroy = _.bind(function () {
                this._destroyWindow(config.name);
            }, this);

            // 创建 Widget
            var createWidget = function (widgetOpt, wnd) {
                if (widgetOpt.length === 0) return;
                var $wndEl = wnd.element.find('.fn-wnd');
                if ($wndEl.length === 0) $wndEl = wnd.element;
                _(widgetOpt).each(function (opt) {
                    opt.options || (opt.options = {});
                    if (opt.options.host) {
                        opt.options.host = $wndEl.find(opt.options.host);
                    } else {
                        opt.options.host = $wndEl;
                    }
                    opt.options.parentWnd = wnd;
                });

                // widgets 加载完毕后移除加载动画
                me.startWidgets(widgetOpt).done(function () {
                    removeLoading($el);
                });
            };
            // 创建 View
            var createView = function (viewOpts, wnd) {
                var me = this;
                var $wndEl = wnd.element;
                _.each(viewOpts, function (viewOpt) {
                    var host = $wndEl.find('.fn-wnd');
                    viewOpt.options = _.extend({
                        host: host.length === 0 ? $wndEl : host,
                        parentWnd: wnd
                    }, viewOpt.options);

                    var view = me.view(viewOpt.name, viewOpt);

                    // 添加 widget class，确保样式正确
                    if (view.options.sandbox) {
                        view.$el.addClass(view.options.sandbox.name);
                    }

                    if (view._rendered) {
                        wnd.rendered(me);
                    } else {
                        view.listenTo(view, 'rendered', function () {
                            wnd.rendered(me);
                        });
                        view.listenTo(view, 'refresh-fail', function () {
                            wnd.close();
                        });
                    }

                    toBeDestroyed[viewOpt.name] = view;
                });

            };
            var defaultWnd = '<div class="fn-wnd fn-wnd-placeholder"><span class="ui-dialog-loading fn-s-loading">' + loadingText + '</span></div>';
            var footer = '<div class="k-footer"><button class="btn btn-default fn-close">关闭</button></div>';

            isShow = isShow == null ? true : isShow;

            config = $.extend(true, defaults, config);

            if (config.name === '') { config.name = _.uniqueId('wnd_'); }

            var $el = config.el == null ? $(defaultWnd) : $(config.el);

            wnd = this._windowInstance($el, config, destroy, this.$el);
            wnd.vLazyLayout = _.debounce(_.bind(function () {
                this.center();
            }, wnd), 300);
            wnd.vToBeDestroyed = toBeDestroyed;

            if (config.children) {
                var widgets = [];
                var views = [];
                _.each(config.children, function (conf) {
                    var type = conf.type || config.type;
                    if (type === 'view') { views.push(conf) };
                    if (type === 'widget') { widgets.push(conf) };
                });

                createView.call(this, views, wnd);
                createWidget.call(this, widgets, wnd);
            } else {
                removeLoading(wnd.element);
            }

            if (wnd) {
                windows[config.name] = wnd;
            }

            // 如果设置了 positionTo, 强制不居中
            if (config.positionTo) {
                config.center = false;
            }

            if (config.center) {
                wnd.center();
                $(window).on('resize', wnd.vLazyLayout);
            }
            if (config.footer) {
                $el.find('.fn-close').on('click', function () {
                    wnd.close();
                });
                $el.parents(".ui-dialog-body").addClass('with-footer');
                //$el.find('.fn-wnd').addClass('with-footer');
            }

            if (isShow) {
                // $('body').addClass('modal-open');
                setTimeout(function () {
                    wnd.open();
                }, 200);
                // $(WND_CONTAINER).scrollTop(0).show();
            }

            return wnd;

        };

        app.view.base._destroyWindow = function (name) {
            var me = this;
            var wnd = this._windows[name];
            var $el = wnd.element;
            var app = this.options.sandbox.app;

            // 销毁窗口内的子视图
            $.each(wnd.vToBeDestroyed, function (name, view) {
                me._destroyView(name);
            });

            // 销毁窗口内的子部件
            app.widget.stop($el);

            $(window).off('resize', wnd.vLazyLayout);

            if (wnd.destroy) {
                wnd.destroy();
            } else {
                $(wnd).remove();
            }

            delete this._windows[name];
        };
    };
});

define('app/view',[
    './view/view-mvvm',
    './view/view-view',
    './view/view-window'
], function (mvvm, subview, subwindow) {

    //var WND_CONTAINER = '#ver-modal';

    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;
        var noop = $.noop;

        //_.templateSettings = {
        //    evaluate: /\{\{(.+?)\}\}/g,
        //    escape: /\{\{-(.+?)\}\}/g,
        //    interpolate: /\{\{=(.+?)\}\}/g,
        //    variable: 'data'
        //};

        var base = {
            template: null,
            defaults: {},
            views: null,
            aspect: noop,
            subscribe: noop,  // 监听外部的消息
            listen: noop,  // 监听子视图
            enhance: noop,  // 进行UI增强
            init: noop,
            initAttr: noop,  // 初始化属性
            listenSelf: noop,  // 监听自身事件
            resize: noop,  // 自适应布局
            delegateModelEvents: noop,  //
            instance: noop,
            _bind: noop,  // 绑定方法
            _customDestory: noop, // 自定义销毁
            className: 'ver-view',
            initialize: function (options) {
                var me = this;
                options || (options = {});
                this.binds = ['resize'];
                this._rendered = false;
                this._windows = {};  // 子窗口集合
                this._views = {};  // 子视图集合
                this._delayEvents = [];
                this._attributes = {};
                this.baseModel = {};  // 默认的基本视图模型
                this.viewModel = {};  // 该视图的视图模型
                this._activeViewName = null;
                this._name = options._name;

                this.options = $.extend(true, {
                    autoAction: false,  // 自动绑定Action事件
                    autoRender: true,  // 自动渲染
                    autoResize: false,  // 自适应布局
                    autoCreateSubview: true,
                    autoBind: false,
                    domReady: false,  // DOM元素已经准备好
                    autoST: false,
                    lazyTemplate: false,
                    defaultToolbarTpl: '.tpl-toolbar',
                    toolbar: 'toolbar',
                    switchable: [],
                    windowOptions: false,
                    sharedModel: null,  // 共享的视图模型
                    sharedModelProp: null,  // 共享视图模型的属性集合
                    langClass: null,
                    bindEmptyModel: false
                }, this.defaults, options);

                // 将方法绑定到当前视图
                if (this.binds) {
                    this.binds.unshift(this);
                    _.bindAll.apply(_, this.binds);
                }

                // 混入AOP方法
                app.core.util.extend(this, app.core.aspect);

                this._loadPlugin();

                this.aspect();
                this.listenSelf();  // 自身事件监听
                // 添加子视图监听
                this.listen();
                if (this.options.autoResize) {
                    this.listenTo(this, 'rendered', function () {
                        _.defer(me.resize);
                    });
                    $(window).on('resize', this.resize);
                }
                this.listenTo(this, 'modelBound', function (model) {
                    // 更新子视图模型
                    _(me._views).each(function (view) {
                        if (view.options.sharedModel || view.options.sharedModelProp) {
                            view.model(view.shareModel(model));
                        }
                    });
                });
                this.listenTo(this, 'rendering', function () {
                    if (this.options.autoCreateSubview) {
                        this._createSubviews();
                    }
                });
                this.listenTo(this, 'rendered', function () {
                    // 在渲染视图后重新绑定视图模型
                    this._bindViewModel();
                    this.options.autoST && this.setTriggers();

                });

                (this.options.sharedModel != null) && this.model(this.shareModel(this.options.sharedModel), false);

                // 初始化窗口大小
                if (this.options.parentWnd && this.options.windowOptions) {
                    this.options.parentWnd.setOptions(this.options.windowOptions);
                    this.options.parentWnd.center();
                }

                // 初始化自定义属性
                this.initAttr();

                this.subscribe();  // 初始化广播监听
                this.init();

                if (this.options.autoAction) {
                    // 代理默认的事件处理程序
                    this.events || (this.events = {});
                    $.extend(this.events, {
                        'click [data-action]': '_actionHandler',
                        'click [data-view]': '_viewHandler',
                        'click [data-widget]': '_widgetHandler'
                    });
                }

                // 渲染
                this.options.autoRender && this._firstRender();
            },
            // 获取设置属性
            attr: function (name, value) {
                if (!_.isUndefined(value)) {
                    this._attributes[name] = value;
                    this.trigger('attr-change', name, value);
                }
                return this._attributes[name];
            },
            // 加载插件
            _loadPlugin: function () {
                var sandbox = this.options.sandbox;
                var app = sandbox.app;
                if (this.options.plugin) {
                    this.options.plugin.call(this);
                }
                app.plugin && app.plugin.execute(sandbox.name, this);
            },

            // 替换模板文件
            replaceTpl: function (origin, content, isDom) {
                if (isDom) {
                    this.template = $('<div>' + this.template + '</div>').find(origin).replaceWith(content).end().html();
                } else {
                    this.template = this.template.replace(origin, content);
                }
            },
            // 显示该视图
            show: function () {
                var me = this;
                this.$el.show(false, function () {
                    if (me.options.autoResize) {
                        me.resize();
                    }
                });
            },
            // 隐藏该视图
            hide: function () {
                this.$el.hide(false);
            },

            updateEl: function (selector, url, data) {
                var $el = this.$(selector);
                if (arguments.length > 2) {
                    $.get(url, data).done(function (resp) {
                        $el.html(resp);
                    });
                } else {
                    $el.html(url);
                }
            },
            _firstRender: function () {
                if (this.options.domReady) {
                    this.enhance();
                    this.trigger('rendered');
                } else {
                    this.render();
                }
            },
            refresh: function (url, data) {
                var me = this;
                if (url == null) {
                    url = _.result(this, 'templateUrl');
                }
                this.loadingTemplate = true;
                $.get(url, data).done(function (template) {
                    me.loadingTemplate = false;
                    if (_.isString(template)) {  // 仅当获取到模板时，才进行渲染
                        me._render(template, true);
                        me.trigger('refresh');
                    } else {
                        me.trigger('refresh-fail');
                    }
                }).fail(function () {
                    me.options.parentWnd && me.options.parentWnd.close();
                });
            },
            // 渲染界面
            render: function (template) {
                template || (template = this.template);

                if (this.templateUrl) {
                    this.refresh();
                } else {
                    if (this.options.el && !template) {
                        // 将当前元素内容作为 template
                        template = _.unescape(this.$el.html());
                    }
                    this._render(template);
                }
                return this;
            },
            _render: function (template, isHtml) {
                var hasTpl = !!template;
                var options = this.options;
                var sandbox = this.options.sandbox;

                if (hasTpl) {
                    if (isHtml) {
                        this.$el.get(0).innerHTML = template;
                    } else {
                        var tpl = _.isFunction(template) ?
                            template : _.template(template, { variable: 'data' });  // 如果使用 Lodash，这里调用方式有差异
                        var html = tpl(_.extend({ lang: app.lang[this.options.langClass] }, this.options));
                        html && (this.$el.get(0).innerHTML = html);
                    }
                }

                this.trigger('rendering');

                // append
                if (this.options.host && this._appended !== true) {
                    var placeMethod = options._place === 1 ? 'prependTo' : 'appendTo';
                    if (!this.options._page || this.options._page === app.page.active()) {
                        this.$el[placeMethod](this.options.host);
                        this._appended = true;
                    }
                };

                sandbox.log(this.cid + ' rendered');
                this._rendered = true;

                this._activeUI();
                this.enhance();
                this.trigger('rendered');

                return this;
            },
            // 延迟监听子视图
            listenToDelay: function (name, event, callback) {
                this._delayEvents.push({
                    name: name,
                    event: event,
                    callback: callback
                });
                if (this.view(name)) {
                    this.listenTo(this.view(name), event, callback);
                }
            },

            // 订阅消息
            sub: function (name, listener) {
                this.options.sandbox.on(name, listener, this, this.cid);
            },
            // 发布消息
            pub: function () {
                this.options.sandbox.emit.apply(this.options.sandbox,
                    Array.prototype.slice.call(arguments));
            },
            // 取消订阅消息
            unsub: function () {
                this.options.sandbox.stopListening(this.cid);
            },
            // 启用子部件
            startWidgets: function (list) {
                return this.options.sandbox.startWidgets(list, null, this.cid);
            },
            // 停用该视图创建的子部件
            stopChildren: function () {
                this.options.sandbox.stopChildren(this.cid);
            },
            setTriggers: function (toolbarTpl) {
                toolbarTpl || (toolbarTpl = this.options.defaultToolbarTpl);
                var sandbox = this.options.sandbox;
                sandbox.emit('setTriggers', this.$(toolbarTpl).html(),
                    this.options.toolbar || sandbox.name, this);
            },
            _actionHandler: function (e, context) {
                e.preventDefault();
                //e.stopImmediatePropagation();

                context || (context = this);
                var $el = $(e.currentTarget);
                if ($el.closest('script').length > 0) return;
                var actionName = $el.data().action;
                if (actionName.indexOf('Handler') < 0) {
                    actionName = actionName + 'Handler';
                }
                context[actionName] && context[actionName](e);
            },
            _getViewTriggerOptions: function (attr) {
                var nameParts = attr.split('?');
                var name = nameParts[0];
                var options = {};
                if (nameParts[1]) {
                    options = app.core.util.qsToJSON(nameParts[1]);
                }
                options._viewName = name;
                return options;
            },
            _viewHandler: function (e) {
                var $el = $(e.currentTarget);
                var options = this._getViewTriggerOptions($el.attr('data-view'));

                var initializer = function (options) {
                    var ctor = app.view.ctor(options._viewName);
                    return new ctor(options);
                };
                this.viewWindow(options._viewName, initializer, options);
            },
            _widgetHandler: function (e) {
                var $el = $(e.currentTarget);
                var options = this._getViewTriggerOptions($el.attr('data-widget'));

                this.widgetWindow(options._viewName, options);
            },
            _destroy: function () {
                // 清理在全局注册的事件处理器
                this.options.autoResize && $(window).off('resize', this.resize);

                // 关闭该组件下的所有弹出窗口
                _(this._windows).each(function (window) {
                    window.close();
                });

                // 销毁该视图的所有子视图
                this._destroyView();

                // 销毁第三方组件
                this._customDestory();

                // 清除引用
                this.viewModel = null;

                this.options.sandbox.log('destroyed');
            },
            destroy: function () {
                this._destroy();
            }
        };

        app.view = {
            _ctors: {}
        };

        app.view.base = base;

        app.view.createExecutor = function (executor) {
            if (_.isObject(executor) && !_.isFunction(executor)) {

                return function (options) {
                    var app = options.sandbox.app;
                    var View = app.view.define(executor);
                    return new View(options);
                }
            } else {
                return executor;
            }
        }

        app.view.register = function (name, ctor) {
            if (app.view._ctors[name]) {
                app.core.logger.warn('View naming conflicts: ' + name);
            } else {
                app.view._ctors[name] = ctor;
            }
        }
        app.view.ctor = function (name) {
            return app.view._ctors[name];
        }

        mvvm(app);
        subview(app);
        subwindow(app);

        app.view.define = function (obj, inherits) {
            inherits || (inherits = []);
            inherits.push(obj);

            var ctor = app.core.View.extend($.extend.apply($, [true, {}, app.view.base].concat(inherits)));
            // 注册 View
            if (obj && obj.name) {
                app.view.register(obj.name, ctor);
            }
            return ctor;
        };
    };
});

define('app/data',[], function () {
    // 全局数据区
    return function (app) {
        var _ = app.core._;

        var data = { _data: {} };

        data.get = function (name) {
            return data._data[name];
        };
        data.set = function (name, value) {
            data._data[name] = value;
            app.sandbox.emit('change.' + name, value);
        };

        app.data = data;
    };
});

// 模板扩展
define('app/templates',['require'], function (require) {
    return function (app) {
        var _ = app.core._;

        app.templates = {
            _templates: {},
            set: function (name, tpl, isRequire) {

                if (isRequire) {
                    isRequire(['text!' + tpl], function (resp) {
                        app.templates._templates[name] = resp;
                    });
                } else {
                    app.templates._templates[name] = tpl;
                }
            },
            get: function (name) {
                return app.templates._templates[name];
            },
            getName: function (tpl) {
                _.each(app.templates._templates, function (item, name) {
                    if (item === tpl) {
                        return name;
                    }
                });
                return null;
            }
        }
    };
});

define('app/router',[],function () {

    return function (app) {
        var _ = app.core._;
        // 延迟页面切换
        var _changePage = _.throttle(function (page, params) {
            app.switchPage(page, params);
        }, 500);

        var router = {

            routes: {
                '(/)': 'entry',
                '(/)?*params': 'entry',
                'page=:page': 'openPage',
                '(/)*page': 'openPage',
                '(/)*page?*params': 'openPage',
                'widget/:widget@:source': 'executeWidget'
            },
            initialize: function () {
                // this.route(new RegExp(app.config.router.pagePattern), 'openPage');
            },
            entry: function (params) {
                this.openPage(app.config.homePage, params);
            },
            executeWidget: function (widgetName, source) {
                app.sandbox.startWidgets({
                    name: widgetName,
                    options: {
                        _source: source || 'default',
                        host: app.config.page.defaultHost
                    }
                });
            },
            _openPage: _changePage,
            openPage: function (page, params) {
                _changePage(page, params);
            }

        };

        return router;
    };
});

define('app/ajax',[
], function () {
    return function (app) {

        var $ = app.core.$;
        app.request = {};

        app.request.get = function (url, data) {
            return $.get(url, data);
        };

        // 获取JSON
        app.request.getJSON = function (url, data) {
            return $.getJSON(url, data);
        };

        // 传入复杂对象进行 GET 请求（需要后台进行JSON字符串的反序列化）
        app.request.getComplex = function (url, data, options) {
            options || (options = {});

            return $.ajax($.extend({
                url: url,
                type: 'GET',
                contentType: "application/json",
                data: JSON.stringify(data)
            }, options));
        };

        // 提交复杂对象到后台，使 ASP.NET MVC 下能够正常进行数据绑定
        app.request.postComplex = function (url, data, options) {
            return $.ajax($.extend({
                url: url,
                type: 'POST',
                contentType: "application/json",
                dataType: 'json',
                data: JSON.stringify(data)
            }, options));
        }

        app.request.post = function (url, data) {
            return $.post(url, data);
        }
    };
});

define('app/hash',[
], function () {
    return function (app) {
        // 添加简单的hash支持

        var hash = function (name, value) {
            function isString(obj) {
                return typeof obj == "string" || Object.prototype.toString.call(obj) === "[object String]";
            }

            if (!isString(name) || name == "") {
                return;
            }
            name = encodeURIComponent(name);
            var clearReg = new RegExp("(;" + name + "=[^;]*)|(\\b" + name + "=[^;]*;)|(\\b" + name + "=[^;]*)", "ig");
            var getReg = new RegExp(";*\\b" + name + "=[^;]*", "i");
            if (typeof value == "undefined") {
                var result = location.hash.match(getReg);
                return result ? decodeURIComponent($.trim(result[0].split("=")[1])) : null;
            }
            else if (value === null) {
                location.hash = location.hash.replace(clearReg, "");
            }
            else {
                value = value + "";
                var temp = location.hash.replace(clearReg, "");
                temp += ";" + name + "=" + encodeURIComponent(value);
                location.hash = temp;
            }
        };

        return hash;

    };
});

/*! artDialog v6.0.5 | https://github.com/aui/artDialog */
!(function () {

var __modules__ = {};

function require (id) {
    var mod = __modules__[id];
    var exports = 'exports';

    if (typeof mod === 'object') {
        return mod;
    }

    if (!mod[exports]) {
        mod[exports] = {};
        mod[exports] = mod.call(mod[exports], require, mod[exports], mod) || mod[exports];
    }

    return mod[exports];
}

function define (path, fn) {
    __modules__[path] = fn;
}



define("jquery", function () {
	return jQuery;
});


/*!
 * PopupJS
 * Date: 2014-11-09
 * https://github.com/aui/popupjs
 * (c) 2009-2014 TangBin, http://www.planeArt.cn
 *
 * This is licensed under the GNU LGPL, version 2.1 or later.
 * For details, see: http://www.gnu.org/licenses/lgpl-2.1.html
 */

define("popup", function (require) {

var $ = require("jquery");

var _count = 0;
var _isIE6 = !('minWidth' in $('html')[0].style);
var _isFixed = !_isIE6;


function Popup () {

    this.destroyed = false;


    this.__popup = $('<div />')
    /*使用 <dialog /> 元素可能导致 z-index 永远置顶的问题(chrome)*/
    .css({
        display: 'none',
        position: 'absolute',
        /*
        left: 0,
        top: 0,
        bottom: 'auto',
        right: 'auto',
        margin: 0,
        padding: 0,
        border: '0 none',
        background: 'transparent'
        */
        outline: 0
    })
    .attr('tabindex', '-1')
    .html(this.innerHTML)
    .appendTo('body');


    this.__backdrop = this.__mask = $('<div />')
    .css({
        opacity: .7,
        background: '#000'
    });


    // 使用 HTMLElement 作为外部接口使用，而不是 jquery 对象
    // 统一的接口利于未来 Popup 移植到其他 DOM 库中
    this.node = this.__popup[0];
    this.backdrop = this.__backdrop[0];

    _count ++;
}


$.extend(Popup.prototype, {
    
    /**
     * 初始化完毕事件，在 show()、showModal() 执行
     * @name Popup.prototype.onshow
     * @event
     */

    /**
     * 关闭事件，在 close() 执行
     * @name Popup.prototype.onclose
     * @event
     */

    /**
     * 销毁前事件，在 remove() 前执行
     * @name Popup.prototype.onbeforeremove
     * @event
     */

    /**
     * 销毁事件，在 remove() 执行
     * @name Popup.prototype.onremove
     * @event
     */

    /**
     * 重置事件，在 reset() 执行
     * @name Popup.prototype.onreset
     * @event
     */

    /**
     * 焦点事件，在 foucs() 执行
     * @name Popup.prototype.onfocus
     * @event
     */

    /**
     * 失焦事件，在 blur() 执行
     * @name Popup.prototype.onblur
     * @event
     */

    /** 浮层 DOM 素节点[*] */
    node: null,

    /** 遮罩 DOM 节点[*] */
    backdrop: null,

    /** 是否开启固定定位[*] */
    fixed: false,

    /** 判断对话框是否删除[*] */
    destroyed: true,

    /** 判断对话框是否显示 */
    open: false,

    /** close 返回值 */
    returnValue: '',

    /** 是否自动聚焦 */
    autofocus: true,

    /** 对齐方式[*] */
    align: 'bottom left',

    /** 内部的 HTML 字符串 */
    innerHTML: '',

    /** CSS 类名 */
    className: 'ui-popup',

    /**
     * 显示浮层
     * @param   {HTMLElement, Event}  指定位置（可选）
     */
    show: function (anchor) {

        if (this.destroyed) {
            return this;
        }

        var that = this;
        var popup = this.__popup;
        var backdrop = this.__backdrop;

        this.__activeElement = this.__getActive();

        this.open = true;
        this.follow = anchor || this.follow;


        // 初始化 show 方法
        if (!this.__ready) {

            popup
            .addClass(this.className)
            .attr('role', this.modal ? 'alertdialog' : 'dialog')
            .css('position', this.fixed ? 'fixed' : 'absolute');

            if (!_isIE6) {
                $(window).on('resize', $.proxy(this.reset, this));
            }

            // 模态浮层的遮罩
            if (this.modal) {
                var backdropCss = {
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                    userSelect: 'none',
                    zIndex: this.zIndex || Popup.zIndex
                };


                popup.addClass(this.className + '-modal');


                if (!_isFixed) {
                    $.extend(backdropCss, {
                        position: 'absolute',
                        width: $(window).width() + 'px',
                        height: $(document).height() + 'px'
                    });
                }


                backdrop
                .css(backdropCss)
                .attr({tabindex: '0'})
                .on('focus', $.proxy(this.focus, this));

                // 锁定 tab 的焦点操作
                this.__mask = backdrop
                .clone(true)
                .attr('style', '')
                .insertAfter(popup);

                backdrop
                .addClass(this.className + '-backdrop')
                .insertBefore(popup);

                this.__ready = true;
            }


            if (!popup.html()) {
                popup.html(this.innerHTML);
            }
        }


        popup
        .addClass(this.className + '-show')
        .show();

        backdrop.show();


        this.reset().focus();
        this.__dispatchEvent('show');

        return this;
    },


    /** 显示模态浮层。参数参见 show() */
    showModal: function () {
        this.modal = true;
        return this.show.apply(this, arguments);
    },
    
    
    /** 关闭浮层 */
    close: function (result) {
        
        if (!this.destroyed && this.open) {
            
            if (result !== undefined) {
                this.returnValue = result;
            }
            
            this.__popup.hide().removeClass(this.className + '-show');
            this.__backdrop.hide();
            this.open = false;
            this.blur();// 恢复焦点，照顾键盘操作的用户
            this.__dispatchEvent('close');
        }
    
        return this;
    },


    /** 销毁浮层 */
    remove: function () {

        if (this.destroyed) {
            return this;
        }

        this.__dispatchEvent('beforeremove');
        
        if (Popup.current === this) {
            Popup.current = null;
        }


        // 从 DOM 中移除节点
        this.__popup.remove();
        this.__backdrop.remove();
        this.__mask.remove();


        if (!_isIE6) {
            $(window).off('resize', this.reset);
        }


        this.__dispatchEvent('remove');

        for (var i in this) {
            delete this[i];
        }

        return this;
    },


    /** 重置位置 */
    reset: function () {

        var elem = this.follow;

        if (elem) {
            this.__follow(elem);
        } else {
            this.__center();
        }

        this.__dispatchEvent('reset');

        return this;
    },


    /** 让浮层获取焦点 */
    focus: function () {

        var node = this.node;
        var popup = this.__popup;
        var current = Popup.current;
        var index = this.zIndex = Popup.zIndex ++;

        if (current && current !== this) {
            current.blur(false);
        }

        // 检查焦点是否在浮层里面
        if (!$.contains(node, this.__getActive())) {
            var autofocus = popup.find('[autofocus]')[0];

            if (!this._autofocus && autofocus) {
                this._autofocus = true;
            } else {
                autofocus = node;
            }

            this.__focus(autofocus);
        }

        // 设置叠加高度
        popup.css('zIndex', index);
        //this.__backdrop.css('zIndex', index);

        Popup.current = this;
        popup.addClass(this.className + '-focus');

        this.__dispatchEvent('focus');

        return this;
    },


    /** 让浮层失去焦点。将焦点退还给之前的元素，照顾视力障碍用户 */
    blur: function () {

        var activeElement = this.__activeElement;
        var isBlur = arguments[0];


        if (isBlur !== false) {
            this.__focus(activeElement);
        }

        this._autofocus = false;
        this.__popup.removeClass(this.className + '-focus');
        this.__dispatchEvent('blur');

        return this;
    },


    /**
     * 添加事件
     * @param   {String}    事件类型
     * @param   {Function}  监听函数
     */
    addEventListener: function (type, callback) {
        this.__getEventListener(type).push(callback);
        return this;
    },


    /**
     * 删除事件
     * @param   {String}    事件类型
     * @param   {Function}  监听函数
     */
    removeEventListener: function (type, callback) {
        var listeners = this.__getEventListener(type);
        for (var i = 0; i < listeners.length; i ++) {
            if (callback === listeners[i]) {
                listeners.splice(i--, 1);
            }
        }
        return this;
    },


    // 获取事件缓存
    __getEventListener: function (type) {
        var listener = this.__listener;
        if (!listener) {
            listener = this.__listener = {};
        }
        if (!listener[type]) {
            listener[type] = [];
        }
        return listener[type];
    },


    // 派发事件
    __dispatchEvent: function (type) {
        var listeners = this.__getEventListener(type);

        if (this['on' + type]) {
            this['on' + type]();
        }

        for (var i = 0; i < listeners.length; i ++) {
            listeners[i].call(this);
        }
    },


    // 对元素安全聚焦
    __focus: function (elem) {
        // 防止 iframe 跨域无权限报错
        // 防止 IE 不可见元素报错
        try {
            // ie11 bug: iframe 页面点击会跳到顶部
            if (this.autofocus && !/^iframe$/i.test(elem.nodeName)) {
                elem.focus();
            }
        } catch (e) {}
    },


    // 获取当前焦点的元素
    __getActive: function () {
        try {// try: ie8~9, iframe #26
            var activeElement = document.activeElement;
            var contentDocument = activeElement.contentDocument;
            var elem = contentDocument && contentDocument.activeElement || activeElement;
            return elem;
        } catch (e) {}
    },


    // 居中浮层
    __center: function () {
    
        var popup = this.__popup;
        var $window = $(window);
        var $document = $(document);
        var fixed = this.fixed;
        var dl = fixed ? 0 : $document.scrollLeft();
        var dt = fixed ? 0 : $document.scrollTop();
        var ww = $window.width();
        var wh = $window.height();
        var ow = popup.width();
        var oh = popup.height();
        var left = (ww - ow) / 2 + dl;
        var top = (wh - oh) * 382 / 1000 + dt;// 黄金比例
        var style = popup[0].style;

        
        style.left = Math.max(parseInt(left), dl) + 'px';
        style.top = Math.max(parseInt(top), dt) + 'px';
    },
    
    
    // 指定位置 @param    {HTMLElement, Event}  anchor
    __follow: function (anchor) {
        
        var $elem = anchor.parentNode && $(anchor);
        var popup = this.__popup;
        

        if (this.__followSkin) {
            popup.removeClass(this.__followSkin);
        }


        // 隐藏元素不可用
        if ($elem) {
            var o = $elem.offset();
            if (o.left * o.top < 0) {
                return this.__center();
            }
        }
        
        var that = this;
        var fixed = this.fixed;

        var $window = $(window);
        var $document = $(document);
        var winWidth = $window.width();
        var winHeight = $window.height();
        var docLeft =  $document.scrollLeft();
        var docTop = $document.scrollTop();


        var popupWidth = popup.width();
        var popupHeight = popup.height();
        var width = $elem ? $elem.outerWidth() : 0;
        var height = $elem ? $elem.outerHeight() : 0;
        var offset = this.__offset(anchor);
        var x = offset.left;
        var y = offset.top;
        var left =  fixed ? x - docLeft : x;
        var top = fixed ? y - docTop : y;


        var minLeft = fixed ? 0 : docLeft;
        var minTop = fixed ? 0 : docTop;
        var maxLeft = minLeft + winWidth - popupWidth;
        var maxTop = minTop + winHeight - popupHeight;


        var css = {};
        var align = this.align.split(' ');
        var className = this.className + '-';
        var reverse = {top: 'bottom', bottom: 'top', left: 'right', right: 'left'};
        var name = {top: 'top', bottom: 'top', left: 'left', right: 'left'};


        var temp = [{
            top: top - popupHeight,
            bottom: top + height,
            left: left - popupWidth,
            right: left + width
        }, {
            top: top,
            bottom: top - popupHeight + height,
            left: left,
            right: left - popupWidth + width
        }];


        var center = {
            left: left + width / 2 - popupWidth / 2,
            top: top + height / 2 - popupHeight / 2
        };

        
        var range = {
            left: [minLeft, maxLeft],
            top: [minTop, maxTop]
        };


        // 超出可视区域重新适应位置
        $.each(align, function (i, val) {

            // 超出右或下边界：使用左或者上边对齐
            if (temp[i][val] > range[name[val]][1]) {
                val = align[i] = reverse[val];
            }

            // 超出左或右边界：使用右或者下边对齐
            if (temp[i][val] < range[name[val]][0]) {
                align[i] = reverse[val];
            }

        });


        // 一个参数的情况
        if (!align[1]) {
            name[align[1]] = name[align[0]] === 'left' ? 'top' : 'left';
            temp[1][align[1]] = center[name[align[1]]];
        }


        //添加follow的css, 为了给css使用
        className += align.join('-') + ' '+ this.className+ '-follow';
        
        that.__followSkin = className;


        if ($elem) {
            popup.addClass(className);
        }

        
        css[name[align[0]]] = parseInt(temp[0][align[0]]);
        css[name[align[1]]] = parseInt(temp[1][align[1]]);
        popup.css(css);

    },


    // 获取元素相对于页面的位置（包括iframe内的元素）
    // 暂时不支持两层以上的 iframe 套嵌
    __offset: function (anchor) {

        var isNode = anchor.parentNode;
        var offset = isNode ? $(anchor).offset() : {
            left: anchor.pageX,
            top: anchor.pageY
        };


        anchor = isNode ? anchor : anchor.target;
        var ownerDocument = anchor.ownerDocument;
        var defaultView = ownerDocument.defaultView || ownerDocument.parentWindow;
        
        if (defaultView == window) {// IE <= 8 只能使用两个等于号
            return offset;
        }

        // {Element: Ifarme}
        var frameElement = defaultView.frameElement;
        var $ownerDocument = $(ownerDocument);
        var docLeft =  $ownerDocument.scrollLeft();
        var docTop = $ownerDocument.scrollTop();
        var frameOffset = $(frameElement).offset();
        var frameLeft = frameOffset.left;
        var frameTop = frameOffset.top;
        
        return {
            left: offset.left + frameLeft - docLeft,
            top: offset.top + frameTop - docTop
        };
    }
    
});


/** 当前叠加高度 */
Popup.zIndex = 1024;


/** 顶层浮层的实例 */
Popup.current = null;


return Popup;

});

// artDialog - 默认配置
define("dialog-config", {

    /* -----已注释的配置继承自 popup.js，仍可以再这里重新定义它----- */

    // 对齐方式
    //align: 'bottom left',

    // 是否固定定位
    //fixed: false,

    // 对话框叠加高度值(重要：此值不能超过浏览器最大限制)
    //zIndex: 1024,

    // 设置遮罩背景颜色
    backdropBackground: '#000',

    // 设置遮罩透明度
    backdropOpacity: 0.7,

    // 消息内容
    content: '<span class="ui-dialog-loading">Loading..</span>',

    // 标题
    title: '',

    // 对话框状态栏区域 HTML 代码
    statusbar: '',

    // 自定义按钮
    button: null,

    // 确定按钮回调函数
    ok: null,

    // 取消按钮回调函数
    cancel: null,

    // 确定按钮文本
    okValue: 'ok',

    // 取消按钮文本
    cancelValue: 'cancel',

    cancelDisplay: true,

    // 内容宽度
    width: '',

    // 内容高度
    height: '',

    // 内容与边界填充距离
    padding: '',

    // 对话框自定义 className
    skin: '',

    // 是否支持快捷关闭（点击遮罩层自动关闭）
    quickClose: false,

    // css 文件路径，留空则不会使用 js 自动加载样式
    // 注意：css 只允许加载一个
    //cssUri: '../css/ui-dialog.css',
    cssUri: '',

    // 模板（使用 table 解决 IE7 宽度自适应的 BUG）
    // js 使用 i="***" 属性识别结构，其余的均可自定义
    //innerHTML:
    //    '<div i="dialog" class="ui-dialog modal-dialog">'
    //    +       '<div class="ui-dialog-arrow-a"></div>'
    //    +       '<div class="ui-dialog-arrow-b"></div>'
    //    +       '<table class="ui-dialog-grid">'
    //    +           '<tr>'
    //    +               '<td i="header" class="ui-dialog-header">'
    //    +                   '<button i="close" class="ui-dialog-close">&#215;</button>'
    //    +                   '<div i="title" class="ui-dialog-title"></div>'
    //    +               '</td>'
    //    +           '</tr>'
    //    +           '<tr>'
    //    +               '<td i="body" class="ui-dialog-body">'
    //    +                   '<div i="content" class="ui-dialog-content"></div>'
    //    +               '</td>'
    //    +           '</tr>'
    //    +           '<tr>'
    //    +               '<td i="footer" class="ui-dialog-footer">'
    //    +                   '<div i="statusbar" class="ui-dialog-statusbar"></div>'
    //    +                   '<div i="button" class="ui-dialog-button"></div>'
    //    +               '</td>'
    //    +           '</tr>'
    //    +       '</table>'
    //    +'</div>'
    innerHTML: '<div class="modal-dialog ui-dialog">' +
                '    <div class="modal-content">' +
                '        <div i="header" class="modal-header">' +
                '            <button i="close" class="close" aria-hidden="true">×</button>' +
                '            <h4 i="title" class="modal-title"></h4>' +
                '        </div>' +
                '        <div i="body" class="modal-body ui-dialog-body">' +
                '            <div i="content" class="ui-dialog-content"></div>' +
                '        </div>' +
                '        <div i="footer" class="modal-footer">' +
                '            <div i="statusbar" class="ui-dialog-statusbar"></div>' +
                '            <div i="button" class="ui-dialog-button"></div>' +
                '        </div>' +
                '    </div>' +
                '</div>'
});


/*!
 * artDialog
 * Date: 2014-11-09
 * https://github.com/aui/artDialog
 * (c) 2009-2014 TangBin, http://www.planeArt.cn
 *
 * This is licensed under the GNU LGPL, version 2.1 or later.
 * For details, see: http://www.gnu.org/licenses/lgpl-2.1.html
 */
define("dialog", function (require) {

var $ = require("jquery");
var Popup = require("popup");
var defaults = require("dialog-config");
var css = defaults.cssUri;


// css loader: RequireJS & SeaJS
if (css) {
    var fn = require[require.toUrl ? 'toUrl' : 'resolve'];
    if (fn) {
        css = fn(css);
        css = '<link rel="stylesheet" href="' + css + '" />';
        if ($('base')[0]) {
            $('base').before(css);
        } else {
            $('head').append(css);
        } 
    }
}


var _count = 0;
var _expando = new Date() - 0; // Date.now()
var _isIE6 = !('minWidth' in $('html')[0].style);
var _isMobile = 'createTouch' in document && !('onmousemove' in document)
    || /(iPhone|iPad|iPod)/i.test(navigator.userAgent);
var _isFixed = !_isIE6 && !_isMobile;


var artDialog = function (options, ok, cancel) {

    var originalOptions = options = options || {};
    

    if (typeof options === 'string' || options.nodeType === 1) {
    
        options = {content: options, fixed: !_isMobile};
    }
    

    options = $.extend(true, {}, artDialog.defaults, options);
    options.original = originalOptions;

    var id = options.id = options.id || _expando + _count;
    var api = artDialog.get(id);
    
    
    // 如果存在同名的对话框对象，则直接返回
    if (api) {
        return api.focus();
    }
    
    
    // 目前主流移动设备对fixed支持不好，禁用此特性
    if (!_isFixed) {
        options.fixed = false;
    }


    // 快捷关闭支持：点击对话框外快速关闭对话框
    if (options.quickClose) {
        options.modal = true;
        options.backdropOpacity = 0;
    }
    

    // 按钮组
    if (!$.isArray(options.button)) {
        options.button = [];
    }


    // 取消按钮
    if (cancel !== undefined) {
        options.cancel = cancel;
    }
    
    if (options.cancel) {
        options.button.push({
            id: 'cancel',
            value: options.cancelValue,
            callback: options.cancel,
            display: options.cancelDisplay
        });
    }
    
    
    // 确定按钮
    if (ok !== undefined) {
        options.ok = ok;
    }
    
    if (options.ok) {
        options.button.push({
            id: 'ok',
            value: options.okValue,
            callback: options.ok,
            autofocus: true
        });
    }
    

    return artDialog.list[id] = new artDialog.create(options);
};

var popup = function () {};
popup.prototype = Popup.prototype;
var prototype = artDialog.prototype = new popup();

artDialog.create = function (options) {
    var that = this;

    $.extend(this, new Popup());

    var originalOptions = options.original;
    var $popup = $(this.node).html(options.innerHTML);
    var $backdrop = $(this.backdrop);

    this.options = options;
    this._popup = $popup;

    
    $.each(options, function (name, value) {
        if (typeof that[name] === 'function') {
            that[name](value);
        } else {
            that[name] = value;
        }
    });


    // 更新 zIndex 全局配置
    if (options.zIndex) {
        Popup.zIndex = options.zIndex;
    }


    // 设置 ARIA 信息
    $popup.attr({
        'aria-labelledby': this._$('title')
            .attr('id', 'title:' + this.id).attr('id'),
        'aria-describedby': this._$('content')
            .attr('id', 'content:' + this.id).attr('id')
    });


    // 关闭按钮
    this._$('close')
    .css('display', this.cancel === false ? 'none' : '')
    .attr('title', this.cancelValue)
    .on('click', function (event) {
        that._trigger('cancel');
        event.preventDefault();
    });
    

    // 添加视觉参数
    this._$('dialog').addClass(this.skin);
    this._$('body').css('padding', this.padding);


    // 点击任意空白处关闭对话框
    if (options.quickClose) {
        $backdrop
        .on(
            'onmousedown' in document ? 'mousedown' : 'click',
            function () {
            that._trigger('cancel');
            return false;// 阻止抢夺焦点
        });
    }


    // 遮罩设置
    this.addEventListener('show', function () {
        $backdrop.css({
            opacity: 0,
            background: options.backdropBackground
        }).animate(
            {opacity: options.backdropOpacity}
        , 150);
    });


    // ESC 快捷键关闭对话框
    this._esc = function (event) {
        var target = event.target;
        var nodeName = target.nodeName;
        var rinput = /^input|textarea$/i;
        var isTop = Popup.current === that;
        var keyCode = event.keyCode;

        // 避免输入状态中 ESC 误操作关闭
        if (!isTop || rinput.test(nodeName) && target.type !== 'button') {
            return;
        }
        
        if (keyCode === 27) {
            that._trigger('cancel');
        }
    };

    $(document).on('keydown', this._esc);
    this.addEventListener('remove', function () {
        $(document).off('keydown', this._esc);
        delete artDialog.list[this.id];
    });


    _count ++;
    
    artDialog.oncreate(this);

    return this;
};


artDialog.create.prototype = prototype;



$.extend(prototype, {

    /**
     * 显示对话框
     * @name artDialog.prototype.show
     * @param   {HTMLElement Object, Event Object}  指定位置（可选）
     */
    
    /**
     * 显示对话框（模态）
     * @name artDialog.prototype.showModal
     * @param   {HTMLElement Object, Event Object}  指定位置（可选）
     */

    /**
     * 关闭对话框
     * @name artDialog.prototype.close
     * @param   {String, Number}    返回值，可被 onclose 事件收取（可选）
     */

    /**
     * 销毁对话框
     * @name artDialog.prototype.remove
     */

    /**
     * 重置对话框位置
     * @name artDialog.prototype.reset
     */

    /**
     * 让对话框聚焦（同时置顶）
     * @name artDialog.prototype.focus
     */

    /**
     * 让对话框失焦（同时置顶）
     * @name artDialog.prototype.blur
     */

    /**
     * 添加事件
     * @param   {String}    事件类型
     * @param   {Function}  监听函数
     * @name artDialog.prototype.addEventListener
     */

    /**
     * 删除事件
     * @param   {String}    事件类型
     * @param   {Function}  监听函数
     * @name artDialog.prototype.removeEventListener
     */

    /**
     * 对话框显示事件，在 show()、showModal() 执行
     * @name artDialog.prototype.onshow
     * @event
     */

    /**
     * 关闭事件，在 close() 执行
     * @name artDialog.prototype.onclose
     * @event
     */

    /**
     * 销毁前事件，在 remove() 前执行
     * @name artDialog.prototype.onbeforeremove
     * @event
     */

    /**
     * 销毁事件，在 remove() 执行
     * @name artDialog.prototype.onremove
     * @event
     */

    /**
     * 重置事件，在 reset() 执行
     * @name artDialog.prototype.onreset
     * @event
     */

    /**
     * 焦点事件，在 foucs() 执行
     * @name artDialog.prototype.onfocus
     * @event
     */

    /**
     * 失焦事件，在 blur() 执行
     * @name artDialog.prototype.onblur
     * @event
     */

    
    /**
     * 设置内容
     * @param    {String, HTMLElement}   内容
     */
    content: function (html) {
    
        var $content = this._$('content');

        // HTMLElement
        if (typeof html === 'object') {
            html = $(html);
            $content.empty('').append(html.show());
            this.addEventListener('beforeremove', function () {
                $('body').append(html.hide());
            });
        // String
        } else {
            $content.html(html);
        }
                
        return this.reset();
    },
    
    
    /**
     * 设置标题
     * @param    {String}   标题内容
     */
    title: function (text) {
        this._$('title').text(text);
        this._$('header')[text ? 'show' : 'hide']();
        return this;
    },


    /** 设置宽度 */
    width: function (value) {
        this._$('content').css('width', value);
        return this.reset();
    },


    /** 设置高度 */
    height: function (value) {
        this._$('content').css('height', value);
        return this.reset();
    },


    /**
     * 设置按钮组
     * @param   {Array, String}
     * Options: value, callback, autofocus, disabled 
     */
    button: function (args) {
        args = args || [];
        var that = this;
        var html = '';
        var number = 0;
        this.callbacks = {};
        
           
        if (typeof args === 'string') {
            html = args;
            number ++;
        } else {
            $.each(args, function (i, val) {

                var id = val.id = val.id || val.value;
                var style = '';
                that.callbacks[id] = val.callback;


                if (val.display === false) {
                    style = ' style="display:none"';
                } else {
                    number ++;
                }

                html +=
                  '<button'
                + ' type="button"'
                + ' i-id="' + id + '"'
                + style
                + (val.disabled ? ' disabled' : '')
                + (val.autofocus ? ' autofocus class="ui-dialog-autofocus"' : '')
                + '>'
                +   val.value
                + '</button>';

                that._$('button')
                .on('click', '[i-id=' + id +']', function (event) {                
                    var $this = $(this);
                    if (!$this.attr('disabled')) {// IE BUG
                        that._trigger(id);
                    }
                
                    event.preventDefault();
                });

            });
        }

        this._$('button').html(html);
        this._$('footer')[number ? 'show' : 'hide']();

        return this;
    },


    statusbar: function (html) {
        this._$('statusbar')
        .html(html)[html ? 'show' : 'hide']();

        return this;
    },


    _$: function (i) {
        return this._popup.find('[i=' + i + ']');
    },
    
    
    // 触发按钮回调函数
    _trigger: function (id) {
        var fn = this.callbacks[id];
            
        return typeof fn !== 'function' || fn.call(this) !== false ?
            this.close().remove() : this;
    }
    
});



artDialog.oncreate = $.noop;



/** 获取最顶层的对话框API */
artDialog.getCurrent = function () {
    return Popup.current;
};



/**
 * 根据 ID 获取某对话框 API
 * @param    {String}    对话框 ID
 * @return   {Object}    对话框 API (实例)
 */
artDialog.get = function (id) {
    return id === undefined
    ? artDialog.list
    : artDialog.list[id];
};

artDialog.list = {};



/**
 * 默认配置
 */
artDialog.defaults = defaults;



return artDialog;

});




/*!
 * drag.js
 * Date: 2013-12-06
 * https://github.com/aui/artDialog
 * (c) 2009-2014 TangBin, http://www.planeArt.cn
 *
 * This is licensed under the GNU LGPL, version 2.1 or later.
 * For details, see: http://www.gnu.org/licenses/lgpl-2.1.html
 */
define("drag", function (require) {

var $ = require("jquery");


var $window = $(window);
var $document = $(document);
var isTouch = 'createTouch' in document;
var html = document.documentElement;
var isIE6 = !('minWidth' in html.style);
var isLosecapture = !isIE6 && 'onlosecapture' in html;
var isSetCapture = 'setCapture' in html;


var types = {
    start: isTouch ? 'touchstart' : 'mousedown',
    over: isTouch ? 'touchmove' : 'mousemove',
    end: isTouch ? 'touchend' : 'mouseup'
};


var getEvent = isTouch ? function (event) {
    if (!event.touches) {
        event = event.originalEvent.touches.item(0);
    }
    return event;
} : function (event) {
    return event;
};


var DragEvent = function () {
    this.start = $.proxy(this.start, this);
    this.over = $.proxy(this.over, this);
    this.end = $.proxy(this.end, this);
    this.onstart = this.onover = this.onend = $.noop;
};

DragEvent.types = types;

DragEvent.prototype = {

    start: function (event) {
        event = this.startFix(event);

        $document
        .on(types.over, this.over)
        .on(types.end, this.end);
        
        this.onstart(event);
        return false;
    },

    over: function (event) {
        event = this.overFix(event);
        this.onover(event);
        return false;
    },

    end: function (event) {
        event = this.endFix(event);

        $document
        .off(types.over, this.over)
        .off(types.end, this.end);

        this.onend(event);
        return false;
    },

    startFix: function (event) {
        event = getEvent(event);

        this.target = $(event.target);
        this.selectstart = function () {
            return false;
        };

        $document
        .on('selectstart', this.selectstart)
        .on('dblclick', this.end);

        if (isLosecapture) {
            this.target.on('losecapture', this.end);
        } else {
            $window.on('blur', this.end);
        }

        if (isSetCapture) {
            this.target[0].setCapture();
        }

        return event;
    },

    overFix: function (event) {
        event = getEvent(event);
        return event;
    },

    endFix: function (event) {
        event = getEvent(event);

        $document
        .off('selectstart', this.selectstart)
        .off('dblclick', this.end);

        if (isLosecapture) {
            this.target.off('losecapture', this.end);
        } else {
            $window.off('blur', this.end);
        }

        if (isSetCapture) {
            this.target[0].releaseCapture();
        }

        return event;
    }
    
};


/**
 * 启动拖拽
 * @param   {HTMLElement}   被拖拽的元素
 * @param   {Event} 触发拖拽的事件对象。可选，若无则监听 elem 的按下事件启动
 */
DragEvent.create = function (elem, event) {
    var $elem = $(elem);
    var dragEvent = new DragEvent();
    var startType = DragEvent.types.start;
    var noop = function () {};
    var className = elem.className
        .replace(/^\s|\s.*/g, '') + '-drag-start';

    var minX;
    var minY;
    var maxX;
    var maxY;

    var api = {
        onstart: noop,
        onover: noop,
        onend: noop,
        off: function () {
            $elem.off(startType, dragEvent.start);
        }
    };


    dragEvent.onstart = function (event) {
        var isFixed = $elem.css('position') === 'fixed';
        var dl = $document.scrollLeft();
        var dt = $document.scrollTop();
        var w = $elem.width();
        var h = $elem.height();

        minX = 0;
        minY = 0;
        maxX = isFixed ? $window.width() - w + minX : $document.width() - w;
        maxY = isFixed ? $window.height() - h + minY : $document.height() - h;

        var offset = $elem.offset();
        var left = this.startLeft = isFixed ? offset.left - dl : offset.left;
        var top = this.startTop = isFixed ? offset.top - dt  : offset.top;

        this.clientX = event.clientX;
        this.clientY = event.clientY;

        $elem.addClass(className);
        api.onstart.call(elem, event, left, top);
    };
    

    dragEvent.onover = function (event) {
        var left = event.clientX - this.clientX + this.startLeft;
        var top = event.clientY - this.clientY + this.startTop;
        var style = $elem[0].style;

        left = Math.max(minX, Math.min(maxX, left));
        top = Math.max(minY, Math.min(maxY, top));

        style.left = left + 'px';
        style.top = top + 'px';
        
        api.onover.call(elem, event, left, top);
    };
    

    dragEvent.onend = function (event) {
        var position = $elem.position();
        var left = position.left;
        var top = position.top;
        $elem.removeClass(className);
        api.onend.call(elem, event, left, top);
    };


    dragEvent.off = function () {
        $elem.off(startType, dragEvent.start);
    };


    if (event) {
        dragEvent.start(event);
    } else {
        $elem.on(startType, dragEvent.start);
    }

    return api;
};

return DragEvent;

});

/*!
 * artDialog-plus
 * Date: 2013-11-09
 * https://github.com/aui/artDialog
 * (c) 2009-2014 TangBin, http://www.planeArt.cn
 *
 * This is licensed under the GNU LGPL, version 2.1 or later.
 * For details, see: http://www.gnu.org/licenses/lgpl-2.1.html
 */
define("dialog-plus", function (require) {

var $ = require("jquery");
var dialog = require("dialog");
var drag = require("drag");

dialog.oncreate = function (api) {

    var options = api.options;
    var originalOptions = options.original;

    // 页面地址
    var url = options.url;
    // 页面加载完毕的事件
    var oniframeload = options.oniframeload;

    var $iframe;


    if (url) {
        this.padding = options.padding = 0;

        $iframe = $('<iframe />');

        $iframe.attr({
            src: url,
            name: api.id,
            width: '100%',
            height: '100%',
            allowtransparency: 'yes',
            frameborder: 'no',
            scrolling: 'no'
        })
        .on('load', function () {
            var test;
            
            try {
                // 跨域测试
                test = $iframe[0].contentWindow.frameElement;
            } catch (e) {}

            if (test) {

                if (!options.width) {
                    api.width($iframe.contents().width());
                }
                
                if (!options.height) {
                    api.height($iframe.contents().height());
                }
            }

            if (oniframeload) {
                oniframeload.call(api);
            }

        });

        api.addEventListener('beforeremove', function () {

            // 重要！需要重置iframe地址，否则下次出现的对话框在IE6、7无法聚焦input
            // IE删除iframe后，iframe仍然会留在内存中出现上述问题，置换src是最容易解决的方法
            $iframe.attr('src', 'about:blank').remove();


        }, false);

        api.content($iframe[0]);

        api.iframeNode = $iframe[0];

    }


    // 对于子页面呼出的对话框特殊处理
    // 如果对话框配置来自 iframe
    if (!(originalOptions instanceof Object)) {

        var un = function () {
            api.close().remove();
        };

        // 找到那个 iframe
        for (var i = 0; i < frames.length; i ++) {
            try {
                if (originalOptions instanceof frames[i].Object) {
                    // 让 iframe 刷新的时候也关闭对话框，
                    // 防止要执行的对象被强制收回导致 IE 报错：“不能执行已释放 Script 的代码”
                    $(frames[i]).one('unload', un);
                    break;
                }
            } catch (e) {} 
        }
    }


    // 拖拽支持
    $(api.node).on(drag.types.start, '[i=title]', function (event) {
        // 排除气泡类型的对话框
        if (!api.follow) {
            api.focus();
            drag.create(api.node, event);
        }
    });

};



dialog.get = function (id) {

    // 从 iframe 传入 window 对象
    if (id && id.frameElement) {
        var iframe = id.frameElement;
        var list = dialog.list;
        var api;
        for (var i in list) {
            api = list[i];
            if (api.node.getElementsByTagName('iframe')[0] === iframe) {
                return api;
            }
        }
    // 直接传入 id 的情况
    } else if (id) {
        return dialog.list[id];
    }

};



return dialog;

});


window.dialog = require("dialog-plus");

})();
define("art-dialog", ["jquery"], (function (global) {
    return function () {
        var ret, fn;
        return ret || global.dialog;
    };
}(this)));

define('app/ui/dialog',[
    'art-dialog'
], function (dialog) {
    return function (app) {
        app.ui || (app.ui = {});
        app.ui.dialog = dialog;
        app.ui.confirm = function (content, successCallback, cancelCallback) {
            app.ui.dialog({
                width: 250,
                quickClose: true,
                content: "<div class='confirm_content'>"+content+"</div>" ||"<div class='confirm_content'>确认进行该操作？</div>",
                okValue: '确定',
                ok: function () {
                    successCallback && successCallback();
                },
                cancelValue: '取消',
                cancel: function () {
                    cancelCallback && cancelCallback();
                }
            }).showModal();
        };
    };
});

define('app/app',[
    '../core/core',
    '../core/application',
    './emitQueue',
    './page',
    './layout',
    './module',
    './navigation',
    './plugin',
    './sandboxes',
    './widget',
    './parser',
    './view',
    './data',
    './templates',
    './router',
    './ajax',
    './hash',
    './ui/dialog'
], function (core, Application, emitQueue, page, layout, module,
    navigation, plugin, sandboxes, widget, parser, view, data, templates, router,
    ajax, hash, dialog) {

    

    var DEFAULT_MODULE_NAME = '__default__';

    core.createApp = function (options) {

        var $ = core.$;
        var extend = core.$.extend;

        // 停止以前的 app
        if (core.app) { core.app.stop(); }

        // 默认配置
        var defaultOptions = {
            name: 'app',
            autoReport: true,  // 自动通知
            autoBuildPage: false,  // 自动生成页面配置
            features: ['dialog', 'plugin', 'spa'],
            autoParseWidgetName: false,  // 自动解析 widget 名称
            releaseWidgetPath: './widgets',  // 发布后的 widget 路径
            widgetNameSeparator: '-',  // 解析  widget 名称时识别的分隔符

            global: false,  // 全局 app
            defaultPage: 'default',
            homePage: 'home',
            page: {
                defaultLayout: 'default',  // 默认布局
                defaultHost: '.v-render-body',  // 默认宿主元素
                defaultSource: 'basic',  // 默认源
                defaultInherit: '_common'  // 默认页面继承
            },
            module: {
                // module 配置的默认值
                defaults: {
                    multilevel: false,
                    hasEntry: true,
                    entryPath: 'main',
                    widgetPath: 'widgets',
                    source: 'modules'
                },
                // 默认 module
                defaultModule: {
                    name: core.constant.DEFAULT_MODULE_NAME,
                    source: '.',
                    path: '.',
                    hasEntry: false,
                    build: '{{ dir }}{{ baseUrl }}{{ type }}'
                }
            },
            router: {
                pagePattern: '\/?(.+)\??(.+)'  // 没用，移除
            }
        };

        options = $.extend(true, defaultOptions, options || {});

        if (!options.modules || options.modules.length === 0) {
            options.modules = [options.module.defaultModule];
        }

        var app = new Application(options);

        emitQueue(app, Application);
        sandboxes(app, Application);
        widget(app, Application);
        parser(app, Application);
        view(app, Application);
        ajax(app);
        data(app);
        templates(app);
        hash(app);

        if ($.inArray('dialog', options.features) > -1) {
            // dialog
            dialog(app);
        }

        if ($.inArray('spa', options.features) > -1) {
            // spa(single page application) 相关
            page(app, Application);
            layout(app, Application);
            module(app, Application);
            navigation(app, Application);
            router(app);
            app._router = router(app);
            app.Router = function (obj) {
                obj || (obj = {});
                return app.core.Router.extend($.extend(true, {}, app._router, obj));
            };

            app.startRouter = function (obj) {
                app.router = new (app.Router(obj))();

                app.core.history.start({ pushState: false });
            };
        }

        if ($.inArray('plugin', options.features) > -1) {
            // plugin
            plugin(app, Application);
        }

        core.app = app;

        app.sandbox = app.sandboxes.create('app-' + app.name, app.name, 'app');

        if (options.global) { window.__verApp = app; }

        return app;
    };

    return core;
});

define('veronica',[
    './app/app'
], function (core) {

    

    return core;
});

    //Register in the values from the outer closure for common dependencies
    //as local almond modules
    define('jquery', function () {
        return $;
    });

    define('underscore', function(){
        return _;
    });

    //Use almond's special top-level, synchronous require to trigger factory
    //functions, get the final module value, and export it as the public
    //value.
    return require('veronica');
}));
