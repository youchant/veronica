define([
    '../core/sandbox'
], function (Sandbox) {

    'use strict';


    return function (app) {

        var core = app.core;
        var _ = core._;

        /**
         * 无法直接构造
         * @classdesc 管理所有沙箱
         * @class veronica.Sandboxes
         */

        /** @lends veronica.Sandboxes# */
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
            return _.filter(this._sandboxPool, function (o) {
                return o.name === name;
            });
        };

        /**
         * @name sandboxes
         * @memberOf veronica.Application#
         * @type {veronica.Sandboxes}
         */
        app.sandboxes = sandboxes;
    };

});
