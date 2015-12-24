define(function () {

    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;
        var noop = $.noop;

        var options = {
            bindEmptyModel: false,
            sharedModel: null,
            sharedModelProp: null
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
            modelBound: noop,

            /**
             * **`重定义`** 根据元素获取该元素上创建的界面控件的实例
             * @type {function}
             * @returns {object}
             * @example
             *   instance: function (el) {
             *       return this.$(el).data('instance');
             *   }
             */
            instance: noop
        };

        /** @lends veronica.View# */
        var methods = {

            /**
             * **`重定义`** 创建模型，编写视图模型创建的逻辑
             * @type {function}
             * @param {object} obj - 数据对象
             * @returns {object} 视图模型对象
             * @example
             *   app.view.base._createViewModel = function () {
             *     return kendo.observable(data);
             *   }
             */
            _createViewModel: function (obj) {
                return obj;
            },

            /**
             * **`重定义`** 模型绑定，编写视图模型如何与视图进行绑定的逻辑
             * @type {function}
             * @returns {void}
             * @example
             *   app.view.base._bind = function () {
             *     var vm = this.model();
             *     vm.$mount(this.$el.get(0));
             *   }
             */
            _bind: noop,

            /**
             * 获取或设置视图模型
             * @function
             * @param {object|string} data(propName) - 数据对象 | 属性名称
             * @param {bool} [bind=true] - 设置视图模型后，是否进行视图绑定
             * @returns {object} 视图模型对象
             */
            model: function (data, bind) {
                if (!_.isUndefined(data)) {

                    if (_.isString(data) && this.viewModel) {
                        return this.viewModel.get(data);
                    }

                    if (data.toJSON) { // 本身就是viewModel对象
                        this.viewModel = data;
                    } else {
                        var me = this;

                        // restore 原来模型的值
                        var baseModel = {};
                        if (this.viewModel != null && !$.isPlainObject(this.viewModel)) {
                            _.each(this.baseModel, function (value, key) {
                                baseModel[key] = me._getModelValue(key);
                            });
                        } else {
                            baseModel = this.baseModel;
                        }
                        this.viewModel = this._createViewModel($.extend({}, baseModel, data));
                    }

                    this.delegateModelEvents(this.viewModel);
                    if (bind !== false) {
                        this._bindViewModel();
                    }
                }
                return this.viewModel;
            },

            /**
             * 从外部模型设置视图模型
             * @function
             * @param {object} model - 外部的视图模型对象
             * @param {bool} [isForce=false] - 是否强制设置（默认情况下，当未设置 sharedModel 或 sharedModelProp 参数时，不能从外部接收视图模型
             * @returns {object} 视图模型
             */
            externalModel: function (model, isForce) {
                if (isForce == null) { isForce = false; }
                var acceptExternal = isForce === true ? true : (this.options.sharedModel || this.options.sharedModelProp);

                if (acceptExternal) {
                   return this.model(this._convertExternalModel(model));
                }
                return null;
            },

            /**
             * 获取后台请求的 url
             * @param name - url 名称
             * @return {string}
             */
            url: function (url) {
                return this.options.url[url];
            },

            // 从外部模型初始化视图模型
            _initModel: function () {
                if (this.staticModel != null) {
                    this.model({}, false);
                }
                if (this.options.sharedModel != null) {
                    this.model(this._convertExternalModel(this.options.sharedModel), false);
                }
            },

            // 创建共享视图模型
            _convertExternalModel: function (srcModel) {
                var props = this.options.sharedModelProp;
                var me = this;
                var destModel = {};
                if (srcModel == null) {
                    srcModel = this.options.sharedModel || {};
                }

                if (srcModel && props) {
                    _.each(props, function(prop) {
                        var targetKey, originKey;
                        if (_.isString(prop)) {
                            targetKey = prop;
                            originKey = prop;
                        } else {
                            targetKey = prop[0];
                            originKey = prop[1];
                        }

                        destModel[targetKey] = me._getModelValue(originKey, srcModel);
                    });
                } else {
                    destModel = srcModel;
                }
                return destModel;
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

            // 获取模型数据
            _getModelValue: function (name, model) {
                model || (model = this.model());
                return model.get(name);
            }
        };

        $.extend(app.view.base._defaults, options);
        $.extend(app.view.base, configs);
        $.extend(app.view.base, methods);
    };
});
