define(function () {

    //var WND_CONTAINER = '#ver-modal';

    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;
        var noop = $.noop;

        // 获取或设置子视图
        app.view.base.view = function (name, view) {
            var me = this;
            if (_.isUndefined(view)) {
                return this._views[name];

            } else {
                this._destroyView(name);

                view = this._views[name] = this._createSubview(view, name);

                _.chain(this._delayEvents).filter(function (obj) {
                    return obj.name === name;
                }).each(function (obj) {
                    me.listenTo(view, obj.event, obj.callback);
                });
                return view;
            }
        };

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
                views['active'] && this.active(views['active']);
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
            view.initializer = app.view.createExecutor(view.initializer);

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

        // 激活子视图
        app.view.base.active = function (name) {
            var me = this;
            var targetView;
            if (_.isUndefined(name)) {
                targetView = this.view(this._activeViewName);
                return targetView;
            }

            this._activeViewName = name;
            targetView = this.view(this._activeViewName);

            _(this.options.switchable).each(function (name) {
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
