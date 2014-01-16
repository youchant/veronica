// 应用程序模块
define([], function () {
    'use strict';

    var Application = (function () {

        function Application() {
            this._extensions = [];
        }

        // 初始化应用程序
        Application.prototype.init = function () {
            var promises = [];
            var app = this;
            _(app._extensions).each(function (ext) {
                var dfd = $.Deferred();

                if (_.isString(ext)) {
                    require([ext], function (fn) {
                        _.isFunction(fn) && fn(app, Application);
                        dfd.resolve();
                    }, function () {
                        dfd.reject();
                    });
                } else {
                    _.isFunction(fn) && fn(app, Application);
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

        // 使用内置扩展
        Application.prototype.use = function (extension, baseUrl) {
            baseUrl = baseUrl || 'plugins/';
            if (baseUrl.indexOf('/', baseUrl.length - 1) === -1) {
                baseUrl += '/';
            }
            this._extensions.push(baseUrl + extension);
            return this;
        };

      

        // 使用用户扩展
        Application.prototype.ext = function (ext) {
            ext(this, Application.prototype);
            return this;
        };

        // 扩展方法：应用程序广播事件，自动附加应用程序名
        Application.prototype.emit = function () {
            var args = Array.prototype.slice.call(arguments);
            args[0] = args[0] + '.' + this.name;
            this.sandbox.emit.apply(this.sandbox, args);
        };

        return Application;
    })();

    return Application;

});
