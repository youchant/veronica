define([
    '../../base/index'
],function (baseLib) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var noop = $.noop;

    return function (base) {

        var options = {
            _place: 0,
            autoRender: true
        };

        var props = {
            _templateIsLoading: false,
            _isAppended: false
        };

        /** @lends veronica.View# */
        var configs = {
            /**
             * 模板
             * @type {string|Function}
             */
            template: null,
            /**
             * 模板路径
             * @type {string|Function}
             */
            templateUrl: null,
            /**
             * 模板引擎
             * @type {string}
             * @default
             */
            templateEngine: 'lodash',



            /**
             * **`重写`** 视图渲染完毕后执行的方法
             * @type {function}
             * @example
             *   rendered: function (app) {
             *       this.getModel();
             *   }
             */
            rendered: noop
        };

        /** @lends veronica.View# */
        var methods = {

            /**
             * 更新指定元素内容
             * @param {} selector
             * @param {} url
             * @param {} data
             * @returns {}
             */
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

            /**
             * 渲染界面
             * @param {string} [template] 模板
             * @fires View#rendered
             */
            render: function (template) {
                template || (template = this.template);

                if (this.templateUrl) {
                    this._refresh();
                } else {
                    if (this.options.el && !template) {
                        // 将当前元素内容作为 template
                        template = _.unescape(this.$el.html());
                    }
                    this._render(template);
                }
                return this;
            },

            _html: function (html) {
                this.$el.get(0).innerHTML = html;
            },
            _templateEngine: function () {
                var app = this.app();
                return app.templateEngine.get(this.templateEngine);
            },
            _compileTemplate: function (templateText) {
                return this._templateEngine().compile(templateText, this);
            },
            _executeTemplate: function (compiled) {
                var options = this._templateEngine().options(this);
                return compiled(options);
            },
            _renderTemplate: function (template) {
                var compiled = _.isFunction(template) ? template : this._compileTemplate(template);
                return this._executeTemplate(compiled);
            },
            _render: function (template, isHtml) {
                var app = this.app();
                // TODO: 进行模板预编译缓存
                var hasTpl = !!template;
                var options = this.options;
                var html;

                if (hasTpl) {
                    if (isHtml) {
                        html = template;  // 为了提高效率，不使用 jquery 的 html() 方法
                    } else {
                        html = this._renderTemplate(template);
                    }

                    html && (this._html(html));
                }


                this.trigger('rendering');

                var hostNode = this._getHostNode();
                if (hostNode && this._isAppended !== true) {
                    var placeMethod = options._place === 1 ? 'prependTo' : 'appendTo';
                    // 只有当前页面与 view 所属页面相同时，才呈现到界面上
                    if (app.widget.isCurrBatch(this._getBatchName())) {
                        this.$el[placeMethod](hostNode);
                        this._isAppended = true;
                    }
                };


                this._invoke('_rendered');

                /**
                 * 渲染完毕
                 * @event View#rendered
                 */
                this.trigger('rendered');

                this.log(this.cid + ' rendered');

                return this;
            },
            /**
             * 刷新界面
             * @private
             * @param {string} [url] - 内容获取路径
             * @param {*} [data] - 数据
             */
            _refresh: function (url, data) {
                var me = this;
                if (url == null) {
                    url = this._invoke('templateUrl');
                }
                this._templateIsLoading = true;

                $.get(url, data).done(function (template) {
                    me._templateIsLoading = false;

                    if (_.isString(template)) {  // 仅当获取到模板时，才进行渲染
                        me._render(template, true);
                        me.trigger('refresh');
                    } else {
                        me.trigger('refresh-fail');
                    }
                }).fail(function () {
                    // 失败则关闭父级窗口
                    me.options.parentWnd && me.options.parentWnd.close();
                });
            },
            /**
             * **`可重写`** 渲染完成后调用的内部方法，可用于进行 jQuery 插件初始化
             * 以及其他控件的初始化等
             * @private
             * @function
             * @example
             *   var baseRendered = app.view.base._rendered;
             *   app.view.base._rendered = function () {
             *     this._call(baseRendered, arguments);
             *     // 放置你的自定义代码
             *   }
             */
            _rendered: function (app) {

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
            }
        };

        base._extend({
            props: props,
            options: options,
            configs: configs,
            methods: methods
        });
    };
});
