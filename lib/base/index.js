define([
    'jquery',
    './lodashExt/index',
    './klass',
    './Observable',
    './logger',
    './history'
], function ($, _, klass, Observable, Logger, History) {

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
            overwrite: [],
            initPropsMethod: '_initProps'
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
            extendMethod(obj, options.initPropsMethod, function () {
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
        klass: klass,
        Observable: Observable,
        Logger: Logger,
        History: History,
        history: new History,
        extendMethod: extendMethod,
        extendClass: extendClass
    };

    return baseLib;
});
