define([
], function () {

    'use strict';

    return function (app) {
        var _ = app.core._;
        var $ = app.core.$;
        var VER_ROLE = 'data-ver-role';

        /**
         * 无法直接构造
         * @classdesc 页面 parser
         * @class Parser
         * @memberOf veronica
         */

        /** @lends veronica.Parser# */
        var parser = {
            /**
             * 解析页面，初始化指定 DOM 下的 widget
             * @param {string|Object} [dom] - dom 元素或选择器
             */
            parse: function (dom) {
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

                app.widget.start(widgetList);
            },

            /**
             * 解析 widget 下的所有视图
             * @param {Widget} widget - widget
             * @param {object} views - 初始化器键值对
             */
            parseView: function (widget, views) {
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
        }

        /**
         * 页面 parser
         * @name parser
         * @memberOf veronica.Application#
         * @type {veronica.Parser}
         */
        app.parser = parser;
    };

});
