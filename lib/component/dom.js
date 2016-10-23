define([
    '../base/index'
], function (baseLib) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var noop = $.noop;

    var COMPONENT_CLASS = 'ver-component';
    var COMPONENT_REF_NAME = '__componentRef__';

    var options = {
        el: null,
        replace: true,
        autoRender: true
    };

    var props = {
        _templateIsLoading: false,
        _compiledTpl: null,
        $mountNode: null,
        _outerEl: $({})
    };

    /** @lends veronica.Component# */
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
         * 组件生命周期钩子，视图渲染完毕后执行的方法
         * @type {function}
         * @example
         *   rendered: function (app) {
         *       this.getModel();
         *   }
         */
        rendered: noop
    };

    /** @lends veronica.Component# */
    var methods = {
        /**
         * 获取 UI Widget
         * @param {string} name - 名称
         */
        ui: function (name) {
            var $dom = this.$('[data-ref="' + name + '"]');
            return this._uiKit().getInstance($dom);
        },
        /**
         * 获取 DOM
         * @param {string} selector - 选择器
         * @return {jQueryDOM}
         */
        $: function (selector) {
            var rt = this.$el.find(selector);
            // 从外部元素中获取元素
            this._outerEl.each(function (i, el) {
                var isThis = $(el).is(selector);
                var r1;
                if (isThis) {
                    r1 = $(el);
                } else {
                    r1 = $(el).find(selector);
                }
                if (r1.length !== 0) {
                    $.merge(rt, r1);
                }
            });

            return rt;
        },
        _removeElement: function () {
            this._undelegateDOMEvents();
            if (this.options.replace) {
                // 换回挂载点
                this.$el.replaceWith(this.$mountNode);
            } else {
                this.$el.remove();
            }
            return this;
        },
        _setElement: function (element, delegate) {
            if (this.$el){
                this._removeElement();
            }
            this.$el = element instanceof $ ? element : $(element);

            if (this.$el.length === 0) {
                this.$el = $('<div></div>');  // 默认的元素
            }
            // 如果不是独立节点，则转换为独立节点
            if (this.$el.length > 1) {
                this.$el = $('<div></div>').append(this.$el);
            }

            this.el = this.$el[0];

            // hook element
            this.$el
                .addClass(COMPONENT_CLASS)
                .data(COMPONENT_REF_NAME, this._id);


            if (delegate !== false) this._delegateDOMEvents();
            return this;
        },
        _mountElement: function (node) {
            // ensure $mountNode
            if(!this.$mountNode){
                if (!node) {
                    node = this.options.el;
                }
                this.$mountNode = $(node);
            }

            var componetMana = this.get('part:app:component');
            if (!componetMana.isCurrBatch(this._getBatchName())) {
                return;
            }

            // 替换挂载点
            if (this.options.replace) {
                // 将挂载点属性复制到当前元素上
                var me = this;
                var attrs = this.$mountNode.prop('attributes');
                _.each(attrs, function (attr) {
                    if (attr.name === 'class') {
                        me.$el.addClass(attr.value);
                        return;
                    }
                    me.$el.attr(attr.name, attr.value);
                });

                this.$mountNode.replaceWith(this.$el);

            } else {
                // 附加到挂载点下
                this.$mountNode.append(this.$el);
            }

        },
        _templateEngine: function () {
            return this.get('part:app:templateEngine').get(this.templateEngine);
        },
        mount: function (node) {
            this._mountElement(node);

            this.trigger('remounted');
        },
        /**
         * 渲染界面
         * @param {string} [template] - 模板
         * @fires veronica.Component#rendered
         */
        render: function (template) {

            var me = this;

            // 编译模板
            if (template) {
                this._compile(template);
            } else {
                if (!this._compiledTpl) {
                    this._compile();
                }
            }

            var el = this._renderTemplate(this._compiledTpl);
            this._setElement(el, true);
            this._mountElement();
            this.trigger('rendered');

            return this;
        },
        /**
         * 编译
         * @param {string} [template] - 模板
         * @return {Promise<any>}
         * @private
         */
        _compile: function (template) {
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

    return {
        props: props,
        options: options,
        configs: configs,
        methods: methods
    };
});
