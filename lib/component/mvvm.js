define([
    '../base/index'
],function (baseLib) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var noop = $.noop;

    return function (base) {


        /**
         *
         * @type {{viewEngine: string, bindByBlock: boolean, bindWhenStabled: boolean}}
         */
        var options = {
            viewEngine: '',
            bindByBlock: false
        };

        /** @lends veronica.View# */
        var configs = {
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
            defaultModel: function(){
                return {};
            },
            /**

            /**
             * **`重写`** 模型绑定完成后执行的方法
             * @type {function}
             * @example
             *   modelBound: function () {
             *       this.loadData();
             *   }
             */
            modelBound: noop
        };

        /** @lends veronica.View# */
        var methods = {

            /**
             * 创建模型，编写视图模型创建的逻辑
             * @type {function}
             * @param {object} obj - 数据对象
             * @returns {object} 视图模型对象
             * @example
             *   app.view.base._createViewModel = function () {
             *     return kendo.observable(data);
             *   }
             */
            _createViewModel: function (obj) {
                return this._viewEngine().create(obj, this);
            },

            /**
             * 模型绑定，编写视图模型如何与视图进行绑定的逻辑
             * @type {function}
             * @returns {void}
             * @example
             *   app.view.base._bind = function () {
             *     var vm = this.model();
             *     vm.$mount(this.$el.get(0));
             *   }
             */
            _bind: function () {
                var me = this;
                if (this.options.bindByBlock) {
                    this.$el.find('.data-bind-block')
                        .not(this.$el.find('.ver-widget .data-bind-block'))
                        .each(function (i, el) {
                            me._viewEngine().bind(me, $(el), me.model());
                        });
                } else {
                    me._viewEngine().bind(me, this.$el, me.model());
                }
            },
            _viewEngine: function () {
                var app = this.app();
                return app.viewEngine.get(this.options.viewEngine);
            },

            /**
             * 获取或设置视图模型
             * @function
             * @param {object|string} data(propName) - 数据对象 | 属性名称
             * @param {bool} [bind=true] - 设置视图模型后，是否进行视图绑定
             * @returns {object} 视图模型对象
             */
            model: function (data, autoBind) {
                var me = this;
                if (!_.isUndefined(data)) {

                    if (_.isString(data) && this._viewModel) {
                        if (autoBind != null) {
                            this._setModelValue(data, autoBind, this._viewModel);
                        }
                        return this._getModelValue(data);
                    }

                    if (data.toJSON) { // 本身就是viewModel对象
                        this._viewModel = data;
                    } else {
                        var baseModel = {};

                        this._viewModel = this._createViewModel($.extend({}, baseModel, data));
                    }

                    // TODO: delegate model events
                    this._viewEngine().bindEvents(me._viewModel, me);

                    this.trigger('modelInit', this._viewModel);

                    if (autoBind === true) {
                        this._bindViewModel();
                    }
                }
                return this._viewModel;
            },

            // 绑定视图模型
            _bindViewModel: function () {
                if (!this.options.bindEmptyModel && $.isEmptyObject(this._viewModel)) {
                    return;
                }

                this._bind();

                if (!this.$el.hasClass('k-bind-block')) {
                    this.$el.addClass('k-bind-block');
                }
                this.trigger('modelBound', this._viewModel);

                this._uiKit().addParts();

                this.log(this.cid + ' modelBound');
            },

            // 获取模型数据
            _getModelValue: function (name, model) {
                model || (model = this.model());
                return this._viewEngine().get(model, name);
            },
            _setModelValue: function (name, value, model) {
                model || (model = this.model());
                return this._viewEngine().set(model, name, value);
            }
        };

        base._extend({
            options: options,
            configs: configs,
            methods: methods
        });

        base._extendMethod('_setup', function () {
            if (this.model() == null) {
                this.model({});  // 设置该视图的视图模型
            }
        });


        base._extendMethod('_destroy', function () {
            // TODO: 这里没有配合 bindBlock 使用
            this._viewEngine().unbind(this);
            // 清除引用
            this._viewModel = null;
        });
    };
});
