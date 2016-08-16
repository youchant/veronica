define([], function () {
    return function (app) {
        var extend = app.core._.extend;
        var logger = app.core.logger;

        app.providerBase = {
            _pool: {},
            _defaultKey: '',
            setDefault: function (key) {
                this._defaultKey = key;
            },
            get: function (name) {
                name || (name = this._defaultKey);
                var r = this._pool[name];
                if (r == null) {
                    logger.error('provider is not found');
                }
                return r;
            },
            add: function (name, provider, force) {
                if (force == null) { force = false }
                var exists = this.get(name);
                if (!exists || force === true) {
                    provider.__id = name;
                    this._pool[name] = provider;
                }
            }
        }

        app.provider = {
            create: function () {
                return extend({}, app.providerBase);
            }
        }

        // 默认的 provider

        app.windowProvider = app.provider.create();
        app.i18nProvider = app.provider.create();
    };
});
