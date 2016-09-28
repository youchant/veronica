define([
    '../../base/index'
],function (baseLib) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var noop = $.noop;

    var viewOptions = [
        'el', 'id', 'attributes',
        'className', 'tagName', 'events',
        '_name', '_widgetName', '_context'
    ];

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
                    this._id = _.uniqueId('widget$');
                    _.extend(this, _.pick(options, viewOptions));

                    this._ensureElement();

                    this._invoke('_setup');
                    this._invoke('setup');

                    this.trigger('initialized');

                },
                /**
                 * 设置属性和监听
                 * @private
                 */
                _setup: function () {
                    var me = this;

                    // 代理 DOM 事件
                    this.delegateDOMEvents();

                    // default listen
                    this.listenTo(this, 'addChild', function (child) {
                        me._listenToDelay(child.options._name);
                    });
                    this.listenTo(this, 'initialized', function(){
                        me._invoke('initialized');
                        me.options.autoRender && me.render();
                    });

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
