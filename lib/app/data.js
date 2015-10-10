define([], function () {
    return function (app) {

        /**
         * 无法直接构造
         * @class veronica.Data
         * @classdesc 全局数据缓存
         * @memberOf veronica
         */

        /** @lends veronica.Data# */
        var Data = {
            _data: {},
            /**
             * 获取数据
             * @param {string} name - 数据名称
             * @return {Object}
             */
            get: function (name) {
                return data._data[name];
            },
            /**
             * 设置数据
             * @param {string} name - 名称
             * @param {*} value - 值
             */
            set: function (name, value) {
                data._data[name] = value;
                /**
                 * **消息：** 数据改变时发布，消息名 'change.' + 数据名
                 *
                 * @event Application#data.change
                 * @type {object}
                 * @property {*} value - 数据值
                 */
                app.sandbox.emit('change.' + name, value);
            }
        };
        
        /**
         * @memberOf veronica.Application#
         * @type {veronica.Data}
         */
        app.data = Data;
    };
});
