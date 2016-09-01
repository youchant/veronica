define([
], function () {

    'use strict';

    return function (app) {
        var core = app.core;
        var _ = app.core._;
        var $ = app.core.$;

        app.env = {};

        /**
         * 是否是调试模式
         */
        app.env.isDebug = function () {
            return core.getConfig().debug === true;
        }

        /**
         * 获取发布后的 widget 路径
         */
        app.env.getReleaseWidgetPath = function () {
            return app.config.releaseWidgetPath;
        }
    };

});
