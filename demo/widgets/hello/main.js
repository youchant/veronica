define([
    'text!./templates/index.html',
    'css!./styles/index.css'
], function (tpl) {

    return function (options) {
        var _ = options.sandbox._;
        var $ = options.sandbox.$;

        $(options.host).html(_.template(tpl, options));
    };
});