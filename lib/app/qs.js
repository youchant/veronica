define([
], function () {
    return function (app) {

        var $ = app.core.$;

        /**
         * @namespace
         * @memberOf Application#
         */

        var changeMode = function (mode) {
            var qs = app.core.qs(mode);
            return qs;
        };

        var qs = changeMode(1);

        app.qs = qs;
    };
});
