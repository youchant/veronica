define([
    './view/view-mvvm',
    './view/view-view',
    './view/view-window'
], function (mvvm, subview, subwindow) {

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
            views: null,
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
            className: 'ver-view',
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
                    autoCreateSubview: true,
                    autoBind: false,
                    domReady: false,  // DOM元素已经准备好
                    autoST: false,
                    lazyTemplate: false,
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
                    if (this.options.autoCreateSubview) {
                        this._createSubviews();
                    }
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
                        'click [data-action]': '_actionHandler',
                        'click [data-view]': '_viewHandler',
                        'click [data-widget]': '_widgetHandler'
                    });
                }

                // 渲染
                this.options.autoRender && this._firstRender();
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

            updateEl: function (selector, url, data) {
                var $el = this.$(selector);
                if (arguments.length > 2) {
                    $.get(url, data).done(function (resp) {
                        $el.html(resp);
                    });
                } else {
                    $el.html(url);
                }
            },
            _firstRender: function () {
                if (this.options.domReady) {
                    this.enhance();
                    this.trigger('rendered');
                } else {
                    this.render();
                }
            },
            refresh: function (url, data) {
                var me = this;
                if (url == null) {
                    url = _.result(this, 'templateUrl');
                }
                this.loadingTemplate = true;
                $.get(url, data).done(function (template) {
                    me.loadingTemplate = false;
                    if (_.isString(template)) {  // 仅当获取到模板时，才进行渲染
                        me._render(template, true);
                        me.trigger('refresh');
                    } else {
                        me.trigger('refresh-fail');
                    }
                }).fail(function () {
                    me.options.parentWnd && me.options.parentWnd.close();
                });
            },
            // 渲染界面
            render: function (template) {
                template || (template = this.template);

                if (this.templateUrl) {
                    this.refresh();
                } else {
                    if (this.options.el && !template) {
                        // 将当前元素内容作为 template
                        template = _.unescape(this.$el.html());
                    }
                    this._render(template);
                }
                return this;
            },
            _render: function (template, isHtml) {
                var hasTpl = !!template;
                var options = this.options;
                var sandbox = this.options.sandbox;

                if (hasTpl) {
                    if (isHtml) {
                        this.$el.get(0).innerHTML = template;
                    } else {
                        var tpl = _.isFunction(template) ?
                            template : _.template(template, { variable: 'data' });  // 如果使用 Lodash，这里调用方式有差异
                        var html = tpl(_.extend({ lang: app.lang[this.options.langClass] }, this.options));
                        html && (this.$el.get(0).innerHTML = html);
                    }
                }

                this.trigger('rendering');

                // append
                if (this.options.host && this._appended !== true) {
                    var placeMethod = options._place === 1 ? 'prependTo' : 'appendTo';
                    if (!this.options._page || this.options._page === app.page.active()) {
                        this.$el[placeMethod](this.options.host);
                        this._appended = true;
                    }
                };

                sandbox.log(this.cid + ' rendered');
                this._rendered = true;

                this._activeUI();
                this.enhance();
                this.trigger('rendered');

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
                return this.options.sandbox.startWidgets(list, null, this.cid);
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
                //e.stopImmediatePropagation();

                context || (context = this);
                var $el = $(e.currentTarget);
                if ($el.closest('script').length > 0) return;
                var actionName = $el.data().action;
                if (actionName.indexOf('Handler') < 0) {
                    actionName = actionName + 'Handler';
                }
                context[actionName] && context[actionName](e);
            },
            _getViewTriggerOptions: function (attr) {
                var nameParts = attr.split('?');
                var name = nameParts[0];
                var options = {};
                if (nameParts[1]) {
                    options = app.core.util.qsToJSON(nameParts[1]);
                }
                options._viewName = name;
                return options;
            },
            _viewHandler: function (e) {
                var $el = $(e.currentTarget);
                var options = this._getViewTriggerOptions($el.attr('data-view'));

                var initializer = function (options) {
                    var ctor = app.view.ctor(options._viewName);
                    return new ctor(options);
                };
                this.viewWindow(options._viewName, initializer, options);
            },
            _widgetHandler: function (e) {
                var $el = $(e.currentTarget);
                var options = this._getViewTriggerOptions($el.attr('data-widget'));

                this.widgetWindow(options._viewName, options);
            },
            _destroy: function () {
                // 清理在全局注册的事件处理器
                this.options.autoResize && $(window).off('resize', this.resize);

                // 关闭该组件下的所有弹出窗口
                _(this._windows).each(function (window) {
                    window.close();
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

        app.view = {
            _ctors: {}
        };

        app.view.base = base;

        app.view.createExecutor = function (executor) {
            if (_.isObject(executor) && !_.isFunction(executor)) {

                return function (options) {
                    var app = options.sandbox.app;
                    var View = app.view.define(executor);
                    return new View(options);
                }
            } else {
                return executor;
            }
        }

        app.view.register = function (name, ctor) {
            if (app.view._ctors[name]) {
                app.core.logger.warn('View naming conflicts: ' + name);
            } else {
                app.view._ctors[name] = ctor;
            }
        }
        app.view.ctor = function (name) {
            return app.view._ctors[name];
        }

        mvvm(app);
        subview(app);
        subwindow(app);

        app.view.define = function (obj, inherits) {
            inherits || (inherits = []);
            inherits.push(obj);

            var ctor = app.core.View.extend($.extend.apply($, [true, {}, app.view.base].concat(inherits)));
            // 注册 View
            if (obj && obj.name) {
                app.view.register(obj.name, ctor);
            }
            return ctor;
        };
    };
});
