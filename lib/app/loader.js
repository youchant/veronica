define([
    'jquery'
], function ($) {

    'use strict';

    return function (app) {
        app.createProvider('loader');

        // default loader: use requirejs
        app.loader.add('default', {
            _useGlobalRequire: function () {
                return window.require ? window.require : require;
            },
            _useGlobalRequirejs: function () {
                return window.requirejs ? window.requirejs : requirejs;
            },
            config: function (config) {
                if (config) {
                    var require = this._useGlobalRequire();
                    require.config(config)
                }
                return requirejs.s ? requirejs.s.contexts._.config : {};
            },
            /**
             * 请求一个脚本
             * @param {Array|Object} modeuls - 要请求的模块（requirejs的require方法所需配置）
             * @param {boolean} [condition=true] - 发起请求的条件，如果不满足条件，则不进行请求
             * @param {object} [requireConfig] - 额外的 require 配置
             * @return {Promise}
             */
            require: function (modules, condition, requireConfig) {

                var dfd = $.Deferred();
                var require = this._useGlobalRequire();

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
        })
    }
});
