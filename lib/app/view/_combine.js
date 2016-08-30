define([
    './mixin',
    './meta',
    './aspect',
    './lifecycle',
    './mvvm',
    './window',
    './attr',
    './action',
    './children',
    './listen',
    './render'
], function () {
    var args = Array.prototype.slice.call(arguments);
    return function (base, app) {
        var _ = app.core._;

        _.each(args, function (arg) {
            arg(base, app);
        });
    }
});
