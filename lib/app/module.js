define([
], function () {

    'use strict';

    return function (app) {
        var _ = app.core._;

        var Mod = (function () {
            function Mod(options) {
                _.extend(this, options);
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

                _.each(this._modules, function (mod) {
                    var src = {};
                    src[mod.name] = mod.config.widgetPath;

                    mod = new Mod(mod);

                    // 将模块路径添加为源
                    mod.addSource(src);

                    mod.execution && mod.execution(mod, app);
                });
            },
            create: function (options, execution) {
                // 将字符类型的模块配置转换成对象
                if (_.isString(options)) {
                    options = {
                        name: options,
                        source: dms
                    };
                }

                _.defaults(options, app.config.module.defaults);

                var source = app.core.getConfig().sources[options.source] || options.source;

                return {
                    name: options.name,
                    config: options,
                    path: options.path || source + '/' + options.name,
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
