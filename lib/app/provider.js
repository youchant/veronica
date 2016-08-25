define([], function () {
    return function (app) {
        var extend = app.core._.extend;
        var logger = app.core.logger;

        app.providerBase = {
            _pool: {},
            _defaultKey: 'default',
            _preprocess: function (data) {
                return data;
            },
            setDefault: function (key) {
                this._defaultKey = key;
            },
            get: function (name) {
                name || (name = this._defaultKey);
                var r = this._pool[name];
                return r;
            },
            add: function add(name, provider, options) {
                var me = this;
                if (_.isObject(name)) {
                    options = provider;
                    _.each(name, function(provider, key) {
                        add.call(me, key, provider, options);
                    });
                } else {
                    options = extend({
                        force: false,
                        inherit: 'default'
                    }, options);
                    var exists = this.get(name);
                    if (!exists || options.force === true) {
                        provider = me._preprocess(provider);
                        var parent = this.get(options.inherit);
                        provider.__id = name;
                        this._pool[name] = extend({}, parent, provider);
                    }
                }

            }
        }

        app.provider = {
            create: function (obj) {
                var r = extend({}, app.providerBase, obj);
                // instance properties
                r._pool = {};
                return r;
            }
        }

        // 默认的 provider

        app.windowProvider = app.provider.create();

        var noop = function() {};

        app.windowProvider.add('default', {
            options: function (options) {
                return options;
            },
            create: function ($el, options, view) {
                var wnd = {
                    element: $el,
                    core: null,
                    config: options,
                    open: noop,
                    close: noop,
                    destroy: noop,
                    center: noop,
                    setOptions: function (options) { },
                    rendered: function (view) { },
                    removeLoading: function () { }
                };
                return wnd;
            }
        });

        app.uiKitProvider = app.provider.create();
    };
});
