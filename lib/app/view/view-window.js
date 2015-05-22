define(function () {

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
