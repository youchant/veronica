define(function () {

    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;

        var options = {
            activeView: null
        };

        /** @lends veronica.View# */
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
            views: null
        };

        /** @lends veronica.View# */
        var methods = {
            /**
             * 获取或设置子视图
             * @function
             * @param {string} name 视图名称
             * @param {Object} view 视图配置对象
             * @return {veronica.View}
             */
            view: function (name, viewConfig) {
                var view;
                if (_.isUndefined(viewConfig)) {
                    view = this._views[name];
                } else {
                    this._destroyView(name);
                    view = this._createView(viewConfig, name);
                    if (view != null) {
                        this._views[name] = view;
                    }
                }

                return view;
            },

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
                _(this.switchable).each(function (name) {
                    me.view(name) && me.view(name).hide();
                });
                targetView.show();

                // 触发事件
                this.trigger('activeView', this._activeViewName);
                targetView.trigger('active');
            },

            /**
             * 启用子部件，会自动附加该视图标识符作为标记
             * @param {Array.<object>} list 部件配置列表
             * @return {Promise}
             */
            startWidgets: function (list) {
                return this.options.sandbox.startWidgets(list, null, this.cid);
            },
            stopChildren: function () {
                this.options.sandbox.stopChildren(this.cid);
            },
            _createSubviews: function (views) {
                var me = this;
                views || (views = this.views);
                if (views) {
                    views = _.result(this, 'views');
                    // 渲染子视图
                    _.each(views, function (viewConfig, name) {
                        if (_.isString(viewConfig)) { return; }  //TODO: 为了排除 active: 'xxx' 的情况，待废弃
                        me.view(name, viewConfig);
                    });

                    // 设置默认活动视图
                    this.options.activeView && this.active(this.options.activeView);
                }
            },

            // 从配置中获取视图配置
            _viewConfig: function (name) {
                var views = _.result(this, 'views');
                if (name && views) {
                    var viewConfig = views[name];
                    if (_.isString(viewConfig)) { return null; }
                    return viewConfig;
                }
                return views;
            },

            // 创建视图
            _createView: function (view, name) {
                if (view.cid) {  // 视图对象
                    view._name = name;
                    return view;
                }

                var viewConfig = view;
                if (_.isFunction(view)) {  // 方法
                    viewConfig = view.apply(this);
                }

                if (_.isString(viewConfig.initializer)) {
                    viewConfig.initializer = app.widget._localWidgetExes[viewConfig.initializer];
                }

                // 确保 initializer 是个方法
                var viewInitializer = app.view.define(viewConfig.initializer, true);
                var viewOptions = $.extend({}, viewConfig.options) || {};

                if (_.isString(viewOptions.host)) {
                    viewOptions.host = this.$(viewOptions.host);
                }

                viewOptions = _.extend({
                    _name: name,
                    sandbox: this.options.sandbox,
                    host: viewOptions.el ? false : this.$el
                }, viewOptions);

                // host 不存在，则不创建视图
                if (viewOptions.host != null && viewOptions.host.length === 0) {
                    return null;
                }

                var viewObj = viewInitializer(viewOptions);

                // 取出延迟监听的事件，并进行监听
                var me = this;
                _.chain(this._delayEvents).filter(function (obj) {
                    return obj.name === name;
                }).each(function (obj) {
                    me.listenTo(viewObj, obj.event, obj.callback);
                });

                return viewObj;
            },

            // 销毁视图
            _destroyView: function (viewName) {
                var me = this;
                if (_.isUndefined(viewName)) {
                    // 销毁所有子视图
                    _(this._views).each(function (view, name) {
                        me._destroyView(name);
                    });
                } else {
                    var view = this.view(viewName);
                    if (view) {
                        view.stopChildren && view.stopChildren();
                        view.unsub && view.unsub();
                        view.destroy && view.destroy();
                        view.remove && view.remove();
                        view.sandbox && (view.sandbox = null);

                        // 移除对该 view 的引用
                        this._views[viewName] = null;
                        delete this._views[viewName];
                    }
                }
            }
        };

        $.extend(app.view.base._defaults, options);
        $.extend(app.view.base, configs);
        $.extend(app.view.base, methods);

    };
});
