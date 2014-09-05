// core
define([
    'jquery',
    'underscore',
    'eventemitter',
    './events',
    './view',
    './history',
    './router',
    '../util/logger',
    '../util/util',
    '../util/aspect'
], function ($, _, EventEmitter, Events,
    View, history, Router, Logger, util, aspect) {

    'use strict';

    var core = {
        $: $,
        _: _,
        ext: {},
        helper: {},
        View: View,
        Router: Router,
        history: history,
        Events: Events
    };

    // 从RequireJS中获取全局配置
    var getConfig = function () {
        return requirejs.s.contexts._.config;
    };
    var emitterConfig = _.defaults(getConfig() || {}, {
        wildcard: true,
        delimiter: '.',
        newListener: true,
        maxListeners: 50
    });

    core.getConfig = getConfig;

    core.util = util;

    core.aspect = aspect;

    core.logger = new Logger();
    if (core.getConfig().debug) {
        core.logger.enable();
    }

    // 中介者
    core.mediator = new EventEmitter(emitterConfig);

    return core;
});
