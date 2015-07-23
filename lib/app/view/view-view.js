define(function () {

    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;
        var noop = $.noop;


        // 创建已配置的子视图
        app.view.base._createSubviews = function (views) {
            var me = this;
            views || (views = this.views);
            if (views) {
                var views = _.result(this, 'views');
                // 渲染子视图
                _.each(views, function (func, name) {
                    if (_.isString(func)) { return; }  // 为了排除 active: 'xxx' 的情况
                    me.view(name, func);
                });
                // 设置默认活动视图
                this.options.activeView && this.active(this.options.activeView);
            }
        };
        // 创建子视图
        app.view.base._createSubview = function (view, name) {
            if (_.isFunction(view)) {  // 方法
                view = view.apply(this);
            }

            if (view.cid) {  // 视图对象
                view._name = name;
                return view;
            }

            // 配置对象
            view.options = view.options || {};
            if (_.isString(view.options.host)) {
                view.options.host = this.$(view.options.host);
            }

            // 确保 initializer 是个方法
            view.initializer = app.view._createExecutor(view.initializer);

            return view.initializer(_.extend({
                sandbox: this.options.sandbox,
                host: view.options.el ? false : this.$el,
                _name: name
            }, view.options));
        };

        // 销毁视图
        app.view.base._destroyView = function (viewName) {
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
                    delete this._views[viewName]
                }
            }
        };

        /**
         * 获取或设置子视图
         * @name view
         * @memberOf View#
         * @function
         * @param {string} name 视图名称
         * @param {View} view 视图对象
         */
        app.view.base.view = function (name, view) {
            var me = this;
            if (_.isUndefined(view)) {
                // 获取子视图
                view = this._views[name];
            } else {
                this._destroyView(name);

                view = this._views[name] = this._createSubview(view, name);

                // 取出延迟监听的事件，并进行监听
                _.chain(this._delayEvents).filter(function (obj) {
                    return obj.name === name;
                }).each(function (obj) {
                    me.listenTo(view, obj.event, obj.callback);
                });
            }
            return view;
        };

        /**
         * 激活子视图
         * @name active
         * @function
         * @memberOf View#
         * @param {string} name - 视图名称
         */
        // 
        app.view.base.active = function (name) {
            var me = this;
            var targetView;
            if (_.isUndefined(name)) {
                targetView = this.view(this._activeViewName);
                return targetView;
            }

            this._activeViewName = name;
            targetView = this.view(this._activeViewName);

            _(this.switchable).each(function (name) {
                me.view(name) && me.view(name).hide();
            });

            targetView.show();

            // 触发事件
            this.trigger('activeView', this._activeViewName);
            targetView.trigger('active');
        };

        // 激活UI
        app.view.base._activeUI = function () {

            // 启用布局控件
            if ($.layout) {
                var me = this;
                setTimeout(function () {
                    _.each(this.$('[data-part=layout]'), function (el) {
                        $(el).layout({
                            applyDemoStyles: false,
                            closable: false,
                            resizable: false,
                            slidable: false,
                            spacing_open: 0
                        });
                    });
                }, 0);
              
            }

        }
    };
});