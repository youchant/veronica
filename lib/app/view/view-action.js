define(function () {

    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;
        var noop = $.noop;

        app.view.base._autoAction = function () {
            if (this.options.autoAction) {
                // 代理默认的事件处理程序
                this.events || (this.events = {});
                $.extend(this.events, {
                    'click [data-action]': '_actionHandler',
                    'click [data-dlg-view]': '_dlgViewHandler',
                    'click [data-dlg-widget]': '_dlgWidgetHandler'
                });
            }
        }

        app.view.base._actionHandler = function (e, context) {
            context || (context = this);

            var $el = $(e.currentTarget);
            if ($el.closest('script').length > 0) return;
            if ($el.is('a, :submit, :button')) {
                e.preventDefault();
            }
            e.stopPropagation();
            //e.stopImmediatePropagation();

            var actionName = $el.data().action;
            if (actionName.indexOf('Handler') < 0) {
                actionName = actionName + 'Handler';
            }

            context[actionName] && this._invoke(context[actionName], e);
        }

        // 获取触发视图配置项
        app.view.base._getViewTriggerOptions = function (attr) {
            var nameParts = attr.split('?');
            var name = nameParts[0];
            var options = {};
            if (nameParts[1]) {
                options = app.core.util.qsToJSON(nameParts[1]);
            }
            options._viewName = name;
            return options;
        }

        app.view.base._dlgViewHandler = function (e) {
            var $el = $(e.currentTarget);
            var options = this._getViewTriggerOptions($el.attr('data-dlg-view'));

            var initializer = function (options) {
                var ctor = app.view.ctor(options._viewName);
                return new ctor(options);
            };
            this.viewWindow(options._viewName, initializer, options);
        }

        app.view.base._dlgWidgetHandler = function (e) {
            var $el = $(e.currentTarget);
            var options = this._getViewTriggerOptions($el.attr('data-dlg-widget'));

            this.widgetWindow(options._viewName, options);
        };
    };
});
