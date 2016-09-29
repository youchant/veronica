
define([
    './attrProvider',
    './data',
    './emitQueue',
    './env',
    './i18n',
    './layout',
    './loader',
    './module',
    './page',
    './parser',
    './templateEngine',
    './uiKit',
    './viewEngine',
    './windowProvider'
], function () {
    var args = Array.prototype.slice.call(arguments);
    return function (app) {
        app.use(args);
    }
});
