/**
 * 修改的 klass 类
 * 修改内容：
 *   - 添加继承相同属性的深拷贝合并
 *   - 添加继承函数的可选操作（可扩展可覆盖）
 *   -
 */


!function (name, context, definition) {
    if (typeof define == 'function') define(definition)
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
