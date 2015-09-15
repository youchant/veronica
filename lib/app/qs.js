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
            var originSet = qs.set;

            qs.set = function(name, value){
                originSet.call(qs, name, value);
                app.sandbox.emit('qs-changed', qs.toJSON(), name, value);
            };
            return qs;
        };

        var qs = changeMode(1);

        app.qs = qs;
    };
});
