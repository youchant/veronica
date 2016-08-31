define([
    './base',
    './events',
    './view',
    './history',
    './router',
    './loader',
    './logger',
    './util',
    './aspect',
    './querystring'
], function (base, Events,
    View, history, Router, loader, Logger, util, aspect, querystring) {

    'use strict';

    /**
     * `veronica` 或者通过 `app.core`
     * @namespace veronica
     */

    var EventEmitter = base.EventEmitter;
    var $ = base.$;
    var _ = base._;

    /** @lends veronica# */
    var veronica = $.extend({}, base, {
        /**
         * 帮助对象
         */
        helper: {},
        View: View,
        Router: Router,
        history: history,
        Events: Events,

        /**
         * 所有常量
         */
        constant: {
            DEFAULT_MODULE_NAME: '__default__',
            SCAFFOLD_LAYOUT_NAME: 'scaffold',
            WIDGET_TYPE: 'widget',
            WIDGET_CLASS: 'ver-widget',
            WIDGET_TAG: 'ver-tag',
            SANDBOX_REF_NAME: '__sandboxRef__'
        },

    });

    /**
     * 所有枚举
     * @namespace
     * @memberOf veronica
     */
    var enums = { }
    veronica.enums = enums;

    /**
     * 沙箱宿主枚举
     * @readonly
     * @enum {string}
     * @memberOf veronica.enums
     */
    var hostType = {
        WIDGET: 'widget',
        APP: 'app'
    }
    veronica.enums.hostType = hostType;

    veronica.loader = loader;

    /**
     * 工具方法
     * @namespace util
     * @memberOf veronica
     */
    veronica.util = util;

    veronica.aspect = aspect;

    /**
     * 获取全局配置
     * @function
     * @return {Object}
     */
    veronica.getConfig = (function () {
        var requirejs = veronica.loader.useGlobalRequirejs();
        var globalConfig = requirejs.s ? requirejs.s.contexts._.config : {
            sources: {}
        };

        globalConfig.sources || (globalConfig.sources = {});

        return function () {
            return globalConfig;
        };
    }());

    /**
     * 日志记录
     * @type {Logger}
     */
    veronica.logger = new Logger();

    if (veronica.getConfig().debug) {
        veronica.logger.enable();
    }

    /**
     * 事件发送者
     * @external EventEmitter
     * @see {@link https://github.com/asyncly/EventEmitter2}
     */

    // 中介者
    var emitterConfig = _.defaults(veronica.getConfig() || {}, {
        wildcard: true,
        delimiter: '.',
        newListener: true,
        maxListeners: 50
    });

    veronica.createMediator = function () {
        return new EventEmitter(emitterConfig);
    }



    /**
     * 消息中介者对象
     * @type {EventEmitter}
     */
    veronica.mediator = new EventEmitter(emitterConfig);

    /**
     * 创建查询字符串处理对象
     * @function
     * @param {QueryStringType} choice - 查询字符串来源
     * @return {QueryString}
     */
    veronica.qs = querystring;

    return veronica;
});
