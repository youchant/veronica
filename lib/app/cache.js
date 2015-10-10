define([
], function () {
    return function (app) {

        // 客户端缓存
        app.cache = {
            enabled: false,
            _cache: {},
            config: {}
        };

        app.cache.config = function (options) {
            $.each(options, function (value, key) {
                app.cache.config[key] = value;
            });
            app.cache.config = options;
        };

        app.cache.load = function (key) {
            var url = app.cache.config[key];
            var store = app.cache._cache;
            return $.get(url).done(function (resp) {
                store[key] = resp;
            });
        }

        app.cache.access = function (key) {
            return app.cache._cache[key];
        }

        app.cache.get = function (key) {

            var deferred = $.Deferred();

            if (app.cache.enabled === false || app.cache._cache[key] == null) {
                app.cache.load(key).done(function (resp) {
                    deferred.resolve(resp);
                }).fail(function () {
                    deferred.reject();
                });
            } else {
                var data = app.cache._cache[key];
                deferred.resolve(data);
            }

            return deferred.promise();
        }
    };
});
