define([
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
