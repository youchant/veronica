// core
define([
    'jquery',
    'underscore',
    'eventemitter',
    './logger',
    './util',
    './aspect'
], function ($, _, EventEmitter, Logger, util, aspect) {

    'use strict';

    var core = { $: $, _: _, ext: {}, helper: {} };  // jQuery 和 Underscore对象

    // 获取全局配置
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

    core.logger = new Logger('core');
    if (core.getConfig().debug) {
        core.logger.enable();
    }

    // 中介者
    core.mediator = new EventEmitter(emitterConfig);

    return core;
});