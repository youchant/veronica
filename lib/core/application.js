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
        Application.prototype.launch = function (options) {
            var promises = [];
            var me = this;

            options || (options = {});

            // 加载扩展
            _(this.config.extensions).each(function (ext) {

                var dfd = core.loader.require(ext, _.isString(ext)).done(function (ext, fn) {
                    _.isFunction(fn) && me.use(fn);
                });

                promises.push(dfd);
            });

            // 加载模块
            _(this.config.modules).each(function (moduleConfig) {

                var module = me.module.create(moduleConfig);
                var entryFileUrl = module.path + '/' + module.config.entryPath;
                var dfd = core.loader.require(entryFileUrl, moduleConfig.hasEntry)
                    .done(function (m, fn) {
                        module.execution = fn;
                        me.module.add(module);
                    });

                promises.push(dfd);
            });

            return $.when.apply($, promises).done(function () {
                me.module.apply();
                me.widget.package();

                if (options.parse) {
                    me.parser.parse();
                }
            });
        };

        // 停止应用程序
        Application.prototype.stop = function () {
            this.sandbox.stop();
        };

        // 使用用户扩展
        Application.prototype.use = function (ext) {
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

        Application.prototype.hasFeature = function () {

        }

        return Application;
    })();

    return Application;

});
