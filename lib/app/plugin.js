define([
], function () {

    'use strict';

    return function (app) {
        var _ = app.core._;

        // 插件
        app.plugin = {
            _plugins: {},
            _pluginCache: {},
            // 解析部件下所有插件请求路径
            resolvePath: function (widgetName) {
                var widgetPlugins = this._plugins[widgetName];
                var globalConfig = app.core.getConfig();
                if (_.isUndefined(widgetPlugins)) {
                    return [];
                }
                return _.map(widgetPlugins, function (plugin) {
                    var path;
                    var name = plugin.name;
                    var prefix = 'pl-' + plugin.module + '-';

                    // 非调试模式下，路径是固定的
                    if (globalConfig.debug === true) {
                        path = app.module.path(plugin.module) + '/plugins/';
                        //var idx = plugin.name.indexOf(prefix);
                        //if (idx > -1) {
                        //    name = plugin.name.substr(idx + prefix.length);
                        //}
                    } else {
                        path = './plugins/';
                    }
                    return {
                        name: plugin.name,
                        location: path + name
                    };
                });
            },
            // 添加插件配置
            add: function (pluginConfigs, moduleName) {
                var allPlugins = this._plugins;
                _.each(pluginConfigs, function (config) {
                    if (_.isString(config)) { config = { name: 'pl-' + moduleName + '-' + config, target: config }; }
                    var pluginName = config.name;
                    var widgetName = config.target;

                    if (_.isUndefined(allPlugins[widgetName])) {
                        allPlugins[widgetName] = [];
                    }

                    allPlugins[widgetName].push({ name: pluginName, module: moduleName });
                });
            },
            cache: function (widgetName, plugins) {
                // 清空缓存
                var cache = this._pluginCache[widgetName] = {};

                _.each(plugins, function (plugin) {
                    var result = plugin(app);
                    _.each(result, function (execution, key) {
                        if (_.isUndefined(cache[key])) {
                            cache[key] = [];
                        }
                        cache[key].push(execution);
                    });
                });
            },
            execute: function (widgetName, viewObj) {
                var name = viewObj._name;
                if (widgetName === name) {
                    name = 'main';
                }
                if (!this._pluginCache[widgetName]) {
                    return;
                }
                var plugins = this._pluginCache[widgetName][name];
                _.each(plugins, function (plugin) {
                    plugin.call(viewObj);
                });
            }
        }

    };

});
