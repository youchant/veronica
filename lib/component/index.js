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

    var Component = AppPart.extend({
        setup: noop,
        /**
         * **`重写`** 自定义销毁，通常用于释放视图使用的全局资源
         * @type {function}
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
         */
        options: {
            autoStart: true
        },
        initialize: function (options) {
            options || (options = {});
            this.supr(options);

            options = this.options;

            /**
             * 唯一标识符
             * @var {string} _id
             * @memberOf Component#
             */
            this._id = _.uniqueId('component$');
            _.extend(this, _.pick(options, ['_name', '_widgetName', '_context']));



            this._invoke('_setup');
            this.trigger('setup');

            // set mount node
            this.$mountNode = $(this.options.el);
            if(this.options.autoStart){
                // 设置初始视图模型
                this.model(this._invoke('defaultModel'));
                // 如果有挂载点，则进行编译
                if(this.$mountNode.length > 0){
                    this.compile();
                }
            }
        },
        _initProps: function () {
        },
        _listen: function () {
            // default listen
            this.listenTo(this, 'addChild', function (child) {
                this._listenToDelay(child.options._name, child);
            });
            this.listenTo(this, 'addPart', function (key, part) {
                this._callPartListen(key);
            });
            this.listenTo(this, 'setup', function () {
                this._invoke('setup');
            });
            this.listenTo(this, 'ready', function () {
                // 自动创建子视图
                var me = this;
                if (this.options.autoStartChildren) {
                    $.when(this.parseChildren(), this.startChildren()).then(function () {
                        me._bindViewModel();
                    });
                }

                me._invoke('ready');
            });

            this.listenTo(this, 'modelCreated', function () {
                this._viewEngine().bindEvents(this._viewModel, this);
            });
        },
        /**
         * 设置属性和监听
         * @private
         */
        _setup: function () {
            var me = this;

            this._invoke('_initProps');

            this._listenEventBus();
            this._listenComponent();
            this._invoke('_listen');

        },
        stop: function () {
            this.get('part:app:component').stop(this);
        },
        /**
         * 销毁该视图
         */
        destroy: function () {
            this._destroy();
            this.log('destroyed');
        },
        _destroy: function () {
            this.stopChildren();
            this.unsub();
            this.stopListening();
            this.removeElement();
            this._destoryModel();

            // 销毁第三方组件
            this._invoke('destroyed');
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
    _.each(combine, function(ext){
        extendClass(Component.prototype, ext, {
            overwrite: ['listenTo']
        });
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

    Component.extendBase = function (ext) {
        extendClass(Component.prototype, ext);
    };

    return Component;
});
