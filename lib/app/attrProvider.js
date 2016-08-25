define([], function () {
    return function (app) {
        var extend = app.core._.extend;
        var logger = app.core.logger;
        var _ = app.core._;


        app.attrProvider = app.provider.create();

        app.attrProvider.add('default', {
            bind: function(view) {
            },
            unbind: function () {

            },
            create: function (data) {
                return data;
            },
            get: function () { },
            set: function () { }
        });

        app.attrProvider.add('querystring', {
            create: function(options, view) {
                if (options.getter == null) {
                    options.getter = function (opt) {
                        return app.qs.get(opt.sourceKey);
                    }
                }
                // ¼àÌý²éÑ¯×Ö·û´®¸Ä±ä
                view.sub('qs-changed', function (obj) {
                    var value = obj[options.sourceKey];
                    var originalValue = view.attr(options.name);
                    if (value !== originalValue) {
                        view.attr(options.name, value);
                    }
                });

                return options;
            }
        });

        app.attrProvider.add('options', {
            create: function (options, view) {
                if (options.getter == null) {
                    options.getter = function (data) {
                        return view.options[data.sourceKey];
                    }
                }

                return options;
            }
        });

        app.attrProvider.add('global', {
            create: function (options, view) {
                if (options.getter == null) {
                    options.getter = function () {
                        return app.data.get(options.sourceKey);
                    }
                }

                view.sub('change.' + options.sourceKey, function (value) {
                    var originalValue = view.attr(options.name);
                    if (value !== originalValue) {
                        view.attr(options.name, value);
                    }
                });

                return options;
            }
        });
    };
});
