// 应用程序模块
define([
    './core'
], function (core) {
    'use strict';

    var Application = (function () {

        function Application(options) {
            var $ = core.$;

            this._extensions = [];
            this.name = options.name;
            this.core = core;
            this.lang = {};
            this.config = $.extend({
                extensions: [],
                modules: []
            }, options);
        }

        // 初始化应用程序
        Application.prototype.launch = function () {
            var promises = [];
            var me = this;

            var dms = me.config.module.defaultSource;
            var require = core.useGlobalRequire();

            this.core.logger.time("appStart");

            // 加载扩展
            _(this.config.extensions).each(function (ext) {
                var dfd = $.Deferred();


                if (_.isString(ext)) {
                    require([ext], function (fn) {
                        _.isFunction(fn) && me.addExtension(fn);
                        dfd.resolve();
                    }, function (err) {
                        console.error(err);
                        dfd.reject();
                    });
                } else {
                    _.isFunction(ext) && me.addExtension(ext);
                    dfd.resolve();
                }
                promises.push(dfd.promise());
            });

            // 加载模块
            _(this.config.modules).each(function (moduleConfig) {
                var dfd = $.Deferred();

                // 将字符类型的模块配置转换成对象
                if (_.isString(moduleConfig)) {
                    moduleConfig = {
                        name: moduleConfig,
                        source: dms
                    };
                }

                // 设置默认值
                moduleConfig.multilevel = moduleConfig.multilevel || me.config.module.defaultMultilevel;
                moduleConfig.hasEntry = moduleConfig.hasEntry == null ? me.config.module.defaultHasEntry : moduleConfig.hasEntry;

                var source = me.core.getConfig().sources[moduleConfig.source] || moduleConfig.source || dms;
                var path = source + '/' + moduleConfig.name;

                me.module._modules[moduleConfig.name] = {
                    name: moduleConfig.name,
                    config: moduleConfig,
                    path: path
                };

                if (moduleConfig.hasEntry) {
                    // 加载模块主文件
                    require([path + '/main'], function (fn) {
                        me.module._modules[moduleConfig.name].execution = fn;
                        dfd.resolve();
                    }, function (err) {
                        console.error(err);
                        dfd.resolve();
                    });
                } else {
                    dfd.resolve();
                }

                promises.push(dfd.promise());
            });

            return $.when.apply($, promises).done(function () {
                me.module.apply();
                me.widget.package();
            });
        };

        // 停止应用程序
        Application.prototype.stop = function () {
            this.sandbox.stop();
        };

        // 使用第三方组件（废弃）
        Application.prototype.use = function (extension) {
            this._extensions.push(extension);
            return this;
        };

        // 使用用户扩展
        Application.prototype.addExtension = function (ext) {
            var me = this;
            if (!_.isArray(ext)) {
                ext = [ext];
            }
            $.each(ext, function (i, func) {
                func(me, Application);
            });
            return this;
        };

        // 混入
        Application.prototype.mixin = function (mixin, isExtend) {
            if (isExtend == null) {
                isExtend = true;
            }
            if (isExtend) {
                this.core.util.mixin(this, mixin);
            } else {
                this.core.util.mixin(Application, mixin);
            }
            return this;
        };

        // 扩展方法：应用程序广播事件，自动附加应用程序名
        Application.prototype.emit = function () {
            var args = Array.prototype.slice.call(arguments);
            // args[0] = args[0] + '.' + this.name;
            args.push(this.name);
            this.sandbox.emit.apply(this.sandbox, args);
        };

        return Application;
    })();

    return Application;

});
