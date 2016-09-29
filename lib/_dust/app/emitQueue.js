define([
], function () {

    'use strict';

    return function (app) {

        // 消息发送队列，插件加载时由于异步，会导致消息监听丢失，因此使用该队列做缓存
        // eg. [['open', 'who'], ['send', 'msg']]
        app.emitQueue = {
            _emitQueue: [],
            empty: function () {
                var emitQueue = this._emitQueue;
                while (emitQueue.length > 0) {
                    (emitQueue.shift())();
                }
            },
            push: function (emit) {
                this._emitQueue.push(emit);
            }
        }
    };

});