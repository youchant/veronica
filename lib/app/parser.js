define([
], function () {

    'use strict';

    return function (app) {
        var _ = app.core._;
        var $ = app.core.$;
        var PAGEVIEW_CLASS = 'page-view';

        app.parser = {}

        app.parser.parse = function (dom) {
            dom || (dom = 'body');
            var widgetList = [];
            $(dom).find('[data-ver-role]').each(function (idx, el) {
                var $el = $(el);
                var data = $el.data();

                data.options || (data.options = {});
                data.options.el = $el;
                widgetList.push({
                    name: data.verRole,
                    options: data.options
                });
            });

            app.widget.start(widgetList);
        }
    };

});