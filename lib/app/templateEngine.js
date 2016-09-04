define([], function () {
    return function (app) {
        var extend = app.core._.extend;
        var _ = app.core._;


        app.createProvider('templateEngine');

        app.templateEngine.add('default', {
            options: function (view) {
                return {};
            },
            compile: function (text) {
                return function () {
                    return text;
                }
            }
        });

        app.templateEngine.add('underscore', {
            options: function (view) {
                return _.extend({ lang: app.lang[view.options.langClass] }, view.options);
            },
            compile: function (text, view) {
                return _.template(text, { variable: 'data' });
            }
        });

        app.templateEngine.add('lodash', {
            options: function(view) {
                return _.extend({ lang: app.lang[view.options.langClass] }, view.options);
            },
            compile: function(text, view) {
                return _.template(text, { variable: 'data' });
            }
        });
    };
});
