define([
    '../core/sandbox'
], function (Sandbox) {

    'use strict';


    return function (app) {

        var core = app.core;
        var _ = core._;

        /**
         * 管理所有沙箱
         * @namespace
         * @memberOf Application#
         */
        var sandboxes = {
            _sandboxPool: {}
        };

        /**
         * 创建沙箱
         * @param {string} name - 沙箱名称
         * @param {veronica.enums.hostType} [hostType=WIDGET] - 宿主类型
         * @returns {Sandbox}
         */
        sandboxes.create = function (name, hostType) {
            var id = _.uniqueId('sandbox$');
            hostType || (hostType = core.enums.hostType.WIDGET);
            var sandbox = new Sandbox({
                name: name,
                _id: id,
                _hostType: hostType,
                app: core.app
            });

            var sandboxPool = this._sandboxPool;  // 沙箱池
            if (sandboxPool[id]) {
                throw new Error("Sandbox with ref " + id + " already exists.");
            } else {
                sandboxPool[id] = sandbox;
            }

            return sandbox;
        };

        /**
         * 移除沙箱
         * @param {string} id - 沙箱标识符
         */
        sandboxes.remove = function (id) {
            this._sandboxPool[id] = null;
            delete this._sandboxPool[id];
        };

        /**
         * 从沙箱集合中根据引用获取沙箱
         * @param {string} id - 沙箱标识符
         * @returns {Sandbox}
         */
        sandboxes.get = function (id) {
            return this._sandboxPool[id];
        };

        /**
         * 根据插件名称获取沙箱
         * @param {string} name - 沙箱名称
         * @returns {Sandbox[]}
         */
        sandboxes.getByName = function (name) {
            return _(this._sandboxPool).filter(function (o) {
                return o.name === name;
            });
        };

        app.sandboxes = sandboxes;
    };

});
