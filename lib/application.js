// 应用程序模块
define([], function () {
    'use strict';

    var Application = (function () {

        function Application() {
            this._extensions = [];
        }

        // 初始化应用程序
        Application.prototype.start = function () {
            var promises = [];
            var me = this;

            this.core.logger.time("appStart");
            _(this._extensions).each(function (ext) {
                var dfd = $.Deferred();

                if (_.isString(ext)) {
                    me.core.logger.log("extensionLoading", [ext]);
                    me.core.logger.time("extensionLoad." + ext);
                    require([ext], function (fn) {
                        _.isFunction(fn) && me.ext(fn);
                        me.core.logger.log("extensionLoaded", [ext]);
                        me.core.logger.time("extensionLoad." + ext, 'End');
                        dfd.resolve();
                    }, function () {
                        dfd.reject();
                    });
                } else {
                    _.isFunction(fn) && me.ext(fn);
                    dfd.resolve();
                }
                promises.push(dfd.promise());
            });
            return $.when.apply($, promises);
        };

        // 停止应用程序
        Application.prototype.stop = function () {
            this.sandbox.stop();
        };

        // 使用第三方组件
        Application.prototype.use = function (extension) {
            this._extensions.push(extension);
            return this;
        };

        // 使用用户扩展
        Application.prototype.ext = function (ext) {
            ext(this, Application);
            return this;
        };

        //
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
