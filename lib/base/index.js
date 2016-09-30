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

    // global method

    var extendMethod = function(obj, name, method){
        var original = obj[name];
        var newMethod = method;
        obj[name] = function () {
            original.apply(this, Array.prototype.slice.call(arguments));
            newMethod.apply(this, Array.prototype.slice.call(arguments));
        }
    };

    var extendClass = function (obj, ext, options) {
        options = _.extend({
            overwrite: []
        }, options);

        ext.options && _.extend(obj.options, ext.options);
        ext.configs && _.extend(obj, ext.configs);

        _.each(ext.methods, function(method, name){
            if(obj[name] && options.overwrite.indexOf(name) < 0){
                extendMethod(obj, name, method);
                return;
            }
            obj[name] = method;
        });

        // 加入运行时属性
        if (ext.props) {
            extendMethod(obj, '_initProps', function () {
                var me = this;
                _.each(ext.props, function (prop, name) {
                    me[name] = prop;
                });
            });
        }
    }


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
        aspect: aspect,
        extendMethod: extendMethod,
        extendClass: extendClass
    };

    return baseLib;
});
