define([], function () {
    return function (app) {
        var extend = app.core._.extend;
        var logger = app.core.logger;
        var _ = app.core._;
        

        app.templateEngineProvider = app.provider.create();

        app.templateEngineProvider.add('lodash', {
            options: function(view) {
                return _.extend({ lang: app.lang[view.options.langClass] }, view.options);
            },
            compile: function(text, view) {
                return _.template(text, { variable: 'data' });
            }
        });
    };
});
