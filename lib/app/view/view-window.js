define(function () {

    return function (app) {
        var core = app.core;
        var $ = app.core.$;
        var _ = app.core._;

        // 默认的对话框模板
        var defaultWndTpl = '<div class="fn-wnd fn-wnd-placeholder"><span class="ui-dialog-loading fn-s-loading">'
            + core.i18n.loadingText + '</span></div>';

        // 默认的对话框footer
        var footerTpl = '<div class="k-footer"><button class="btn btn-default fn-close">'
            + core.i18n.windowCloseText
            + '</button></div>';

        /**
         * 对话框内容类型
         * @readonly
         * @enum {string}
         */
        var DlgChildType = {
            WIDGET: 'widget',
            VIEW: 'view'
        };

        /**
         * 对话框配置参数
         * @typedef DialogOptions
         * @property {string} [name] - 对话框名称
         * @property {DlgChildType} [type] - 默认的内容组件类型
         * @property {object} [el] - 对话框的内容元素
         * @property {object} [positionTo] - 停靠的位置元素
         * @property {boolean} [center=true] - 对话框是否居中
         * @property {boolean} [footer=false] - 对话框是否具有页脚
         * @property {boolean} [destroyedOnClose=true] - 是否在关闭后自动销毁
         * @property {DialogUIOptions} [options] - 对话框UI控件的配置参数
         * @property {Array.<DialogChildOptions>} [children] - 对话框内部的内容组件
         */

        /**
         * 对话框内容组件配置参数
         * @typedef DialogChildOptions
         * @property {DlgChildType} [type] - 类型（如果不设置则使用对话框配置参数中的内容组件类型）
         * @property {string} name - 组件名称（如果 type 是 "widget"，则指定 widget 名称）
         * @property {object} [initializer] - 组件初始化器（仅 type 为 "view" 时才有效）
         * @property {ViewOptions|WidgetOptions} options - 组件的配置参数
         */

        // 默认对话框配置
        var dlgDefaultOptions = {
            name: '',  // 窗口的唯一标识码
            type: '',
            el: null,
            positionTo: null,
            center: true,
            footer: false,
            destroyedOnClose: true,
            // 窗口配置
            options: {
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

        // 生成唯一的窗口名称
        function generateWindowName() {
            return _.uniqueId('wnd_');
        };

        function removeLoading($el) {
            $el.find('.fn-s-loading').remove();
        }

        function getChildRoot(wnd) {
            var $wndEl = wnd.element.find('.fn-wnd');
            return $wndEl.length === 0 ? wnd.element : $wndEl;
        }

        // 创建 Widget
        function createWidget(configs, wnd) {
            if (configs.length === 0) return;

            var $root = getChildRoot(wnd);

            var paramConfigs = _.map(configs, function (refConfig) {
                var config = $.extend(true, {}, refConfig);  // 深拷贝
                config.options || (config.options = {});
                config.options.host = config.options.host ? $root.find(config.options.host) : $root;
                config.options.parentWnd = wnd;
                return config;
            });

            this.startWidgets(paramConfigs).done(function () {
                removeLoading(wnd.element);
            });
        };

        // 创建 View
        function createView(configs, wnd) {
            var parentView = this;
            var $root = getChildRoot(wnd);

            _.each(configs, function (refConfig) {
                var config = $.extend({}, refConfig);
                var name = config.name;
                config.options = _.extend({
                    host: $root,
                    parentWnd: wnd
                }, config.options);

                var view = parentView.view(name, config);

                // 添加 widget class，确保样式正确
                if (view.options.sandbox) {
                    view.$el.addClass(view.options.sandbox.name);
                }

                if (view.state.isRendered) {
                    wnd.rendered(parentView);
                } else {
                    view.listenTo(view, 'rendered', function () {
                        wnd.rendered(parentView);
                    });
                    view.listenTo(view, 'refresh-fail', function () {
                        wnd.close();
                    });
                }

                wnd.vToBeDestroyed[name] = view;
            });

        };

        var options = {
            windowOptions: false
        };

        /**
         * @typedef WidgetOptions
         * @augments ViewOptions
         */


        /** @lends veronica.View# */
        var methods = {
            // 重设父对话框的一些属性
            _resetParentWnd: function () {
                // 初始化窗口大小
                if (this.options.parentWnd && this.options.windowOptions) {
                    this.options.parentWnd.setOptions(this.options.windowOptions);
                    // TODO: 这里遇到 positionTo 的 window，调整大小后可能会错位
                    this.options.parentWnd.config.center && this.options.parentWnd.center();
                }
            },

            /**
             * 生成唯一的对话框名称
             * @returns {string}
             */
            uniqWindowName: function () {
                return _.uniqueId('wnd_');
            },

            /**
             * 创建一个显示view的对话框
             * @function
             * @param {string} viewName - 视图名称
             * @param {object|function} viewInitializer - 视图定义对象或初始化器
             * @param {ViewOptions} options - 视图初始化配置参数
             * @param {DialogOptions}  [dlgOptions] - 对话框初始化配置参数
             */
            viewWindow: function (viewName, viewInitializer, options, dlgOptions) {
                return this.window($.extend({
                    name: 'wnd_' + viewName,
                    children: [{
                        type: 'view',
                        name: viewName,
                        initializer: viewInitializer,
                        options: options
                    }]
                }, dlgOptions));
            },

            /**
             * 创建一个显示 widget 的对话框
             * @function
             * @param {string} name - widget 名称
             * @param {WidgetOptions} options - widget 配置参数
             * @param {DialogOptions}  [dlgOptions] - 对话框初始化配置参数
             */
            widgetWindow: function (name, options, dlgOptions) {
                return this.window($.extend({
                    name: 'wnd_' + name,
                    children: [{
                        type: 'widget',
                        name: name,
                        options: options
                    }]
                }, dlgOptions));
            },

            /**
             * 创建显示普通HTML的对话框（必须传入window name）
             * @param {string} html - 对话框内容
             * @param {DialogUIOptions} [options] - 对话框UI组件初始化配置参数
             * @param {DialogOptions} [dlgOptions] - 对话框初始化配置参数
             */
            htmlWindow: function (html, options, dlgOptions) {
                return this.window($.extend({
                    options: options,
                    el: html
                }, dlgOptions));
            },

            /**
             * 获取或创建一个对话框
             * @function
             * @param {DialogOptions|string} options - 创建对话框的配置参数或对话框名称
             * @param {boolean} isShow - 是否在创建后立即显示
             * @returns {Dialog} 对话框对象
             */
            window: function (options, isShow) {

                var me = this;
                var windows = this._windows;
                // 获取窗口
                if (_.isString(options)) {
                    return windows[options];
                }
                if (windows[options.name]) {
                    return windows[options.name];
                }


                if (options.positionTo) {   // 如果设置了 positionTo, 强制不居中
                    options.center = false;
                }

                if (isShow == null) {
                    isShow = true;
                }

                options = $.extend(true, {}, dlgDefaultOptions, options);

                if (options.name === '') {
                    options.name = me.uniqWindowName();
                }

                var isHtmlContet = _.isString(options.el);

                var $el = isHtmlContet ? $(defaultWndTpl).html(options.el)
                    : (options.el == null ? $(defaultWndTpl) : $(options.el));

                // 创建 window 实例
                var wnd = me._windowInstance($el, options, this);

                wnd.vToBeDestroyed = {};  // window 中应该被销毁的 view

                wnd.vLazyLayout = _.debounce(_.bind(function () {
                    this.center();
                }, wnd), 300);

                // 创建所有 children 实例
                if (options.children) {
                    var widgets = [];
                    var views = [];
                    _.each(options.children, function (conf) {
                        var type = conf.type || options.type;
                        if (type === DlgChildType.VIEW) {
                            views.push(conf);
                        }
                        if (type === DlgChildType.WIDGET) {
                            widgets.push(conf);
                        }

                    });

                    createView.call(this, views, wnd);
                    createWidget.call(this, widgets, wnd);
                } else {
                    removeLoading(wnd.element);
                }

                if (wnd) {
                    windows[options.name] = wnd;
                }

                if (options.center) {
                    wnd.center();
                    $(window).on('resize', wnd.vLazyLayout);
                }
                if (options.footer) {
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

            },

            // 销毁对话框
            _destroyWindow: function (name) {
                var me = this;

                if (name == null) {
                    // 销毁所有弹出窗口
                    _.each(this._windows, function (wnd, name) {
                        me._destroyWindow(name);
                    });

                    return;
                }

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
            },

            // 创建对话框界面控件
            _windowInstance: function ($el, config) {

                // 对话框控件实例
                var dlg = app.ui.dialog($.extend({
                    title: core.i18n.defaultDialogTitle,
                    content: $el, // $el.get(0),
                    fixed: true,
                    drag: config.options.draggable
                }, config.options)).close();  // 解决开始对话框默认显示的问题

                /**
                 * 对话框
                 * @class veronica.Dialog
                 */

                /** @lends veronica.Dialog# */
                var wnd = {
                    /**
                     * 对话框元素
                     */
                    element: $el,
                    /**
                     * 对话框内部UI控件
                     */
                    core: dlg,
                    /**
                     * 打开对话框
                     */
                    config: config,
                    positionTo: config.positionTo,
                    /**
                     * 关闭对话框
                     */
                    close: function () {
                        if (this.core.open) {
                            this.core.close();
                        }
                    },
                    destroy: function () {
                        this.core.remove();
                    },
                    center: function () {
                        this.core.reset();
                    },
                    /**
                     * 打开对话框
                     */
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
                        opt.width && this.core.width(opt.width);
                        opt.height && this.core.height(opt.height);
                        opt.title && this.core.title(opt.title);
                    }
                };

                wnd.core.addEventListener('close', _.bind(function () {
                    if (config.destroyedOnClose) {
                        this._destroyWindow(config.name);
                    }
                }, this));

                wnd.core.addEventListener('remove', function () {
                    $.each($('.fn-wnd-placeholder:hidden'), function (i, el) {
                        if ($(el).closest('.ui-dialog').length === 0) {
                            $(el).remove();
                        }
                    });
                });

                return wnd;
            }
        };

        $.extend(app.view.base._defaults, options);
        $.extend(app.view.base, methods);
    };
});
