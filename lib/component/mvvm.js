define([
    '../base/index'
],function (baseLib) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var noop = $.noop;

    /**
     *
     * @type {{viewEngine: string, bindByBlock: boolean, bindWhenStabled: boolean}}
     */
    var options = {
        /**
         * 视图引擎名
         */
        viewEngine: ''
    };

    /** @lends Component# */
    var configs = {
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
        defaultModel: function(){
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
            return this.get('part:app:viewEngine').get(this.options.viewEngine);
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
                    this._viewModel = this._createViewModel($.extend({}, data));
                }

                this.trigger('modelCreated', this._viewModel);

                if (autoBind === true) {
                    this._bindViewModel();
                }
            }
            return this._viewModel;
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
            var $bindBlock = this.$('.data-bind-block').not(this.$('.ver-component .data-bind-block'));
            if($bindBlock.length === 0){
                $bindBlock = this.$el;
            }
            $bindBlock.each(function (i, el) {
                me._viewEngine().bind(me, $(el), me.model());
            });

            this.trigger('bound', this._viewModel);
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
        /**
         * 销毁模型
         * @private
         */
        _destoryModel: function(){
            // TODO: 这里没有配合 bindBlock 使用
            this._viewEngine().unbind(this);
            // 清除引用
            this._viewModel = null;
        }
    };

    return {
        options: options,
        configs: configs,
        methods: methods
    };
});
