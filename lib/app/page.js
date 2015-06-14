
define([], function () {

    return function (app) {
        var core = app.core;
        var $ = app.core.$;
        var _ = app.core._;
        var appConfig = app.config;

        /**
         * 页面配置项预处理
         */
        function preprocessPageConfig(pageConfig) {
            if (pageConfig.widgets && pageConfig.widgets.length !== 0) {
                _.each(pageConfig.widgets, function (widget, j) {
                    // 将带字符串widget配置转换成配置对象
                    if (_.isString(widget)) {
                        var sep = widget.split('@');
                        pageConfig.widgets[j] = {
                            name: sep[0],
                            options: {
                                host: sep[1] || appConfig.page.defaultHost,
                                _source: sep[2] || appConfig.page.defaultSource
                            }
                        };
                    }
                });
            }
            return pageConfig;
        }

        /**
         * 页面相关
         * @namespace
         * @memberOf Application#
         */
        var page = {
            _pages: {
                // 页面的基类
                '_common': {
                    widgets: []
                },
                currPageName: ''
            },
            _changeTitle: function () { },
            _processInherit: function (pageConfig) {
                var me = this;
                var parentsWidgets = _(pageConfig.inherit).map(function (parentName) {
                    return me.get(parentName).widgets;
                });
                parentsWidgets.unshift(pageConfig.widgets);
                return _.uniq(_.union.apply(_, parentsWidgets), false, function (item) {
                    if (item.options && item.options.el) return item.options.el;  // 确保一个元素上只有一个插件
                    return item.name + item.options.host;  // 确保一个父元素下，只有一个同样的插件
                });
            },
            isCurrent: function (pageName) {
                return this._pages.currPageName === 'default' || this._pages.currPageName === pageName;
            },
            /**
             * 获取当前页面名称
             */
            getCurrentName: function () {
                return this.get('currPageName');
            },
            /**
             * 加载页面
             * @param {string} name - 页面名称
             * @private
             */
            _load: function (name, config, params) {
                var me = this;
                var widgetsConfig = this._processInherit(config);
                if (params) {  // 如果传入了页面查询字符串参数，则为每一个 widget config 附加配置参数
                    var paramsObj = app.core.util.qsToJSON(params);
                    if (paramsObj) {
                        _.each(widgetsConfig, function (conf) {
                            conf.options = $.extend(conf.options, paramsObj);
                        });
                    }
                }
                var currPageName = this.getCurrentName();
                var currPageConfig;
                var dfd = $.Deferred();
                var proms = core.util.donePromise();

                app.emit('pageLoading', name);

                // 在页面加载之前，进行布局的预加载
                if (currPageName === '' ||
                    (currPageConfig = this.get(currPageName)) && currPageConfig.layout !== config.layout) {

                    proms = app.layout.change(config.layout).done(function () {
                        app.emit('layoutSwitched', config.layout);
                    }).fail(function () {
                        dfd.reject();
                    });
                }

                proms.done(function () {
                    me._pages.currPageName = name;

                    app.sandbox.startWidgets(widgetsConfig, name).done(function () {
                        // 切换页面后进行垃圾回收
                        app.widget.recycle();
                        app.emit('pageLoaded', name);
                        dfd.resolve();
                    });
                });

                return dfd.promise();
            },
            /**
             * 活动
             */
            active: function (name) {
                if (name) {
                    return this.change(name);
                } else {
                    name = this.get('currPageName');
                }
                return name;
            },
            // 获取默认配置
            defaultConfig: function (pageName) {
                var data = app.page.parseName(pageName);
                return {
                    widgets: [
                        data.fullname + '@' + app.config.page.defaultHost + '@' + data.module
                    ]
                };
            },
            parseName: function (pageName) {

                var result;
                var token = pageName.indexOf('/') > -1 ? '/' : '-';
                var arr = pageName.split(token);
                // TODO: 这里
                switch (arr.length) {
                    case 1:
                        result = {
                            module: 'basic',
                            controller: 'Home',
                            action: arr[0]
                        };
                        break;
                    case 2:
                        result = {
                            module: 'basic',
                            controller: arr[0],
                            action: arr[1]
                        };
                        break;
                    case 3:
                        result = {
                            module: arr[0],
                            controller: arr[1],
                            action: arr[2]
                        };
                        break;
                }

                result.fullname = result.module + '-' + result.controller + '-' + result.action;
                return result;
            },
            // 获取页面配置
            get: function (name) {
                var config = this._pages[name];
                return config;
            },
            /**
             * 添加页面配置组
             * @param {object|array} configs - 页面配置组（当为单个配置时，可以不用数组）
             */
            add: function (configs) {
                var me = this;
                if (!_.isArray(configs)) {
                    configs = [configs];
                }
                _.each(configs, function (config) {
                    _(config).each(function (item, pageName) {
                        item = preprocessPageConfig(item);

                        config[pageName] = $.extend({
                            name: '',
                            layout: appConfig.page.defaultLayout,
                            widgets: [{
                                name: pageName,
                                options: {
                                    _host: appConfig.page.defaultHost,
                                    _source: appConfig.page.defaultSource
                                }
                            }],
                            inherit: [appConfig.page.defaultInherit]
                        }, item);
                    });

                    $.extend(me._pages, config);
                });

                return this;
            },
            /**
             * 启动页面
             * @param {boolean} [initLayout=false] - 是否初始化布局
             */
            start: function (initLayout) {
                if (initLayout) {
                    app.layout.init();
                }
                app.startRouter();
                app.emit('appStarted');
            },
            /**
             * 改变页面
             * @param {string} name - 页面名称
             */
            change: function (name, params) {
                var page = this;
                var config = page.get(name);
                var proms = core.util.donePromise(config);

                // 自动生成页面配置
                if (!config && app.config.autoBuildPage) {
                    var obj = {};
                    obj[name] = page.defaultConfig(name);
                    page.add(obj);
                    config = page.get(name);
                }

                // 未找到页面配置，则从该路径后台读取页面配置
                if (!config) {

                    var pageUrl = name.replace('-', '/');
                    proms = $.getJSON(pageUrl);
                }

                proms.done(function (config) {
                    page._load(name, config, params);
                }).fail(function () {
                    app.emit('pageNotFound', name);
                });
            }
        }

        app.page = page;

    };
});
