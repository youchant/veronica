define([
    '../base/index'
], function (baseLib) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var noop = $.noop;

    var props = {
        _bindDOM: false
    };

    /** @lends Component# */
    var configs = {
        viewEngine: '',
        /**
         * 组件生命周期钩子，返回默认的视图模型
         * @type {function}
         * @example
         *   defaultModel: function (app) {
         *     return {
         *       listSource: app.data.source()
         *     };
         *   }
         */
        defaultModel: function () {
            return {};
        },
        /**

         /**
         * 组件生命周期钩子，模型绑定完成后调用
         * @type {function}
         * @example
         *   bound: function () {
         *       this.loadData();
         *   }
         */
        bound: noop
    };

    /** @lends Component# */
    var methods = {
        _viewEngine: function () {
            return this.get('part:app:viewEngine').get(this.viewEngine);
        },
        /**
         * 获取或设置视图模型
         * @param {Object|string} [data(propName)] - 数据对象 | 属性名称
         * @param {boolean} [autoBind=false] - 是否进行视图绑定
         * @returns {Object} 视图模型对象
         * @example
         *  var vm = this.model()
         *  this.model({ test: 'xxx' })
         *  this.model('test', 'xxx')
         */
        model: function (name, value) {
            var me = this;
            if (!_.isUndefined(name)) {

                if (_.isString(name) && this._viewModel) {
                    if (value != null) {
                        this._setModelValue(name, value, this._viewModel);
                    }
                    return this._getModelValue(name);
                }

                var data = name;
                if (data.toJSON) { // 本身就是viewModel对象
                    this._viewModel = data;
                } else {
                    this._viewModel = this._createViewModel($.extend({}, data));
                }

                this.trigger('modelCreated', {
                    data: this._viewModel
                });
            }

            return this._viewModel;
        },
        /**
         * 获取 JSON 数据
         */
        toJSON: function(namePath){
            return this._modelToJSON(this.model(namePath));
        },
        /**
         * 创建视图模型
         * @param {Object} obj - 对象
         * @returns {obj}
         * @private
         */
        _createViewModel: function (obj) {
            return this._viewEngine().create(obj, this);
        },

        /**
         * 绑定视图模型
         * @private
         */
        _bindViewModel: function () {
            var me = this;
            var vm = me.model();
            if(vm == null){
                return;
            }
            var $bindBlock = this.$('.data-bind-block').not(this.$('.ver-component .data-bind-block'));
            if ($bindBlock.length === 0) {
                $bindBlock = this.$el;
            }
            $bindBlock.each(function (i, el) {
                me._viewEngine().bind(me, $(el), vm);
            });
            this._bindDOM = true;
            this.trigger('bound', {
                data: vm
            });
            this.log(this.cid + ' bound');
        },

        /**
         * 获取模型数据
         * @param name
         * @param model
         * @returns {*}
         * @private
         */
        _getModelValue: function (name, model) {
            model || (model = this.model());
            return this._viewEngine().get(model, name);
        },
        /**
         * 设置模型值
         * @param name
         * @param value
         * @param {Object} [model] - 模型
         * @returns {*}
         * @private
         */
        _setModelValue: function (name, value, model) {
            model || (model = this.model());
            return this._viewEngine().set(model, name, value);
        },
        _modelToJSON: function(data){
            return this._viewEngine().toJSON(data);
        },
        /**
         * 销毁模型
         * @private
         */
        _destoryModel: function () {
            // TODO: 这里没有配合 bindBlock 使用
            this._viewEngine().unbind(this);
            // 清除引用
            this._viewModel = null;
        }
    };

    return {
        props: props,
        configs: configs,
        methods: methods
    };
});
