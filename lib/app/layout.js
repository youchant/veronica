define([
], function () {

    'use strict';

    return function (app) {
        var _ = app.core._;
        var $ = app.core.$;
        var PAGEVIEW_CLASS = 'v-render-body';
        var cst = app.core.constant;

        /**
         * @typedef layoutConfig
         * @property {string} html - 布局的HTML
         * @property {string} url - 获取布局的地址
         */

        /**
         * @namespace
         * @memberOf Application#
         */
        var layout = {
            /**
             * 布局存储
             * @private
             */
            _layouts: { },
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
            add: function (layout) {
                var me = this;
                $.each(layout, function (i, lay) {
                    if (_.isString(lay)) {
                        lay = {
                            html: lay
                        };
                    }
                    me._layouts[i] = lay;
                });
                return this;
            },
            /**
             * 改变布局
             * @param {string} name - 布局名称
             * @returns {Promise}
             * @fires Application#layout.layoutChanging
             */
            change: function (name) {
                var me = this;
                var dfd = app.core.util.donePromise();

                var $pageView = $('.' + PAGEVIEW_CLASS);
                if ($pageView.length === 0) {
                    $pageView = $('body');
                }
                _.each($pageView.find('.ver-widget'), function (el) {
                    app.widget.stop($(el));
                });

                var layout = this.get(name);

                if (!layout) {
                    app.core.logger.warn('Could not find the layout configuration! layout name: ' + name);
                    return app.core.util.failPromise();;
                }

                /**
                 * **消息：** 布局改变中
                 * @event Application#layout.layoutChanging
                 * @type {string}
                 * @property {string} name - 名称
                 */
                app.emit('layoutChanging', name);

                if (layout.url) {
                    dfd = $.get(layout.url).done(function (resp) {
                        layout.html = resp;
                    });
                }

                dfd.done(function () {
                    $pageView.html(layout.html);
                });

                return dfd;
            },
            /**
             * 获取布局配置
             * @param {string} name - 布局名称
             * @returns {layoutConfig}
             */
            get: function (name) {
                return this._layouts[name];
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
        };

        layout._layouts[cst.SCAFFOLD_LAYOUT_NAME] = {
            html: '<div class="' + PAGEVIEW_CLASS + '"></div>'
        };

        app.layout = layout;
    };

});
