
define([], function () {

    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;
        var appConfig = app.config;

        app.mixin({
            _pages: {
                // 页面的基类
                '_common': {
                    widgets: []
                },
                currPageName: ''
            }
        });

        function preprocessPageConfig(item) {
            if (item.widgets && item.widgets.length !== 0) {
                _.each(item.widgets, function (widget, j) {
                    if (_.isString(widget)) {
                        var sep = widget.split('@');
                        item.widgets[j] = {
                            name: sep[0],
                            options: {
                                host: sep[1] || appConfig.page.defaultHost,
                                _source: sep[2] || appConfig.page.defaultSource
                            }
                        };
                    }
                });
            } else {
                item.widgets.push({
                    name: ''
                });
            }
            return item;
        }

        app.mixin({
            _changeTitle: function () { },
            _inherit: function (pageConfig) {
                var me = this;
                var parentsWidgets = _(pageConfig.inherit).map(function (parentName) {
                    return me.getPage(parentName).widgets;
                });
                parentsWidgets.unshift(pageConfig.widgets);
                return _.uniq(_.union.apply(_, parentsWidgets), false, function (item) {
                    if (item.options && item.options.el) return item.options.el;  // 确保一个元素上只有一个插件
                    return item.name + item.options.host;  // 确保一个父元素下，只有一个同样的插件
                });

            },
            isCurrPage: function (page) {
                return this._pages.currPageName === 'default' || this._pages.currPageName === page;
            },
            getPage: function (name) {
                var config = this._pages[name];
                return config;
            },
            getCurrPage: function () {
                return this.getPage('currPageName');
            },
            addPage: function (configs) {
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

                    $.extend(app._pages, config);
                });

                return this;
            },
            switchPage: function (name, params) {
                this.core.logger.time('pageLoad.' + name);
                var config = this.getPage(name);
                var dfd;
                var widgetsConfig;
                var me = this;

                // 自动生成页面配置
                if (!config && app.config.autoBuildPage) {
                    var obj = {};
                    obj[name] = app.page.defaultConfig(name);
                    app.page.add(obj);
                    config = this.getPage(name);
                }

                // 未找到页面配置
                if (!config) {

                    // 尝试从后台获取页面配置
                    dfd = $.Deferred();
                    var pageUrl = name.replace('-', '/');
                    $.getJSON(pageUrl).done(function (resp) {
                        config = resp;
                        me._loadPage(name, config, params).done(function () {
                            dfd.resolve();
                        }).fail(function () {
                            dfd.reject();
                        });
                    }).fail(function () {
                        me.emit('pageNotFound', name);
                        dfd.reject();
                    });

                    return dfd.promise();
                } else {
                    return this._loadPage(name, config, params);
                }
            },
            _loadPage: function (name, config, params) {
                var me = this;
                var widgetsConfig = this._inherit(config);
                if (params) {  // 如果传入了页面参数
                    var paramsObj = app.core.util.qsToJSON(params);
                    if (paramsObj) {
                        _.each(widgetsConfig, function (conf) {
                            conf.options = $.extend(conf.options, paramsObj);
                        });
                    }
                }
                var currPageName = app.getCurrPage();
                var currPageConfig;
                var dfd = $.Deferred();

                this.emit('pageLoading', name);

                // 在页面加载之前，进行布局的预加载
                if (currPageName === '' ||
                    (currPageConfig = app.getPage(currPageName)) && currPageConfig.layout !== config.layout) {

                    app.switchLayout(config.layout).done(function () {
                        app.emit('layoutSwitched', config.layout);
                        me._pages.currPageName = name;
                        me.sandbox.startWidgets(widgetsConfig, name).done(function () {
                            // 切换页面后进行垃圾回收
                            me.widget.recycle();
                            me.emit('pageLoaded', name);
                            me.core.logger.time('pageLoad.' + name, 'End');
                            dfd.resolve();
                        });

                    }).fail(function () {
                        dfd.reject();
                    });
                } else {
                    this._pages.currPageName = name;
                    return this.sandbox.startWidgets(widgetsConfig, name).done(function () {
                        // 切换页面后进行垃圾回收
                        me.widget.recycle();
                        me.emit('pageLoaded', name);
                        me.core.logger.time('pageLoad.' + name, 'End');
                        dfd.resolve();
                    });
                }
                return dfd.promise();
            },
            startPage: function (initLayout) {
                var me = this;
                me.startRouter();
                if (initLayout) {
                    this.initLayout();
                }
                me.emit('appStarted');
                me.core.logger.time("appStart", 'End');
            }

        }, false);

        // API风格更改
        app.page = {
            active: function (name) {
                if (name) {
                    return app.switchPage(name);
                } else {
                    name = app.getPage('currPageName');
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
                return app.getPage(name);
            },
            isActive: function (name) {
                return app.isCurrPage(name);
            },
            add: function (configs) {
                return app.addPage(configs);
            },
            start: function (preLoad) {
                return app.startPage(preLoad);
            },
            change: function (name) {
                return app.switchPage(name);
            }
        }

    };
});
