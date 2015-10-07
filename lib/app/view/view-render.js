define(function () {

    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;
        var noop = $.noop;

        var options = {
            _place: 0,
            autoRender: true,
            autoCreateSubview: true
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
             *  **`重写`** 进行UI增强（在 `render` 过程中，需要自定义的一些行为，
             * 通常放置一些不能被绑定初始化的控件初始化代码）
             * @type {function}
             * @deprecated
             * @example
             *   enhance: function () {
             *       this.$('.chart').chart({
             *           type: 'pie',
             *           data: ['0.3', '0.2']
             *       })
             *   }
             */
            enhance: noop,

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

            _render: function (template, isHtml) {
                var hasTpl = !!template;
                var options = this.options;
                var sandbox = options.sandbox;
                var html;

                if (hasTpl) {
                    if (isHtml) {
                        html = template;  // 为了提高效率，不使用 jquery 的 html() 方法
                    } else {
                        var tpl = _.isFunction(template) ?
                            template : _.template(template, { variable: 'data' });  // 如果使用 Lodash，这里调用方式有差异

                        html = tpl(_.extend({ lang: app.lang[this.options.langClass] }, this.options));
                    }

                    html && (this._html(html));
                }


                this.trigger('rendering');

                if (this.options.host && this.state.isAppended !== true) {
                    var placeMethod = options._place === 1 ? 'prependTo' : 'appendTo';
                    // 只有当前页面与 view 所属页面相同时，才呈现到界面上
                    if (!this.options._page || this.options._page === app.page.currName()) {
                        this.$el[placeMethod](this.options.host);
                        this.state.isAppended = true;
                    }
                };


                this._invoke('_activeUI');
                this._invoke('enhance');

                sandbox.log(this.cid + ' rendered');

                /**
                 * 渲染完毕
                 * @event View#rendered
                 */
                this.trigger('rendered');

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
                    url = _.result(this, 'templateUrl');
                }
                this.state.templateIsLoading = true;

                $.get(url, data).done(function (template) {
                    me.state.templateIsLoading = false;

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
             * **`可重写`** 激活UI，界面渲染完毕后执行的方法，可用于进行 jQuery 插件初始化
             * 以及其他控件的初始化等
             * @private
             * @function
             * @example
             *   var baseActiveUI = app.view.base._activeUI;
             *   app.view.base._activeUI = function () {
             *     baseActiveUI();
             *     // 放置你的自定义代码
             *   }
             */
            _activeUI: function (app) {

                // 启用布局控件
                if ($.layout) {
                    var me = this;
                    setTimeout(function () {
                        _.each(this.$('[data-part=layout]'), function (el) {
                            $(el).layout({
                                applyDemoStyles: false,
                                closable: false,
                                resizable: false,
                                slidable: false,
                                spacing_open: 0
                            });
                        });
                    }, 0);
                }

            }
        };

        $.extend(app.view.base._defaults, options);
        $.extend(app.view.base, configs);
        $.extend(app.view.base, methods);

    };
});
