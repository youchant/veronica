define(function () {

    return function (base, app) {
        var $ = app.core.$;
        var _ = app.core._;
        var noop = $.noop;

        var WIDGET_CLASS = 'ver-widget';
        var WIDGET_REF_NAME = '__widgetRef__';

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
                /**
                 * **`重写`** 自定义销毁，通常用于释放视图使用的全局资源
                 * @type {function}
                 * @example
                 *   _customDestory: function () {
                 *     $(window).off('resize', this.resizeHanlder);
                 *   }
                 */
                _customDestory: noop
            },
            /** @lends veronica.View# */
            methods: {
                /**
                 * 视图初始化
                 * @function
                 * @inner
                 * @listens View#initialize
                 */
                _initialize: function (options) {

                    options || (options = {});

                    // 应用mixins
                    this._applyMixins();

                    /**
                     * 视图的配置参数
                     * @name options
                     * @memberOf View#
                     * @type {ViewOptions}
                     * @todo 这里参数默认值合并使用了深拷贝，大多数时候其实没必要，目前实际测试速度影响暂时不大
                     */
                    this.options = $.extend(true, {}, this._defaults, this.defaults, options);

                    this._setup(options);

                    // hook element
                    this.$el
                        .addClass(WIDGET_CLASS)
                        .data(WIDGET_REF_NAME, this._id);
                    if (this.options._widgetName) {
                        this.$el.addClass(this.options._widgetName.join(' '));
                    }

                    this._invoke('init');
                    this.trigger('init');

                    // 渲染
                    this.options.autoRender && this.render();
                },
                stop: function () {
                    this.app().widget.stop(this);
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
                    // remove 时会调用该方法，由于没有调用 remove，则手动 stopListening
                    this.stopListening();
                    options = $.extend({}, this.options, options);
                    this.initialize(options);
                },
                _setup: function (options) {
                    this._invoke('aspect');
                    this._initProps(options);
                    this._invoke('_listen');
                    this._invoke('listen');
                    this._invoke('subscribe');  // 初始化广播监听

                    this._invoke('initAttr');
                },

                _destroy: function () {
                    var app = this.app();
                    this.stopChildren();
                    this.unsub();
                    this.remove();  // 这个方法进行了 stopListening
                    this._invoke('_destroyWindow', false);
                    // 销毁第三方组件
                    this._invoke('_customDestory');
                }
            }
        }
        base._extend(lifecycleAblility);
    };
});
