define(function () {

    //var WND_CONTAINER = '#ver-modal';

    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;
        var noop = $.noop;

        app.view.base._createViewModel = function (obj) {
            return obj;
        };
        // 装载视图模型（数据， 是否更新视图绑定-默认更新）
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
