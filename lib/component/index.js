define([
    '../base/index',
    './_combine',
    '../framework/appPart'
], function (baseLib, combine, AppPart) {

    var _ = baseLib._;
    var $ = baseLib.$;
    var extendClass = baseLib.extendClass;
    var extend = _.extend;
    var noop = $.noop;

    var Component = AppPart.extend(/** @lends Component.prototype */{
        /**
         * @typedef ComponentOptions
         * @property {boolean} [autoStart=true] - 自动启动
         */
        options: {
            autoStart: true
        },
        /**
         * 组件
         * @constructs Component
         * @param options
         * @augments AppPart
         */
        initialize: function (options) {
            options || (options = {});
            this.supr(options);

            this.trigger('beforeCreate');

            this._invoke('_setup');

            this.trigger('created');

            this._observeModel();

            if (this.options.autoRender) {
                this.render();
            }
        },
        /**
         * 组件生命周期钩子，在初始化之前调用
         * @type {Function}
         */
        beforeCreate: noop,
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

    Component.extendBase = function (ext, options) {
        extendClass(Component.prototype, ext, options);
    };

    return Component;
});
