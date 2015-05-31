define([
], function () {

    'use strict';

    return function (app) {
        var _ = app.core._;

        var Mod = (function () {
            function Mod(data) {
                _.extend(this, data);
            }

            Mod.prototype = {
                constructor: Mod,
                // 添加源
                addSource: function (sources) {
                    var me = this;
                    _.each(sources, function (src, name) {
                        app.core.getConfig().sources[name] = me.path + '/' + src;
                    });
                },
                // 添加插件
                addPlugin: function (plugin) {
                    app.plugin.add(plugin, this.name);
                },
                // 添加组件
                addControl: function (control) {
                    var cts = app.core.getConfig().controls;

                    cts || (cts = []);
                    if (!_.isArray(control)) {
                        control = [control];
                    }
                    app.core.getConfig().controls = _.uniq(cts.concat(control));
                },
                // 添加页面
                addPage: function (page) {
                    app.addPage(page);
                },
                addExtension: function (extensions) {
                    app.use(extensions);
                },
                addLayout: function (layouts) {
                    app.addLayout(layouts);
                }
            };

            return Mod;
        })();

        // 模块
        app.module = {
            _modules: {}, // { path, execution }
            // 应用模块
            apply: function () {
                var me = this;

                _.each(this._modules, function (module) {
                    var defaultSource = {};
                    defaultSource[module.name] = app.config.module.defaultWidgetPath;

                    module = new Mod(module);

                    // 将模块路径添加为源
                    module.addSource(defaultSource);

                    module.execution && module.execution(module, app);
                });
            },
            create: function (config, execution) {
                var dms = app.config.module.defaultSource;
                var dmm = app.config.module.defaultMultilevel;
                var dmh = app.config.module.defaultHasEntry;

                // 将字符类型的模块配置转换成对象
                if (_.isString(config)) {
                    config = {
                        name: config,
                        source: dms
                    };
                }

                // 设置默认值
                config.multilevel = config.multilevel || dmm;
                config.hasEntry = config.hasEntry == null ? dmh : config.hasEntry;

                var source = app.core.getConfig().sources[config.source] || config.source || dms;
                var path = source + '/' + config.name;

                return {
                    name: config.name,
                    config: config,
                    path: path,
                    execution: execution
                };
            },
            add: function (module) {
                this._modules[module.name] = module;
            },
            get: function (name) {
                return this._modules[name];
            },
            // 获取模块路径
            path: function (moduleName) {
                return this._modules[moduleName].path;
            }
        };
    };

});
