define(function () {

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
            views: {},
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
                    autoBind: false,
                    autoST: false,
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
                    this._renderSubViews();
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
                        'click [data-action]': '_actionHandler'
                    });
                }

                // 渲染
                this.options.autoRender && this.render();
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
            // 渲染子视图
            _renderSubViews: function () {
                var me = this;
                if (_.size(this.views) > 0) {
                    // 渲染子视图
                    _.each(this.views, function (func, name) {
                        if (_.isString(func)) { return; }
                        me.view(name, func);
                    });
                    // 设置默认活动视图
                    this.views['active'] && this.active(this.views['active']);
                }
            },
            // 创建子视图
            _createSubView: function (view, name) {
                if (view.cid) {  // 视图对象
                    view._name = name;
                    return view;
                }
                if (_.isFunction(view)) {  // 方法
                    view = view.apply(this);
                    view._name = name;
                    return view;
                }
                view.options = view.options || {};
                if (_.isString(view.options.host)) {
                    view.options.host = this.$(view.options.host);
                }
                return view.initializer(_.extend({
                    sandbox: this.options.sandbox,
                    host: view.options.el ? false : this.$el,
                    _name: name
                }, view.options));
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
            // 获取或设置子视图
            view: function (name, view) {
                var me = this;
                if (_.isUndefined(view)) {
                    return this._views[name];

                } else {
                    this._destroyView(name);

                    this._views[name] = this._createSubView(view, name);

                    _.chain(this._delayEvents).filter(function (obj) {
                        return obj.name === name;
                    }).each(function (obj) {
                        me.listenTo(view, obj.event, obj.callback);
                    });
                    return view;
                }
            },
            // 激活子视图
            active: function (name) {
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
            },
            // 装载视图模型（数据， 是否更新视图绑定-默认更新）
            model: function (data, bind) {
                if (!_.isUndefined(data)) {

                    if (_.isString(data) && this.viewModel) {
                        return this.viewModel.get(data);
                    }

                    if (data.toJSON) { // 本身就是viewModel对象
                        this.viewModel = data;
                    } else {
                        this.viewModel = app.mvc.baseViewModel($.extend({}, this.baseModel, data));
                    }

                    this.delegateModelEvents(this.viewModel);
                    if (bind !== false) {
                        this._bindViewModel();
                    }
                }
                return this.viewModel;
            },
            // 创建共享视图模型
            shareModel: function (model) {
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
            },
            // 绑定视图模型
            _bindViewModel: function () {
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
            },
            // 渲染界面
            render: function (template) {
                template || (template = this.template);
                if (this.options.el && !template) {
                    template = _.unescape(this.$el.html());
                }
                var hasTpl = !!template;
                var options = this.options;
                var sandbox = this.options.sandbox;

                if (hasTpl) {
                    var tpl = _.isFunction(template) ?
                        template : _.template(template, { variable: 'data' });  // 如果使用 Lodash，这里调用方式有差异
                    var html = tpl(_.extend({ lang: app.lang[this.options.langClass] }, this.options));
                    html && this.$el.html(html);
                }

                this.trigger('rendering');
                this.enhance();
                if (this.options.host) {
                    var placeMethod = options._place === 1 ? 'prependTo' : 'appendTo';
                    this.$el[placeMethod](this.options.host);
                };
                sandbox.log(this.cid + ' rendered');
                this._rendered = true;
                this.trigger('rendered');
                this.show();
                //  this.$('input[placeholder]').placeholder();
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
            // 获取或创建一个window
            window: function (config, isShow) {

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

                        toBeDestroyed[viewOpt.name] = view;
                    });

                };
                var defaultWnd = '<div><div class="fn-wnd"><div class="k-loading-image fn-s-loading"></div></div></div>';
                var footer = '<div class="k-footer"><button class="btn btn-default fn-close">关闭</button></div>';

                isShow = isShow == null ? true : isShow;

                config = $.extend(true, defaults, config);

                var $el = config.el == null ? $(defaultWnd) : $(config.el);
                if (config.footer) {
                    $el.append(footer);
                }

                if (config.type === 'modal') {
                    $el.modal({
                        show: false
                    });
                    wnd = {
                        element: $el,
                        close: function () {
                            this.element.modal('hide');
                        },
                        center: function () { },
                        open: function () {
                            this.element.modal('show');
                        }
                    }
                    wnd.element.one('hidden.bs.modal', destroy);
                } else {
                    $el.kendoWindow(config.options);
                    wnd = $el.data('kendoWindow');
                    //if (config.type !== 'normal' && (config.children || config.widgetOpt || config.viewOpt)) {
                    if (config.destroyedOnClose) {
                        wnd.bind('close', destroy);
                    }
                }

                wnd.vLazyLayout = _debounce(_.bind(function () {
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
                    if (widgets.length === 0) {
                        $el.find('.fn-s-loading').remove();
                    }
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
                    wnd.open();
                    // $(WND_CONTAINER).scrollTop(0).show();
                }

                return wnd;

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
                this.options.sandbox.startWidgets(list, null, this.cid);
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
                context || (context = this);
                var $el = $(e.currentTarget);
                if ($el.closest('script').length > 0) return;
                var actionName = $el.data().action;
                if (actionName.indexOf('Handler') < 0) {
                    actionName = actionName + 'Handler';
                }
                context[actionName] && context[actionName](e);
            },
            _destroyView: function (viewName) {
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
            },
            // 销毁窗口
            _destroyWindow: function (name) {
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

                var window = this._windows[name];
                if (window.destroy) {
                    window.destroy();
                } else {
                    $(window).remove();
                }

                delete this._windows[name];
            },
            _destroy: function () {
                // 清理在全局注册的事件处理器
                this.options.autoResize && $(window).off('resize', this.resize);

                // 销毁该组件下的所有弹出窗口
                _(this._windows).each(function (window) {
                    window.destroy();
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

        app.view = {};

        app.view.base = base;

        app.view.define = function (obj, inherits) {
            inherits || (inherits = []);
            inherits.push(obj);

            return app.core.View.extend($.extend.apply($, [true, {}, app.view.base].concat(inherits)));
        };
    };
});
