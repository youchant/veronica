define([], function () {
    // 全局数据区
    return function (app) {
        var _ = app.core._;

        var data = { _data: {} };

        data.get = function (name) {
            return data._data[name];
        };
        data.set = function (name, value) {
            data._data[name] = value;
            app.sandbox.emit('change.' + name, value);
        };

        app.data = data;
    };
});
