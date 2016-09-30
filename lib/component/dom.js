define([
    '../base/index'
], function (baseLib) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var noop = $.noop;

    var COMPONENT_CLASS = 'ver-component';
    var COMPONENT_REF_NAME = '__componentRef__';

    return function (base) {

        var options = {
            el: null,
            replace: true,
            autoRender: true
        };

        var props = {
            _templateIsLoading: false,
            _compiledTpl: null,
            _mountNode: null
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
            $: function (selector) {
                return this.$el.find(selector);
            },
            removeElement: function () {
                if (this.options.replace) {
                    // 换回挂载点
                    this.$el.replaceWith(this.$mountNode);
                } else {
                    this.$el.remove();
                }
                return this;
            },
            setElement: function (element, delegate) {
                if (this.$el) this.undelegateDOMEvents();
                this.$el = element instanceof $ ? element : $(element);

                // 如果不是独立节点，则转换为独立节点
                if (this.$el.length > 1) {
                    this.$el = $('<div></div>').append(this.$el);
                }

                this.el = this.$el[0];

                // hook element
                this.$el
                    .addClass(COMPONENT_CLASS)
                    .data(COMPONENT_REF_NAME, this._id);

                // TODO: 这里涉及到继承时的类名设置
                if (this.options._xtypes) {
                    this.$el.addClass(this.options._xtypes.join(' '));
                }

                if (delegate !== false) this.delegateDOMEvents();
                return this;
            },
            mountElement: function () {
                var app = this.app();
                if (app.component.isCurrBatch(this._getBatchName())) {
                    if (this.options.replace) {
                        // 将挂载点属性复制到当前元素上
                        var me = this;
                        var attrs = this.$mountNode.prop('attributes');
                        _.each(attrs, function (attr) {
                            if(attr.name === 'class'){
                                me.$el.addClass(attr.value);
                                return;
                            }
                            me.$el.attr(attr.name, attr.value);
                        });

                        this.$mountNode.replaceWith(this.$el);

                    } else {
                        this.$mountNode.append(this.$el);
                    }
                }

            },
            _templateEngine: function () {
                var app = this.app();
                return app.templateEngine.get(this.templateEngine);
            },
            /**
             * 渲染界面
             * @fires View#rendered
             */
            render: function () {
                var me = this;
                var el = this._renderTemplate(this._compiledTpl);
                this.setElement(el, true);
                this.mountElement();
                this.trigger('ready');

                return this;
            },
            compile: function (template) {
                var me = this;
                return this._fetchTemplate(template).then(function (template) {
                    me._compiledTpl = _.isFunction(template) ? template : me._compileTemplate(template);
                    me.trigger('compiled');
                });
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
            _fetchTemplate: function (template) {
                var me = this;
                var dfd = $.Deferred();
                if (template == null) {
                    if (this.templateUrl) {
                        var url = this._invoke('templateUrl');
                        this._templateIsLoading = true;

                        $.get(url).always(function () {
                            me._templateIsLoading = false;
                        }).then(function (template) {
                            if (_.isString(template)) {
                                dfd.resolve(template);
                            } else {
                                dfd.reject();
                            }
                        }, function () {
                            dfd.reject();
                        });
                    } else {
                        template = this.template;
                        if (this.options.el && !template) {
                            // 将当前元素内容作为 template
                            template = this.template = _.unescape(this.$el.html());
                        }

                        dfd.resolve(template);
                    }
                } else {
                    dfd.resolve(template);
                }


                return dfd.promise();
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

        base._extendMethod('_listen', function () {
            this.listenTo(this, 'compiled', function (template) {
                this.options.autoRender && this.render();
            })
        })
    };
});
