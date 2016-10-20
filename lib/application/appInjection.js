define([
    '../base/index',
    '../framework/index'
], function (baseLib, frameworkLib) {
    var _ = baseLib._;

    return function (app) {
        app.create('part:mediator', {ctor: baseLib.ClassBase});
        app.create('part:logger', {ctor: baseLib.Logger});
        app.create('part:componentDef', {ctor: frameworkLib.ComponentDefManager});
        app.create('part:component', {ctor: frameworkLib.ComponentManager});
        app.create('part:layout', {ctor: frameworkLib.LayoutManager});
        app.create('part:page', {ctor: frameworkLib.PageManager});
        app.create('part:router', {ctor: frameworkLib.AppRouter});
        app.create('provider:partType');
        app.create('provider:uiKit');
        app.create('provider:templateEngine');
        app.create('provider:viewEngine');
        app.create('provider:module');
        app.create('provider:i18n');
        app.create('provider:loader');

        app._addPart('history', baseLib.history);

        // ComponentPart

        var eventPattern = /^(\S+)\s*(.*)$/;
        app.part('partType').add('ui', {
            create: function () {

            },
            listen: function (view, name, listener) {
                var match = eventPattern.exec(name);
                var event = match[1];
                var target = match[2];
                target = view.ui('[data-ref=' + target + ']');

                if (target != null) {
                    target.bind(event, _.bind(listener, view));
                }
            }
        });

        // UIKit

        app.part('uiKit').add('default', {
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

        app.part('viewEngine').add('default', {
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
            set: function () {
            }
        });

        // Template Engine

        var templateEngine = app.get('part:templateEngine');
        templateEngine.add('default', {
            options: function (view) {
                return {};
            },
            compile: function (text) {
                return function () {
                    return text;
                }
            }
        });

        templateEngine.add('underscore', {
            options: function (view) {
                return _.extend({}, view.options);
            },
            compile: function (text, view) {
                return _.template(text, {variable: 'data'});
            }
        });

        templateEngine.add('lodash', {
            options: function (view) {
                return _.extend({}, view.options);
            },
            compile: function (text, view) {
                return _.template(text, {variable: 'data'});
            }
        });

        // Module

        /**
         * @name module
         * @type {veronica.ModuleManager}
         * @memberOf veronica.Application#
         */
        var mod = app.get('part:module');
        mod.add('default', {
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
                        if (name === '') {
                            return memo;
                        }
                        if (i === 1) {
                            // 如果第一个与source名称相同，则不要重复返回路径
                            if (name === me.name) {
                                return '';
                            }
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
