define([], function () {
    return function (app) {
        var _ = app.core._;
        var extend = app.core._.extend;
        var logger = app.core.logger;
        var util = app.core.util;
        var classBase = app.core.classBase;

        app.providerBase = extend({}, classBase, {
            _pool: {},
            _defaultKey: 'default',
            _nested: false,
            _preprocess: function (data) {
                return data;
            },
            setDefault: function (key) {
                this._defaultKey = key;
            },
            get: function (name) {
                name || (name = this._defaultKey);
                var r = this._nested ? _.get(this._pool, name) :
                    this._pool[name];
                return r;
            },
            attach: function (obj) {
                this._pool = extend({}, this._pool, obj);
            },
            add: function add(name, provider, options) {
                var me = this;
                // 按照 key-value 获取
                if (_.isObject(name)) {
                    options = provider;
                    _.each(name, function (provider, key) {
                        add.call(me, key, provider, options);
                    });
                } else {
                    options = extend({
                        force: false,
                        inherit: 'default'
                    }, options);
                    var exists = this.get(name);
                    if (!exists || options.force === true) {
                        var parent = this.get(options.inherit);
                        if (!_.isFunction(provider)) {
                            provider = extend({}, parent, provider);
                        }
                        provider.__id = name;
                        provider = me._preprocess(provider);

                        this._pool[name] = provider;
                    }
                }

            },
            remove: function (name) {
                this._pool[name] = null;
                delete this._pool[name];
            }
        });

        app.provider = {
            create: function (obj) {
                var r = extend({}, app.providerBase, obj);
                // instance properties
                r._pool = {};
                return r;
            }
        }

    };
});
