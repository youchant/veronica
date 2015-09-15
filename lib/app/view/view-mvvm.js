define(function () {

    //var WND_CONTAINER = '#ver-modal';

    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;
        var noop = $.noop;

        /**
         * **`重定义`** 模型绑定，编写视图模型如何与视图进行绑定的逻辑
         * @memberOf View#
         * @name _bind
         * @type {function}
         * @returns {void}
         * @example
         *   app.view.base._bind = function () {
         *     var vm = this.model();
         *     vm.$mount(this.$el.get(0));
         *   }
         */
        app.view.base._bind = noop;

        /**
         * **`重定义`** 创建模型，编写视图模型创建的逻辑
         * @memberOf View#
         * @name _createViewModel
         * @type {function}
         * @param {object} obj - 数据对象
         * @returns {object} 视图模型对象
         * @example
         *   app.view.base._createViewModel = function () {
         *     return kendo.observable(data);
         *   }
         */
        app.view.base._createViewModel = function (obj) {
            return obj;
        };

        /**
         * 获取或设置视图模型
         * @memberOf View#
         * @name model
         * @function
         * @param {object|string} data(propName) - 数据对象 | 属性名称
         * @param {bool} [bind=true] - 设置视图模型后，是否进行视图绑定
         * @returns {object} 视图模型对象
         */
        app.view.base.model = function (data, bind) {
            if (!_.isUndefined(data)) {

                if (_.isString(data) && this.viewModel) {
                    return this.viewModel.get(data);
                }

                if (data.toJSON) { // 本身就是viewModel对象
                    this.viewModel = data;
                } else {
                    this.viewModel = this._createViewModel($.extend({}, this.baseModel, data));
                }

                this.delegateModelEvents(this.viewModel);
                if (bind !== false) {
                    this._bindViewModel();
                }
            }
            return this.viewModel;
        };
        // 创建共享视图模型
        app.view.base.shareModel = function (model) {
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
        };
        // 绑定视图模型
        app.view.base._bindViewModel = function () {
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
        };
    };
});
