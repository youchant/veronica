define([], function () {
    return function (app) {

        /**
         * 全局数据存储
         * @namespace
         * @memberOf Application#
         */
        var data = { _data: {} };

        /**
         * 获取数据
         * @param {string} name - 数据名称
         */
        data.get = function (name) {
            return data._data[name];
        };

        /**
         * 设置数据
         * @param {string} name - 名称
         * @param {*} value - 值
         */
        data.set = function (name, value) {
            data._data[name] = value;
            /**
             * **消息：** 数据改变时发布，消息名 'change.' + 数据名
             *
             * @event Application#data.change
             * @type {object}
             * @property {*} value - 数据值
             */
            app.sandbox.emit('change.' + name, value);
        };

        app.data = data;
    };
});
