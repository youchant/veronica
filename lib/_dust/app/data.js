define([], function () {
    return function (app) {

        app.createProvider('data', {
            /**
             * 设置数据
             * @param {string} name - 名称
             * @param {*} value - 值
             * @param {boolean} emit - 是否发送消息
             */
            set: function (name, value, emit) {
                var app = this.app();
                if (emit == null) {
                    emit = true;
                }
                this._pool[name] = value;
                if (emit) {
                    /**
                     * **消息：** 数据改变时发布，消息名 'change.' + 数据名
                     *
                     * @event Application#data.change
                     * @type {object}
                     * @property {*} value - 数据值
                     */
                    app.pub('change.' + name, value);
                }
            }
        });
    };
});
