define([
], function () {

    'use strict';

    return function (app) {
        var _ = app.core._;
        var $ = app.core.$;
        var VER_ROLE = 'data-ver-role';

        app.parser = {}

        app.parser.parse = function (dom, type) {
            dom || (dom = 'body');

            var widgetList = [];
            $(dom).find('[' + VER_ROLE + ']').each(function (idx, el) {
                var $el = $(el);
                var data = $el.data();

                data.options || (data.options = {});
                data.options.el = $el;
                widgetList.push({
                    name: data.verRole,
                    options: data.options
                });
            });

            app.sandbox.startWidgets(widgetList);
        }

        app.parser.parseView = function (widget, views) {
            $(widget.$el).find('[' + VER_ROLE + ']').each(function (idx, el) {
                var $el = $(el);
                var data = $el.data();

                data.options || (data.options = {});
                data.options.el = $el;
                widget.view(data.verRole, {
                    name: data.verRole,
                    initializer: views[data.verRole],
                    options: data.options
                });
            });
        }
    };

});