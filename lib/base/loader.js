// core
define([
    'jquery'
], function ($) {

    'use strict';

    /**
     * @namespace
     * @memberOf veronica
     */
    var loader = {};

    /**
     * 使用全局的require变量
     * @returns {Object} RequireJS 的 require 变量（修复使用 almond 后本地 require 被覆盖的问题）
     */
    loader.useGlobalRequire = function () {
        return window.require ? window.require : require;
    };

    /**
     * 使用全局的requirejs变量
     * @returns {Object} RequireJS 的 requirejs 变量（修复使用 almond 后本地 requirejs 被覆盖的问题）
     */
    loader.useGlobalRequirejs = function () {
        return window.requirejs ? window.requirejs : requirejs;
    }

    /**
     * 请求一个脚本
     * @param {Array|Object} modeuls - 要请求的模块（requirejs的require方法所需配置）
     * @param {boolean} [condition=true] - 发起请求的条件，如果不满足条件，则不进行请求
     * @param {object} [requireConfig] - 额外的 require 配置
     * @return {Promise}
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
