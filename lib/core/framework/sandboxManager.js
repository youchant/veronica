define([
    '../base/index',
    './sandbox',
    './appProvider'
], function (baseLib, Sandbox, AppProvider) {

    'use strict';

    /**
     * @typedef SandboxChildren
     * @property {string} ref - sandbox 的唯一标识符
     * @property {string} caller - 开启该 sandbox 的对象的唯一标识符
     */

    var SANDBOX_TYPE_WIDGET = 'widget';


    /** @lends veronica.SandboxManager# */
    var SandboxManager = AppProvider.extend({
        /**
         * 创建沙箱
         * @param {string} name - 名称
         * @param {string} [ownerType='widget'] - 拥有者类型
         * @returns {Sandbox}
         */
        create: function (name, ownerType) {
            var me = this;
            var app = this.app();
            var id = _.uniqueId('sandbox$');
            ownerType || (ownerType = SANDBOX_TYPE_WIDGET);
            var sandbox = new Sandbox({
                name: name,
                _id: id,
                _ownerType: ownerType,
                app: app
            });

            var exists = me.get(id);
            if (exists) {
                throw new Error("Sandbox with ref " + id + " already exists.");
            } else {
                me.add(id, sandbox);
            }

            return sandbox;
        },
        /**
         * 根据插件名称获取沙箱
         * @param {string} name - 沙箱名称
         * @returns {Array<Sandbox>}
         */
        getByName: function (name) {
            return _.filter(this._pool, function (o) {
                return o.name === name;
            });
        },
        /**
         * 根据 DOM 元素获取沙箱
         * @param {object|string} el - 元素节点或选择器
         * @returns {Sandbox}
         */
        getByEl: function (el) {
            var sandboxRef = $(el).data(SANDBOX_REF_NAME);
            return this.get(sandboxRef);
        }
    });

    return SandboxManager;
});
