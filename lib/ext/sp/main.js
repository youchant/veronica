define([
    './ajaxify',
    './formUtil',
    './listUtil',
    './notify'
], function () {
    var args = arguments;
    return function (app) {
        for (var i = 0, len = args.length; i < len; i++) {
            args[i](app);
        }
    };
});