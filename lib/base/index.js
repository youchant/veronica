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
    Logger, aspect, History) {

    'use strict';

    var baseLib = {
        _: _,
        $: $,
        EventEmitter: EventEmitter,
        klass: klass,
        ClassBase: ClassBase,
        Events: Events,
        Logger: Logger,
        History: History,
        history: new History,
        aspect: aspect
    };

    return baseLib;
});
