// core
define([
    'jquery'
], function ($) {

    'use strict';

    /**
     * @namespace
     * @memberOf Veronica
     */
    var loader = {};

    /**
     * 使用全局的require变量
     */
    loader.useGlobalRequire = function () {
        return window.require ? window.require : require;
    };

    /**
     * 使用全局的requirejs变量
     */
    loader.useGlobalRequirejs = function () {
        return window.requirejs ? window.requirejs : requirejs;
    }

    /**
     * 请求一个脚本
     * @param {array|object} modeuls - 要请求的模块（requirejs的require方法所需配置）
     * @param {boolean} [condition=true] - 发起请求的条件，
     * @param {object} [requireConfig] - require 配置
     */
    loader.require = function (modules, condition, requireConfig) {

        var dfd = $.Deferred();
        var require = loader.useGlobalRequire();

        if (condition == null) condition = true;

        if (condition) {
            if (!$.isArray(modules)) { modules = [modules]; }

            if (requireConfig) {
                require.config(requireConfig);
            }

            require(modules, function () {
                var args;
                if (arguments.length === 1) {
                    args = arguments[0];
                } else {
                    args = Array.prototype.slice.call(arguments);
                }
                dfd.resolve(modules, args);
            }, function (err) {
                console.error(err);
                dfd.reject(err);
            });
        } else {
            dfd.resolve(modules, null);
        }
        return dfd.promise();
    }

    return loader;

});
