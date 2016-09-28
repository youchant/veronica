define([
    '../base/index'
], function (baseLib) {
    var _ = baseLib._;
    var $ = baseLib.$;
    var ClassBase = baseLib.ClassBase;
    var AppPart = ClassBase.extend({
        initialize: function (options) {
            options || (options = {});
            this.supr(options);
            this.options = $.extend(true, this.options, options);
            this._app = options.app || baseLib;
        },
        app: function () {
            return this._app || this;
        },
        logger: function () {
            return this.app().logger;
        },
        appConfig: function (name) {
            return this.app().config;
        },
        loader: function () {
            return this.app().loader.get();
        }
    });

    return AppPart;
});
