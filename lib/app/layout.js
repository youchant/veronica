define([
], function () {

    'use strict';

    return function (app) {
        var _ = app.core._;
        var $ = app.core.$;
        var PAGEVIEW_CLASS = 'page-view';

        app.mixin({
            _layouts: {
                'scaffold': '<div class="' + PAGEVIEW_CLASS + '"></div>'
            }
        });

        app.mixin({
            addLayout: function (layout) {
                $.extend(this._layouts, layout);
                return this;
            },
            getLayout: function (name) {
                return this._layouts[name];
            },
            switchLayout: function (layout) {
                var me = this;
                var $pageView = $('.' + PAGEVIEW_CLASS);
                this.emit('layoutSwitching', layout);

                if ($pageView.length === 0) {
                    $pageView = $('body');
                }
                _.each($pageView.find('.ver-widget'), function (el) {
                    me.widget.stop($(el));
                });

                $pageView.html(this.getLayout(layout));

            },
            initLayout: function () {
                var scaffold = this.getLayout('scaffold');
                if (scaffold) {
                    $('body').prepend(scaffold);
                }
            }
        }, false);

        app.layout = {
            add: function (layout) {
                return app.addLayout(layout);
            },
            active: function (name) {
                return app.switchLayout(name);
            },
            get: function (name) {
                return app.getLayout(name);
            },
            init: function () {
                return app.initLayout();
            }
        }
    };

});