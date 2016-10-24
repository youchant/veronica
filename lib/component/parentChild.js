define([
    '../base/index'
], function (baseLib) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var VER_ROLE = 'data-ver-role';


    /** @lends veronica.Component# */
    var configs = {
        /**
         * 设置哪些子视图在同一时间只能显示一个
         * @type {Array}
         */
        switchable: [],
        /**
         * 设置子视图
         * @type {Object|Function}
         */
        components: null
    };

    /** @lends veronica.Component# */
    var methods = {
        /**
         * 激活子视图
         * @function
         * @param {string} name - 视图名称
         */
        active: function (name) {
            var me = this;

            this._activeViewName = _.isUndefined(name) ? this._activeViewName : name;
            var targetView = this.view(this._activeViewName);

            // 更新视图显示状态
            _.each(this.switchable, function (name) {
                me.view(name) && me.view(name).hide();
            });
            targetView.show();

            // 触发事件
            this.trigger('activeView', this._activeViewName);
            targetView.trigger('active');
        },
        /**
         * 获取所有子级 Id
         * @param result
         * @returns {Array.<string>}
         * @private
         */
        _descendant: function (result) {
            var me = this;
            if (result == null) {
                result = [];
            }
            var children = this._children;
            if (children == null || children.length === 0) {
                return result;
            }

            var ids = _.map(children, function (item) {
                return item.id;
            });

            result = result.concat(ids);

            _.each(ids, function (id) {
                var child = me._componentManager().get(id);
                result = child._descendant(result);
            });

            return result;
        },
        /**
         * 获取子组件 Id
         * @param {boolean} [isDescendant=false] - 是否获取子孙
         * @returns {Array.<string>} - ids
         */
        children: function (isDescendant) {
            if (isDescendant == null) {
                isDescendant = false;
            }
            if (!isDescendant) {
                return this._children;
            } else {
                return this._descendant();
            }
        },
        /**
         * 获取父组件 Id
         * @returns {string}
         */
        parent: function(){
          return this._parent;
        },
        /**
         * 获取所有父组件 Id
         * @returns {Array.<string>} - ids
         */
        parents: function () {
            var parentId = this._parent;
            var componentManager = this._componentManager();
            var result = [];
            while (parentId != null) {
                result.push(parentId);
                var parent = componentManager.get(parentId);
                parentId = parent._parent;
            }

            return result;
        },
        _addChild: function (child) {
            var me = this;
            child._parent = me._id;
            me._children.push({
                id: child._id,
                name: child.options._name
            });
            me.trigger('addChild', child);
        },
        removeChild: function (name) {
            _.remove(this._children, function (c) {
                return c.name === name;
            });
        },
        _findChild: function (name) {
            return _.find(this._children, function (c) {
                return c.name === name;
            });
        },
        /**
         * 启用子部件，会自动附加该视图标识符作为标记
         * @param {Array.<object>} list 部件配置列表
         * @return {Promise}
         */
        startChildren: function (list, batchName) {
            var me = this;
            var componentManager = this._componentManager();

            if (list == null) {
                list = _.result(this, 'components');
            }
            // normalize
            list = _.map(list, function (config) {
                if (_.isString(config)) {
                    config = {
                        name: config,
                        options: {}
                    }
                }
                var viewOptions = config.options || {};

                return config;
            });

            return componentManager.start(list, batchName).done(function () {
                var children = _.toArray(arguments);
                _.each(children, function (child) {
                    // 添加为子级
                    me._addChild(child);
                });

                // 设置默认活动视图
                me.options.activeView && me.active(me.options.activeView);
            });
        },
        /**
         * 停止所有子组件
         */
        stopChildren: function () {
            var children = this._children;
            var componentManager = this._componentManager();

            _.each(children, function (child) {
                componentManager.stop(child.id);
            });
        },
        /**
         * 解析组件并启动 DOM 上所有子组件
         * @returns {Promise}
         */
        parse: function () {
            var componentList = [];
            var me = this;
            this.$el.find('[' + VER_ROLE + ']').each(function (idx, el) {
                var $el = $(el);
                var data = $el.data();

                data.options || (data.options = {});
                data.options.el = $el;
                componentList.push({
                    name: data.name,
                    xtype: data.verRole,
                    options: data.options
                });
            });

            return me.startChildren(componentList);
        },
        /**
         * 停止单个子组件
         * @param name - 组件名称
         * @private
         */
        _stopChild: function (name) {
            var componentManager = this._componentManager();
            var me = this;
            var child = me._findChild(name);
            me.removeChild(name);
            componentManager.stop(child.id);
        }
    };

    return {
        props: {
            _children: [],
            _parent: null
        },
        configs: configs,
        methods: methods
    };
});
