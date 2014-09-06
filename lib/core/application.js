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
                autoReport: true,
                extensions: [],
                modules: [],
                defaultPage: 'default'
            }, options);
        }

        // 初始化应用程序
        Application.prototype.launch = function () {
            var promises = [];
            var me = this;

            this.core.logger.time("appStart");

            // 加载扩展
            _(this.config.extensions).each(function (ext) {
                var dfd = $.Deferred();

                if (_.isString(ext)) {
                    me.core.logger.time("extensionLoad." + ext);
                    require([ext], function (fn) {
                        _.isFunction(fn) && me.addExtension(fn);
                        me.core.logger.time("extensionLoad." + ext, 'End');
                        dfd.resolve();
                    }, function () {
                        dfd.reject();
                    });
                } else {
                    _.isFunction(fn) && me.addExtension(fn);
                    dfd.resolve();
                }
                promises.push(dfd.promise());
            });

            // 加载模块
            _(this.config.modules).each(function (moduleConfig) {
                var dfd = $.Deferred();
                if (_.isString(moduleConfig)) {
                    moduleConfig = { name: moduleConfig, source: 'module' };
                }
                var sources = me.core.getConfig().sources;
                var source = sources[moduleConfig.source] || moduleConfig.source;
                var path = source + '/' + moduleConfig.name;

                // 添加部件 source
                sources['mod-' + moduleConfig.name] = path + '/widgets';

                require([path + '/main'], function (fn) {
                    me.module._modules[moduleConfig.name] = {
                        name: moduleConfig.name,
                        path: path,
                        execution: fn
                    };
                    dfd.resolve();
                }, function () {
                    dfd.reject();
                });

                promises.push(dfd.promise());
            });

            return $.when.apply($, promises);
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
