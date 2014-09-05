
define([], function () {
    'use strict';

    // thx h5-boilerplate
    // from: https://github.com/h5bp/html5-boilerplate/blob/master/src/js/plugins.js

    (function () {
        var method;
        var noop = function () { };
        var methods = [
            'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
            'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
            'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
            'timeline', 'timelineEnd', 'timeStamp', 'trace', 'warn'
        ];
        var length = methods.length;
        var console = (window.console = window.console || {});

        while (length--) {
            method = methods[length];

            // Only stub undefined methods.
            if (!console[method]) {
                console[method] = noop;
            }
        }
    }());

    // thx aurajs
    // borrow from aura: https://github.com/aurajs/aura

    var noop = function () { },
        DEFAULT_NAME = 'veronica',
        console = window.console || {};

    var isIE8 = function _isIE8() {
        return (!Function.prototype.bind || (Function.prototype.bind && typeof window.addEventListener === 'undefined')) &&
            typeof console === 'object' &&
            typeof console.log === 'object';
    };

    function Logger(name) {
        this.name = name || DEFAULT_NAME;
        this._log = noop;
        this._warn = noop;
        this._error = noop;
        this._info = noop;
        this.time = noop;
        return this;
    }

    Logger.prototype.setName = function (name) {
        name || (name = DEFAULT_NAME);
        this.name = name;
        return this;
    };

    Logger.prototype.enable = function () {
        this._log = (console.log || noop);
        this._info = (console.info || this._info);
        this._warn = (console.warn || this._log);
        this._error = (console.error || this._log);
        this.time = this._time;

        if (Function.prototype.bind && typeof console === "object") {
            var logFns = ["log", "warn", "error"];
            for (var i = 0; i < logFns.length; i++) {
                console[logFns[i]] = Function.prototype.call.bind(console[logFns[i]], console);
            }
        }

        return this;
    };

    Logger.prototype.write = function (output, args) {
        var parameters = Array.prototype.slice.call(args);
        parameters.unshift(this.name + ":");
        if (isIE8()) {
            output(parameters.join(' '));
        } else {
            output.apply(console, parameters);
        }
    };

    Logger.prototype.log = function () {
        this.write(this._log, arguments);
    };

    Logger.prototype.warn = function () {
        this.write(this._warn, arguments);
    };

    Logger.prototype.error = function () {
        this.write(this._error, arguments);
    };

    Logger.prototype.info = function () {
        this.write(this._info, arguments);
    };

    Logger.prototype._time = function (name, tag) {
        tag || (tag = '');
        console['time' + tag](name);
    };

    return Logger;
});
