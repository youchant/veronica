define([
    '../base/index',
    './appProvider'
], function (baseLib, AppProvider) {

    'use strict';


    /**
     * 添加布局
     * @param {object} layout - 布局配置
     * @example
     * ```
     *   app.layout.add({
     *    'admin': {
     *        html: '<div class="v-render-body"></div>'
     *    }
     *   });
     * ```
     */

    /**
     * @typedef LayoutConfig
     * @property {string} html - 布局的HTML
     * @property {string} url - 获取布局的地址
     */

    /**
     * 获取布局配置
     * @param {string} name - 布局名称
     * @returns {layoutConfig}
     */

    /**
     * 无法直接构造
     * @class veronica.Layout
     * @classdesc 布局
     */

    /**
     * 布局
     * @name layout
     * @memberOf veronica.Application#
     * @type {veronica.Layout}
     */

    var LayoutManager = AppProvider.extend({
        _preprocess: function (data) {
            if (_.isString(data)) {
                data = {
                    html: data
                };
            }
            return data;
        },
        _getLayoutRoot: function () {
            var $el = $('.' + app.config.page.defaultLayoutRoot);
            if ($el.length === 0) {
                $el = $('body');
            }
            return $el;
        },
        /**
         * 改变布局
         * @param {string} name - 布局名称
         * @returns {Promise}
         * @fires Application#layout.layoutChanging
         */
        change: function (name) {
            var me = this;
            var app = this.app();
            var dfd = doneDeferred();

            var $layoutRoot = me._getLayoutRoot();

            app.widget.stop($layoutRoot);

            var layout = this.get(name);

            // 找不到布局，则不进行切换
            if (!layout) {
                //app.core.logger.warn('Could not find the layout configuration! layout name: ' + name);
                return doneDeferred();
            }

            /**
             * **消息：** 布局改变中
             * @event Application#layout.layoutChanging
             * @type {string}
             * @property {string} name - 名称
             */
            app.pub('layoutChanging', name);

            if (layout.url) {
                dfd = $.get(layout.url).done(function (resp) {
                    layout.html = resp;
                });
            }

            dfd.done(function () {
                $layoutRoot.html(layout.html);
                app.pub('layoutChanged', name);
            });

            return dfd;
        },
        /**
         * 布局初始化
         */
        init: function () {
            var scaffold = this.get(cst.SCAFFOLD_LAYOUT_NAME);
            if (scaffold.html) {
                $('body').prepend(scaffold.html);
            }
        }
    });

    return LayoutManager;
});
