define([
    './meta',
    './lifecycle',
    './communication',
    './parentChild',
    './render',
    './mvvm',
    './dom'
], function () {
    var args = Array.prototype.slice.call(arguments);
    return function (base) {
        args.forEach(function(arg){
            arg(base);
        });
    };
});
