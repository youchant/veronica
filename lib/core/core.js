// core
define([
    'jquery',
    'underscore',
    'eventemitter',
    './events',
    './view',
    './history',
    './router',
    './loader',
    '../util/logger',
    '../util/util',
    '../util/aspect'

], function ($, _, EventEmitter, Events,
    View, history, Router, loader, Logger, util, aspect) {

    'use strict';

    var core = {
        $: $,
        _: _,
        ext: {},
        helper: {},
        View: View,
        Router: Router,
        history: history,
        Events: Events,
        i18n: {
            defaultDialogTitle: '对话框',
            windowCloseText: '关闭',
            loadingText: '加载中...'
        },
        constant: {
            DEFAULT_MODULE_NAME: '__default__'
        }
    };

    core.loader = loader;
    core.util = util;

    core.aspect = aspect;


    // 获取全局配置
    core.getConfig = (function () {
        var requirejs = core.loader.useGlobalRequirejs();
        var globalConfig = requirejs.s ? requirejs.s.contexts._.config : {
            sources: {}
        };

        globalConfig.sources || (globalConfig.sources = {});

        return function () {
            return globalConfig;
        };
    }());

    core.logger = new Logger();
    if (core.getConfig().debug) {
        core.logger.enable();
    }

    // 中介者
    var emitterConfig = _.defaults(core.getConfig() || {}, {
        wildcard: true,
        delimiter: '.',
        newListener: true,
        maxListeners: 50
    });

    core.mediator = new EventEmitter(emitterConfig);

    return core;
});
