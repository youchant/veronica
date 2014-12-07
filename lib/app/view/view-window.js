define(function () {

    //var WND_CONTAINER = '#ver-modal';

    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;
        var noop = $.noop;

        app.view.base._windowInstance = function ($el, config, destroy, appendToEl) {
            var dialog = app.ui.dialog;

            //    appendToEl.append();

            var dlg = dialog({
                title: '对话框',
                content: $el.get(0),// $el.get(0),
                fixed: true
            });

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
                    this.core.show(this.positionTo);
                },
                rendered: function (view) {
                    var $f = view.$el.find('.footer').addClass('modal-footer');
                    if ($f.length > 0) {
                        $f.closest('.ui-dialog-body').addClass('with-footer');
                    }
                    this.element.find('.fn-s-loading').remove();
                    this.core.reset();
                },
                setOptions: function (opt) {
                    this.core.width(opt.width).height(opt.height).title(opt.title);
                }
            }
            wnd.core.addEventListener('beforeremove', destroy);
            return wnd;
        };

        app.view.base.viewWindow = function (viewName, viewInitializer, options, positionTo) {
            return this.window({
                name: _.uniqueId('wnd_'),
                positionTo: positionTo,
                children: [{
                    type: 'view',
                    name: viewName,
                    initializer: viewInitializer,
                    options: options
                }]
            })
        };
        // 获取或创建一个window
        app.view.base.window = function (config, isShow) {

            var wnd;
            var sandbox = this.options.sandbox;
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
                    modal: true
                },
                children: null,
                widgetOpt: null,
                viewOpt: null
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

                sandbox.startWidgets(widgetOpt).done(function () {
                    $el.find('.fn-s-loading').remove(); // 插件加载完毕后移除加载图片
                });
            };
            // 创建 View
            var createView = function (viewOpts, wnd) {
                var me = this;
                var $wndEl = wnd.element;
                _.each(viewOpts, function (viewOpt) {
                    var host = $wndEl.find('.fn-wnd');
                    viewOpt.initializer || (viewOpt.initializer = viewOpt.instance);
                    viewOpt.options = _.extend({
                        host: host.length === 0 ? $wndEl : host,
                        parentWnd: wnd
                    }, viewOpt.options);
                    var view = me.view(viewOpt.name, viewOpt);
                    if (view._rendered) {
                        wnd.rendered(view);
                    }
                    view.listenTo(view, 'rendered', function () {
                        wnd.rendered(this);
                    });
                    toBeDestroyed[viewOpt.name] = view;
                });

            };
            var defaultWnd = '<div class="fn-wnd"><span class="ui-dialog-loading fn-s-loading">Loading..</span></div>';
            var footer = '<div class="k-footer"><button class="btn btn-default fn-close">关闭</button></div>';

            isShow = isShow == null ? true : isShow;

            config = $.extend(true, defaults, config);

            var $el = config.el == null ? $(defaultWnd) : $(config.el);
            if (config.footer) {
                $el.append(footer);
            }

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
            }

            // 兼容老的写法
            config.widgetOpt && createWidget.call(this, config.widgetOpt, wnd);
            if (config.viewOpt) {
                createView.call(this, [config.viewOpt], wnd);
                $el.find('.fn-s-loading').remove();
            }

            if (wnd) {
                windows[config.name] = wnd;
            }

            if (config.center) {

                wnd.center();

                $(window).on('resize', wnd.vLazyLayout);
            }
            if (config.footer) {
                $el.find('.fn-close').on('click', function () {
                    wnd.close();
                });
                $el.find('.fn-wnd').addClass('with-footer');
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
