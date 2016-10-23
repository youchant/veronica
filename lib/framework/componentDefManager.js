define([
    '../base/index',
    './appProvider'
], function (baseLib, AppProvider) {

    var _ = baseLib._;
    var $ = baseLib.$;

    /**
     * 组件定义管理器
     * @class
     * @augments veronica.AppProvider
     * @param {ComponentDefManagerOptions} options
     * @memberOf veronica
     */
    var ComponentDefManager = AppProvider.extend(/** @lends veronica.ComponentDefManager# */{
        /**
         * @typedef ComponentDefManagerOptions
         * @property {string} [defaultContext=null] - 组件的默认上下文
         * @property {boolean} [autoParseContext=false] - 自动从组件定义名称解析上下文
         */
        options: {
            defaultContext: null,
            autoParseContext: false
        },
        //TODO: 该方法要重写
        _getLoadPackage: function (name, context) {
            var me = this;
            var app = this.app();
            var isDebug = app.part('env').isDebug();
            var location = app.options.releaseComponentPath + '/' + name;  // release component

            if (isDebug) {
                var mod = app.part('module').get(context);
                location = mod.resolveLocation(name);
            }

            location = _.normalizePath(location);

            return {
                name: name,
                location: location,
                main: 'main'
            };
        },
        _parseContext: function (name) {
            if (this.options.autoParseContext) {
                return name.split('-')[0];
            }
            return null;
        },
        _parseName: function (input) {
            var me = this;
            var pattern = /([\w|-]+)@?([\w|-]*)/;
            var nameFragmentArr = pattern.exec(input);
            var name = nameFragmentArr[1];
            var context = nameFragmentArr[2] || me._parseContext(name) || me.options.defaultContext;
            return {
                name: name,
                context: context
            };
        },
        /**
         * 获取（解决）组件定义
         * @param {string|Object} name - 组件定义或名称表达式
         * @param {Object} [options] - 组件调用时参数
         * @returns {Promise.<definition, options>}
         */
        resolve: function (name, options) {
            var me = this;
            var dfd = $.Deferred();
            var def;

            if (_.isString(name)) {
                var data = me._parseName(name);
                if (options) {
                    options._xtypeName = data.name;
                    options._xtypeContext = data.context;
                }

                if (me.has(data.name)) {
                    def = me.get(data.name);
                    dfd.resolve(def, options);
                } else {
                    var loader = this.loader();

                    loader.require([data.name], true, {
                        packages: [me._getLoadPackage(data.name, data.context)]
                    }).done(function (name, defs) {
                        var def = defs;
                        //TODO: 这里检测下
                        if (_.isArray(def)) {
                            def = defs[0];
                        }
                        dfd.resolve(def, options);

                    }).fail(function (err) {
                        if (err.requireType === 'timeout') {
                            console && console.warn && console.warn('Could not load module ' + err.requireModules);
                        } else {
                            var failedId = err.requireModules && err.requireModules[0];
                            require.undef(failedId);
                            console && console.error && console.error(err);
                        }
                        dfd.reject();
                    });
                }
            } else {
                dfd.resolve(name, options);
            }

            return dfd.promise();

        }
    });

    return ComponentDefManager;
});
