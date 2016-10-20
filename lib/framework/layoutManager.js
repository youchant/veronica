define([
    '../base/index',
    './appProvider'
], function (baseLib, AppProvider) {

    'use strict';

    var SCAFFOLD_LAYOUT_NAME = 'scaffold';
    var _ = baseLib._;
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
     * @class LayoutManager
     * @classdesc 布局管理器
     */

    var LayoutManager = AppProvider.extend(/** @lends LayoutManager.prototype */{
        options: {
            rootNode: '.v-layout-root'
        },
        /**
         * @constructs
         * @param options
         */
        initialize: function(options){
            this.supr(options);
        },
        /**
         * 预处理
         * @param data
         * @returns {*}
         * @private
         */
        _preprocess: function (data) {
            if (_.isString(data)) {
                data = {
                    html: data
                };
            }
            return data;
        },
        /**
         * 获取布局根元素
         * @returns {*|jQuery|HTMLElement}
         * @private
         */
        _getLayoutRoot: function () {
            var $el = $(this.options.rootNode);
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
            var dfd = _.doneDeferred();

            var $layoutRoot = me._getLayoutRoot();
            var layout = this.get(name);

            // 找不到布局，则不进行切换
            if (!layout) {
                this.logger().warn('Could not find the layout configuration! layout name: ' + name);
                return _.doneDeferred();
            }

            /**
             * **消息：** 布局改变中
             * @event Application#layout.layoutChanging
             * @type {string}
             * @property {string} name - 名称
             */
            app.pub('layoutChanging', name, $layoutRoot);

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
            var scaffold = this.get(SCAFFOLD_LAYOUT_NAME);
            if (scaffold.html) {
                $('body').prepend(scaffold.html);
            }
        }
    });

    return LayoutManager;
});
