define([
    'jquery',
    './lodashExt/index',
    'eventemitter',
    './klass',
    './classBase',
    './events',
    './logger',
    './aspect',
    './history'

], function ($, _, EventEmitter, klass, ClassBase, Events,
    Logger, aspect, history) {

    'use strict';

    var baseLib = {
        _: _,
        $: $,
        EventEmitter: EventEmitter,
        klass: klass,
        ClassBase: ClassBase,
        Events: Events,
        Logger: Logger,
        history: history,
        aspect: aspect
    };

    return baseLib;
});
