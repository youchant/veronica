define(function () {

    return function (base, app) {
        var $ = app.core.$;
        var _ = app.core._;
        var noop = $.noop;

        var options = {
            viewEngine: '',
            bindByBlock: false,
            bindWhenStabled: false
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
            staticModel: null,

            /**
             * **`重写`** 处理与视图模型有关的事件绑定
             * @type {function}
             * @default
             * @example
             *   delegateModelEvents: function(vm){
             *     vm.bind('change', function () {
             *         // 处理代码
             *     });
             *     vm.bind('change.xxx', function () { });
             *
             *     this._invoke(this.base.delegateModelEvents, true, vm);
             *   }
             */
            delegateModelEvents: noop,

            /**
             * **`重写`** 模型改变处理函数
             * @type {object}
             * @example
             *   modelChanged: {
             *     'data.name': function(vm, e){
             *        vm.set('data.fullname', e.value);
             *     }
             *   }
             */
            modelChanged: {},

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
                        .not(this.$el.find('.ver-view .data-bind-block'))
                        .each(function (i, el) {
                            me._viewEngine().bind(me, $(el), me.model());
                        });
                } else {
                    me._viewEngine().bind(me, this.$el, me.model());
                }
            },
            _viewEngine: function () {
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
                        var me = this;
                        var baseModel = {};

                        this._viewModel = this._createViewModel($.extend({}, baseModel, data));
                    }

                    // delegate model events
                    this._viewEngine().bindEvents(me._viewModel, me);

                    this.delegateModelEvents(this._viewModel);

                    this.trigger('modelInit', this._viewModel);

                    if (autoBind === true) {
                        this._bindViewModel();
                    }
                }
                return this._viewModel;
            },

            // 绑定视图模型
            _bindViewModel: function () {
                var sandbox = this.options.sandbox;
                if (!this.options.bindEmptyModel && $.isEmptyObject(this._viewModel)) {
                    return;
                }

                this._bind();

                if (!this.$el.hasClass('k-bind-block')) {
                    this.$el.addClass('k-bind-block');
                }
                this.trigger('modelBound', this._viewModel);
                sandbox.log(this.cid + ' modelBound');
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
                this.model({});  // 该视图的视图模型
            }
        })

        base._extendMethod('_listen', function () {
            var eventName = this.options.bindWhenStabled ? 'modelStabled' : 'rendered';
            this.listenTo(this, eventName, function () {
                // 在渲染视图后重新绑定视图模型
                this._bindViewModel();
            })
        })

        base._extendMethod('_destroy', function () {
            // TODO: 这里没有配合 bindBlock 使用
            this._viewEngine().unbind(this);
            // 清除引用
            this._viewModel = null;
        });
    };
});
