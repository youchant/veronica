define([], function () {
    return function (app) {
        var extend = app.core._.extend;
        var _ = app.core._;

        app.createProvider('attrProvider');

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
                        return _.qs(1).get(opt.sourceKey);
                    }
                }
                // 监听查询字符串改变
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
