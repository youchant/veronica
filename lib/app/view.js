define([
    './view/view-mvvm',
    './view/view-view',
    './view/view-window'
], function (mvvm, subview, subwindow) {

    /**
     * Backbone View Object
     * @external Backbone.View
     * @see {@link http://backbonejs.org/#View}
     */

    /**
     * 事件处理函数
     * @callback eventCallback
     * @param {...*} param - 事件参数
     */

    /**
     * 消息订阅处理函数
     * @callback messageCallback
     * @param {...*} param - 消息传递的参数
     */


    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;
        var noop = $.noop;
        /**
         * @classdesc 视图
         * @class View
         * @augments Backbone.View
         */

        /**@lends View.prototype */
        var base = {
            /**
             * 根元素自定义类名
             * @type {string}
             * @default
             */
            className: 'ver-view',

            /**
             * 模板
             * @type {string|function}
             * @default
             */
            template: null,

            /**
             * 该视图的默认参数
             * @type {object}
             * @default
             */
            defaults: {},

            /**
             * 配置该视图的子视图
             * @type {function|object}
             * @default
             */
            views: null,

            /**
             * 配置该视图的子视图 **`重写`**
             * @type {function}
             * @default
             * @example
             *   aspect: function(){
             *     this.after('initAttr', function(){
             *         this.param = { test: 'A' }
             *     });
             *     this.before // ...
             *   }
             */
            aspect: noop,

            /**
             * 订阅消息 **`重写`**
             * @type {function}
             * @default
             * @example
             *   subscribe: function(){
             *       this.sub('setTriggers', function(){
             *           alert('I received this message');
             *       })
             *       this.sub ...
             *   }
             */
            subscribe: noop,

            /**
             * 监听自身和子视图事件 **`重写`**
             * @type {function}
             * @default
             * @example
             *   listen: function(){
             *       this.listenTo('rendered', function(){
             *           // 处理代码
             *       });
             *       this.listenTo ...
             *       this.listenToDelay('edit', 'saved', function(){
             *       })
             *   }
             */
            listen: noop,

            /**
             *  **`重写`** 进行UI增强（在 `render` 过程中，需要自定义的一些行为，
             * 通常放置一些不能被绑定初始化的控件初始化代码）
             * @type {function}
             * @default
             * @example
             *   enhance: function(){
             *       this.$('.chart').chart({
             *           type: 'pie',
             *           data: ['0.3', '0.2']
             *       })
             *   }
             */
            enhance: noop,

            /**
             * **`重写`** 视图的自定义初始化代码
             * @type {function}
             * @default
             */
            init: noop,

            /**
             * **`重写`** 初始化属性
             * @type {function}
             * @default
             * @example
             *  initAttr: function(){
             *      this.message = 'hello';
             *      this.baseModel = {
             *          data: {
             *              name: 'veronica'
             *          }
             *      }
             *  }
             */
            initAttr: noop,

            /**
             * **`重写`** 重写该方法，使视图自适应布局，当开启 `autoResize` 后，窗口大小变化时，该方法会被调用，
             * 如果有必要，在该方法中应编写窗口大小变化时，该视图对应的处理逻辑
             * @type {function}
             */
            resize: noop,

            /**
             * **`重写`** 视图渲染完毕后执行的方法
             * @type {function}
             * @example
             *   rendered: function () {
             *       this.getModel();
             *   }
             */
            rendered: noop,

            /**
             * **`重写`** 模型绑定完成后执行的方法
             * @type {function}
             * @example
             *   modelBound: function () {
             *       this.loadData();
             *   }
             */
            modelBound: noop,

            /**
             * **`重写`** 混入其他视图方法
             * @type {function}
             * @returns {array}
             * @example
             *   mixins: function () {
             *       return [editHelper];
             *   }
             */
            mixins: noop,

            /**
             * **`重定义`** 根据元素获取该元素上创建的界面控件的实例
             * @type {function}
             * @returns {object}
             * @example
             *   instance: function (el) {
             *       return this.$(el).data('instance');
             *   }
             */
            instance: noop,

            /**
             * **`重写`** 自定义销毁，通常用于释放视图使用的全局资源
             * @type {function}
             * @example
             *   _customDestory: function () {
             *     $(window).off('resize', this.resizeHanlder);
             *   }
             */
            _customDestory: noop,

            /**
             * 可切换的视图集合
             */
            switchable: [],

            /**
             * **`重写`** 视图的静态视图模型，所有视图实例和不同的模型对象都会包含的模型属性
             * @type {function|object}
             * @example
             *   staticModel: function (app) {
             *     return {
             *       listSource: app.data.source()
             *     };
             *   }
             */
            staticModel: {},

            attrChanged: {},

            /**
             * 视图初始化
             * @function
             * @inner
             * @listens View#initialize
             */
            initialize: function (options) {

                var me = this;

                options || (options = {});

                /**
                 * @var {string} cid - 视图唯一标识符
                 * @memberOf View#
                 */

                /**
                 * 默认绑定视图对象到函数上下文的函数
                 * @name binds
                 * @memberOf View#
                 */
                this.binds = ['resize'];

                this._rendered = false;
                this._windows = {};  // 子窗口集合
                this._views = {};  // 子视图集合
                this._delayEvents = [];
                this._attributes = {};
                /**
                 * 默认的基础视图模型
                 * @name baseModel
                 * @memberOf View#
                 */
                this.baseModel = _.result(this, 'staticModel');
                this.viewModel = {};  // 该视图的视图模型
                this._activeViewName = null;
                this._name = options._name;

                /**
                 * 选项
                 * @name options
                 * @memberOf View#
                 * @property {boolean} [autoAction=false] - 自动绑定Action事件
                 *   当在模板中使用如下写法时：
                 *   ```html
                 *   <button data-action="add">添加</button>
                 *   ```
                 *   如果该属性为 `true`，将自动查找该视图的 `addHandler` 方法作为该按钮点击事件的处理函数
                 *
                 * @property {boolean} [autoRender=true] - 自动渲染. 视图一初始化就进行渲染
                 * @property {boolean} [autoResize=false] - 自适应窗口变化. 该属性设为true后，当窗口大小变化时，会自动调用`resize`方法，因此需要重写该方法
                 * @property {boolean} [autoCreateSubview=true] - 在视图渲染时，自动创建子视图，需设置 views 属性
                 * @property {boolean} [domReady=false] - 是否视图DOM元素已准备好，这会影响视图的首次渲染
                 * @property {boolean} [autoST=false] -
                 *   自动设置触发器. 该属性为true后，会广播 `setTriggers` 消息，可将该视图的工具条（由 defaultToolbarTpl 指定）
                 *   注入到其他widget，需要额外设置 `toolbar` 项，指定该视图的注入到的widget名称
                 * @property {string} [toolbar='toolbar'] - 触发器放置的 widget name
                 * @property {string} [defaultToolbarTpl='.tpl-toolbar'] - 触发器默认模板的选择器
                 * @property {object} [windowOptions=false] - 设置当视图单独位于窗口中时，窗口的选项
                 * @property {object} [sharedModel=null] - 视图没有自己的视图模型，来源于该属性共享的视图模型
                 * @property {array} [sharedModelProp=null] - 共享视图模型的属性集合
                 *   ```
                 *   [['destPropName', 'originPropName'], 'propName2']
                 *   ```
                 * @property {string} [langClass=null] - 视图所属的 language class，在模板中，可通过 `data.lang.xxx` 来访问特定的语言文本
                 * @property {boolean} [bindEmptyModel=false] - 当视图模型没赋值时，是否也进行绑定
                 * @property {string} [activeView=null] - 初始活动的子视图名称
                 * @default {}
                 * @todo 这里参数默认值合并使用了深拷贝，大多数时候其实没必要，目前实际测试速度影响暂时不大
                 */
                this.options = $.extend(true, {
                    autoAction: false,
                    autoRender: true,
                    autoResize: false,
                    autoCreateSubview: true,
                    domReady: false,
                    autoST: false,
                    toolbar: 'toolbar',
                    defaultToolbarTpl: '.tpl-toolbar',
                    /**
                     * @deprecated
                     * @private
                     */
                    lazyTemplate: false,
                    windowOptions: false,
                    sharedModel: null,
                    sharedModelProp: null,
                    langClass: null,
                    bindEmptyModel: false,
                    activeView: null
                }, this.defaults, options);

                // 将方法绑定到当前视图
                if (this.binds) {
                    this.binds.unshift(this);
                    _.bindAll.apply(_, this.binds);
                }

                // 混入AOP方法
                app.core.util.extend(this, app.core.aspect);

                // 应用mixins
                this._applyMixins();

                this._loadPlugin();

                this._invoke('aspect');

                this._defaultListen();

                this._invoke('listen');  // 添加子视图监听

                if (this.options.autoResize) {
                    this.listenTo(this, 'rendered', function () {
                        _.defer(me.resize);
                    });
                    $(window).on('resize', this.resize);
                }


                (this.options.sharedModel != null) && this.model(this.shareModel(this.options.sharedModel), false);

                // 初始化窗口大小
                if (this.options.parentWnd && this.options.windowOptions) {
                    this.options.parentWnd.setOptions(this.options.windowOptions);
                    // TODO: 这里遇到 positionTo 的 window，调整大小后可能会错位
                    this.options.parentWnd.config.center && this.options.parentWnd.center();
                }

                // 初始化自定义属性
                this.initAttr(app, _, $);

                this.subscribe(app, _, $);  // 初始化广播监听

                this.init(app, _, $);

                this._autoAction();

                // 渲染
                this.options.autoRender && this._firstRender();
            },
            _applyMixins: function () {
                //TODO: 这里应将同名的属性或方法进行合并
                var me = this;
                _.each(this._invoke('mixins'), function (mixin) {
                    _.each(mixin, function (value, key) {
                        if (me[key] == null) {
                            me[key] = value;
                        }
                    });
                });
            },
            _defaultListen: function () {
                var me = this;
                this.listenTo(this, 'modelBound', function (model) {
                    // 更新子视图模型
                    _(me._views).each(function (view) {
                        if (view.options.sharedModel || view.options.sharedModelProp) {
                            view.model(view.shareModel(model));
                        }
                    });
                    me._invoke('modelBound');
                });
                this.listenTo(this, 'rendering', function () {
                    // 自动创建子视图
                    if (this.options.autoCreateSubview) {
                        this._createSubviews();
                    }
                });
                this.listenTo(this, 'rendered', function () {
                    // 在渲染视图后重新绑定视图模型
                    this._bindViewModel();
                    this.options.autoST && this.setTriggers();
                    this._invoke('rendered');
                });

                // 监听属性变更
                this.listenTo(this, 'attr-changed', function (name, value) {
                    var handler = this.attrChanged[name];
                    if (handler == null) { handler = this.attrChanged['defaults'] };
                    this._invoke(handler, value, name);
                });
            },
            _autoAction: function () {
                if (this.options.autoAction) {
                    // 代理默认的事件处理程序
                    this.events || (this.events = {});
                    $.extend(this.events, {
                        'click [data-action]': '_actionHandler',
                        'click [data-dlg-view]': '_dlgViewHandler',
                        'click [data-dlg-widget]': '_dlgWidgetHandler'
                    });
                }
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
            _invoke: function () {
                var args = _.toArray(arguments);
                args = args.concat([app, _, $]);
                var methodName = args[0];
                var method = methodName;
                if (_.isString(methodName)) {
                    method = this[methodName];
                }
                return method.apply(this, _.rest(args));
            },
            /**
             * 定义属性
             * @function
             * @param {object} options - 配置项
             * @param {string} options.name - 属性名称
             * @param {function} [options.getter] - 获取数据的方法
             * @param {string} [options.origin=options] - 数据来源（包括：'options', 'global', 'querystring'）
             * @param {string} [options.event=rendered] - 初始化时机（所有该视图相关的事件名称）
             * @param {string} [options.originName] - 原始数据的字段名称
             */
            defineAttr: function (options) {
                if (options.origin == null) options.origin = 'options';
                if (options.event == null) options.event = 'rendered';
                if (options.originKey == null) options.originKey = options.name;

                var me = this;
                if (options.origin === 'options') {
                    if (options.getter == null) {
                        options.getter = function (data) {
                            return this.options[data.originKey];
                        }
                    }
                }

                if (options.origin === 'querystring') {
                    if (options.getter == null) {
                        options.getter = function (opt) {
                            return app.qs.get(opt.originKey);
                        }
                    }
                    // 监听查询字符串改变
                    this.sub('qs-changed', function (obj, name, value) {
                        if (name === options.originKey) {
                            me.attr(options.name, value);
                        }
                    });
                }

                // 当事件发生时，设置该属性
                this.listenTo(this, options.event, function () {
                    var val = this._invoke(options.getter, options);

                    this.attr(options.name, val);
                });

            },
            /**
             * 获取设置属性
             * @function
             */
            attr: function (name, value) {
                if (!_.isUndefined(value)) {
                    this._attributes[name] = value;
                    this.trigger('attr-changed', name, value);
                }
                return this._attributes[name];
            },
            /**
              * 替换模板文件
              * @function
              */
            replaceTpl: function (origin, content, isDom) {
                if (isDom) {
                    this.template = $('<div>' + this.template + '</div>').find(origin).replaceWith(content).end().html();
                } else {
                    this.template = this.template.replace(origin, content);
                }
            },
            /**
              * 显示该视图
              * @function
              */
            show: function () {
                var me = this;
                this.$el.show(false, function () {
                    if (me.options.autoResize) {
                        me.resize();
                    }
                });
            },
            /**
              * 隐藏该视图
              * @function
              */
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
                    this._invoke('enhance');
                    this.trigger('rendered');
                } else {
                    this.render();
                }
            },
            /**
             * 刷新界面
             * @param {string} [url] - 内容获取路径
             * @param {*} [data] - 数据
             */
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
            /**
             * 渲染界面
             * @param {string} [template] 模板
             * @fires View#rendered
             */
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
                        this.$el.get(0).innerHTML = template;  // 为了提高效率，不使用 jquery 的 html() 方法
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
                    // 只有当前页面与 view 所属页面相同时，才呈现到界面上
                    if (!this.options._page || this.options._page === app.page.active()) {
                        this.$el[placeMethod](this.options.host);
                        this._appended = true;
                    }
                };

                sandbox.log(this.cid + ' rendered');
                this._rendered = true;

                this._invoke('_activeUI');
                this._invoke('enhance');

                /**
                 * 渲染完毕
                 * @event View#rendered
                 */
                this.trigger('rendered');

                return this;
            },
            /**
              * 延迟监听子视图
              * @param {string} name - 子视图名称
              * @param {string} event - 事件名称
              * @param {eventCallback} callback - 回调
              */
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
            /**
              * 订阅消息
              * @param {string} name 消息名
              * @param {messageCallback} listener 消息订阅处理函数
              */
            sub: function (name, listener) {

                this.options.sandbox.on(name, listener, this, this.cid);
            },
            /**
              * 发布消息
              * @param {string} name 消息名
              * @param {...*} msgParam 消息传递的参数
              */
            pub: function () {
                this.options.sandbox.emit.apply(this.options.sandbox,
                    Array.prototype.slice.call(arguments));
            },
            /**
              * 取消该视图的所有消息订阅
              */
            unsub: function () {
                this.options.sandbox.stopListening(this.cid);
            },
            /**
             * 启用子部件，会自动附加该视图标识符作为标记
             * @param {object[]} list 部件配置列表
             */
            startWidgets: function (list) {
                return this.options.sandbox.startWidgets(list, null, this.cid);
            },
            // 停用该视图创建的子部件
            stopChildren: function () {
                this.options.sandbox.stopChildren(this.cid);
            },
            /**
             * 设置触发器
             * @param {string} [toolbarTpl=options.defaultToolbarTpl] - 工具条选择器
             * @returns void
             * @fires View#setTriggers
             */
            setTriggers: function (toolbarTpl) {
                toolbarTpl || (toolbarTpl = this.options.defaultToolbarTpl);
                var sandbox = this.options.sandbox;

                /**
                 * **消息：** 设置触发器
                 * @event View#setTriggers
                 * @param {string} html - 工具条模板
                 * @param {string} name - 目标名称
                 * @param {View} view - 当前视图
                 */
                this.pub('setTriggers', this.$(toolbarTpl).html(),
                    this.options.toolbar || this._name, this);
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
                context[actionName] && context[actionName](e, app, _, $);
            },
            // 获取触发视图配置项
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
            _dlgViewHandler: function (e) {
                var $el = $(e.currentTarget);
                var options = this._getViewTriggerOptions($el.attr('data-dlg-view'));

                var initializer = function (options) {
                    var ctor = app.view.ctor(options._viewName);
                    return new ctor(options);
                };
                this.viewWindow(options._viewName, initializer, options);
            },
            _dlgWidgetHandler: function (e) {
                var $el = $(e.currentTarget);
                var options = this._getViewTriggerOptions($el.attr('data-dlg-widget'));

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
            /**
             * 销毁该视图
             */
            destroy: function () {
                this._destroy();
            }
        };

        /**
         * @namespace
         * @memberOf Application#
         */
        var view = {
            _ctors: {}
        };

        /**
         * 基础配置对象
         */
        view.base = base;


        /**
         * 创建一个 View 执行器
         * @private
         */
        view._createExecutor = function (executor) {
            if (_.isObject(executor) && !_.isFunction(executor)) {

                return function (options) {
                    var app = options.sandbox.app;
                    var View = app.view.define(executor);
                    return new View(options);
                }
            } else {
                if (executor.extend) {  // 检测是否是 Backbone.View 构造函数
                    return function (options) {
                        return new executor(options);
                    }
                } else {
                    return executor;
                }
            }
        }

        /**
         * 全局注册 View
         */
        view.register = function (name, ctor) {
            if (app.view._ctors[name]) {
                app.core.logger.warn('View naming conflicts: ' + name);
            } else {
                app.view._ctors[name] = ctor;
            }
        }

        // 查找 View 构造器
        view.ctor = function (name) {
            return app.view._ctors[name];
        }


        /**
         * 创建一个自定义 View 定义
         * @param {object} [obj={}] - 自定义属性或方法
         * @param {array} [inherits=[]] - 继承的属性或方法组
         * @param {boolean} [isFactory] - 是否该视图定义是个工厂方法
         */
        view.define = function (obj, inherits, isFactory) {
            if (_.isBoolean(inherits) && isFactory == null) {
                isFactory = inherits;
                inherits = [];
            }
            if (isFactory == null) isFactory = false;
            inherits || (inherits = []);
            inherits.push(obj);

            var ctor = app.core.View.extend($.extend.apply($, [true, {}, app.view.base].concat(inherits)));
            // 注册 View
            if (obj && obj.name) {
                app.view.register(obj.name, ctor);
            }
            // 使用工厂模式，不需要用 `new`
            if (isFactory) {
                return function (options) {
                    return new ctor(options);
                }
            }
            return ctor;
        };

        app.view = view;

        mvvm(app);
        subview(app);
        subwindow(app);
    };
});
