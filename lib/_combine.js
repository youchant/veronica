
define([
    './provider',
    './emitQueue',
    './data',
    './page',
    './layout',
    './module',
    './sandboxes',
    './parser',
    './router',
    './request',
    './qs',
    './i18n',
    './attrProvider',
    './templateEngine',
    './viewEngine',
    './view',
    './widget',
    './uiKit'
], function () {
    var args = Array.prototype.slice.call(arguments);
    return function (app) {
        app.use(args);
    }
});
