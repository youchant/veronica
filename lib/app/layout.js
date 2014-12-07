define([
], function () {

    'use strict';

    return function (app) {
        var _ = app.core._;
        var $ = app.core.$;
        var PAGEVIEW_CLASS = 'v-render-body';

        app.mixin({
            _layouts: {
                'scaffold': {
                    html: '<div class="' + PAGEVIEW_CLASS + '"></div>'
                }
            }
        });

        app.mixin({
            addLayout: function (layout) {
                _.each(layout, function (item, name) {
                    if (_.isString(item)) {
                        layout[name] = {
                            html: item
                        };
                    }
                });
                $.extend(this._layouts, layout);
                return this;
            },
            getLayout: function (name) {
                return this._layouts[name];
            },
            switchLayout: function (layoutName) {
                var me = this;
                var dfd = $.Deferred();
                var $pageView = $('.' + PAGEVIEW_CLASS);

                if ($pageView.length === 0) {
                    $pageView = $('body');
                }
                _.each($pageView.find('.ver-widget'), function (el) {
                    me.widget.stop($(el));
                });
                var layout = this.getLayout(layoutName);
                if (layout) {
                    this.emit('layoutSwitching', layoutName);
                    if (layout.url) {
                        $.get(layout.url).done(function (resp) {
                            $pageView.html(resp);
                            dfd.resolve();
                        });
                    } else {
                        $pageView.html(layout.html);
                        dfd.resolve();
                    }
                } else {
                    dfd.resolve();
                }

                return dfd.promise();
            },
            // 初始化布局
            initLayout: function () {
                var scaffold = this.getLayout('scaffold');
                if (scaffold.html) {
                    $('body').prepend(scaffold.html);
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