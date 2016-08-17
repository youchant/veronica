define([
    'jquery',
    'underscore',
    'eventemitter'
], function ($, _, EventEmitter) {

    'use strict';

    return {
        $: $,
        _: _,
        EventEmitter: EventEmitter
    };
});
