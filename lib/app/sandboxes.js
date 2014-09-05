define([
    '../core/core',
    '../core/sandbox'
], function (core, Sandbox) {

    'use strict';

    var _ = core._;

    return function (app) {
        app.sandboxes = {
            _sandboxPool: {}
        };

        // 创建沙箱
        app.sandboxes.create = function (ref, widgetName, hostType) {

            var sandbox = new Sandbox;
            var sandboxPool = this._sandboxPool;  // 沙箱池

            // 即使是相同的插件的sandbox都是唯一的
            if (sandboxPool[ref]) {
                throw new Error("Sandbox with ref " + ref + " already exists.");
            } else {
                sandboxPool[ref] = sandbox;
            }

            sandbox.name = widgetName;
            sandbox._ref = ref;
            sandbox._hostType = hostType;
            sandbox.app = core.app;

            return sandbox;
        };

        // 销毁指定的沙箱
        app.sandboxes.remove = function (ref) {
            this._sandboxPool[ref] = null;
            delete this._sandboxPool[ref];
        };

        // 从沙箱集合中根据引用获取沙箱
        app.sandboxes.get = function (ref) {
            var o = this._sandboxPool[ref];
            return o;
        };

        // 根据插件名称获取沙箱
        app.sandboxes.getByName = function (name) {
            return _(this._sandboxPool).filter(function (o) {
                return o.name === name;
            });
        };
    };

});
