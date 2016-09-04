define([
    '../base/index'
],function (baseLib) {

    var ClassBase = baseLib.ClassBase;
    var AppComponent = ClassBase.extend({
        initialize: function (options) {
            options || (options = {});
            this.supr(options);
            this._app = options.app;
            this.options = options;
        },
        app: function () {
            return this._app;
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

    return AppComponent;
});
