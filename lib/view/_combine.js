define([
    './mixin',
    './meta',
    './aspect',
    './lifecycle',
    './listen',
    './window',
    './attr',
    './action',
    './children',
    './render',
    './mvvm'
], function () {
    var args = Array.prototype.slice.call(arguments);
    return function (base, app) {
        var _ = app.core._;

        _.each(args, function (arg) {
            arg(base, app);
        });
    }
});
