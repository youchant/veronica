define([
    '../base/index',
    '../framework/index'
], function (baseLib, frameworkLib) {
    var _ = baseLib._;

    return function (app) {
        app.createPart('mediator', baseLib.EventEmitter);
        app.createPart('logger', baseLib.Logger);
        app.createPart('componentDef', frameworkLib.ComponentDefManager);
        app.createPart('component', frameworkLib.ComponentManager);
        app.createPart('layout', frameworkLib.LayoutManager);
        app.createPart('page', frameworkLib.PageManager);
        app.createPart('router', frameworkLib.AppRouter);
        app.createProvider('componentPart');
        app.createProvider('uiKit');
        app.createProvider('templateEngine');
        app.createProvider('viewEngine');
        app.createProvider('module');
        app.createProvider('i18n');

        app.history = baseLib.history;

        // ComponentPart

        var eventPattern = /^(\S+)\s*(.*)$/;
        app.componentPart.add('ui', {
            create: function(){

            },
            listen: function(view, name, listener){
                var match = eventPattern.exec(name);
                var event = match[1];
                var target = match[2];
                target = view.ui('[data-ref='+ target +']');

                if(target != null){
                    target.bind(event, _.bind(listener, view));
                }
            }
        });

        // UIKit

        app.uiKit.add('default', {
            init: function (view, $dom) {

            },
            create: function (name, options) {

            },
            addParts: function (view) {

            },
            destroy: function () {
            },
            getInstance: function () {
            }
        });

        // ViewEngine

        app.viewEngine.add('default', {
            bind: function (view, $dom, model) {

            },
            unbind: function () {

            },
            create: function (data) {
                return data;
            },
            bindEvents: function (vm, view) {

            },
            get: function () {

            },
            set: function () { }
        });

        // Template Engine

        app.templateEngine.add('default', {
            options: function (view) {
                return {};
            },
            compile: function (text) {
                return function () {
                    return text;
                }
            }
        });

        app.templateEngine.add('underscore', {
            options: function (view) {
                return _.extend({ }, view.options);
            },
            compile: function (text, view) {
                return _.template(text, { variable: 'data' });
            }
        });

        app.templateEngine.add('lodash', {
            options: function(view) {
                return _.extend({ }, view.options);
            },
            compile: function(text, view) {
                return _.template(text, { variable: 'data' });
            }
        });

        // Module

        /**
         * @name module
         * @type {veronica.ModuleManager}
         * @memberOf veronica.Application#
         */
        app.module.add('default', {
            name: 'default',
            path: 'widgets',
            multilevel: false,
            locationPattern: /(\w*)-?(\w*)-?(\w*)-?(\w*)-?(\w*)/,
            resolvePath: function () {
                var path = this.path;
                return path.replace('${name}', this.name);
            },
            resolveLocation: function (name) {
                var me = this;
                var resolvedName = name;
                if (me.multilevel === true) {
                    var parts = me.locationPattern.exec(name);
                    resolvedName = _.reduce(parts, function (memo, name, i) {
                        // 因为第0项是全名称，所以直接跳过
                        if (name === '') { return memo; }
                        if (i === 1) {
                            // 如果第一个与source名称相同，则不要重复返回路径
                            if (name === me.name) { return ''; }
                            return name;
                        }
                        return memo + '/' + name;
                    });
                }

                return me.resolvePath() + '/' + resolvedName;
            }
        });
    };
});
