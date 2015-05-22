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

    core.useGlobalRequire = function () {
        if (window.require) {
            return window.require;
        } else {
            return require;
        }
    };

    core.useGlobalRequirejs = function () {
        if (window.requirejs) {
            return window.requirejs;
        } else {
            return requirejs;
        }
    }
    // 从RequireJS中获取全局配置
    var globalConfig = {};
    var getConfig = function () {
        var requirejs = core.useGlobalRequirejs();
        if (requirejs.s) {
            return requirejs.s.contexts._.config;
        } else {
            return globalConfig;
        }
    };

    getConfig().sources || (getConfig().sources = {});


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
