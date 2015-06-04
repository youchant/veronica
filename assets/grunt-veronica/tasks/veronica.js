/*
* grunt-veronica
* https://github.com/gochant/grunt-veronica
*
* Copyright (c) 2014 channing
* Licensed under the MIT license.
*/

'use strict';

module.exports = function (grunt) {

    grunt.registerMultiTask('veronica', 'build veronica project', function () {

        var options = this.options({
            appDir: '',  // 应用程序根路径
            baseUrl: '',  // 应用程序基路径，即主文件：main.js 所在的相对路径
            dir: '',  // 打包后的应用程序根路径
            entry: 'main',
            reqConfig: '',
            modules: [{
                name: '__default__',
                source: '.',
                hasEntry: false,
                build: '{{ dir }}/{{ baseUrl }}/{{ type }}'
            }],  // TODO: 这里要与 veronica 默认相同，不太友好
            optimize: { paths: [] }, // uglify
            solution: '',
            merge: [],
            notMerge: [],
            moduleMerge: [],
            clean: [],
            buildPaths: {},
            cssPack: "all", // all, module, none
            otherIsEmptyPath: false,
            removeCombined: true,
            cssTarget: this.data.options.dir + '/styles'
        });

        var _ = require('underscore');
        var path = require('path');
        var reqConf = options.reqConfig;
        var defaultSubPaths = ['widgets', 'plugins'];

        var helper = require('../lib/helper.js')(options);



        // 解决方案文件路径
        var solutionPath = helper.getSolutionPath();
        var baseInclude = solutionPath === '' ? [] : [solutionPath];
        var allModules = _.map(options.modules, function (mod) {
            if (_.isString(mod)) {
                mod = {
                    name: mod,
                    source: './modules'
                };
            }
            return mod;
        });
        // 将每个 module 的主文件包含在站点主文件中
        var moduleInclude = _.compact(_.map(allModules, function (mod) {
            if (mod.name === '.' || mod.hasEntry === false) return false;
            return mod.source + '/' + mod.name + '/main';
        }));
        // 站点的 path 配置
        var sitePaths = {};
        _.each(reqConf.paths, function (path, pathName) {
            if (_.contains(options.notMerge, pathName)) {
                sitePaths[pathName] = 'empty:';
            } else {
                sitePaths[pathName] = path;
            }
        });
        _.each(reqConf.packages, function (pkg, i) {
            if (_.contains(options.notMerge, pkg.name)) {
                reqConf.packages[i] = false;
                sitePaths[pkg.name] = 'empty:';
            }
        });
        reqConf.packages = _.compact(reqConf.packages);

        var defaultSiteOptions = {
            appDir: options.appDir,
            baseUrl: options.baseUrl,
            dir: options.dir,
            modules: [{
                name: options.entry,
                include: baseInclude.concat(options.merge).concat(moduleInclude)
            }],
            paths: sitePaths,
            shim: reqConf.shim || {},
            packages: reqConf.packages || [],
            optimize: "none",
            onBuildRead: function (moduleName, path, contents) {
                if (moduleName.indexOf('require-conf') > -1) {
                    return contents.replace(/debug\s*\:\s*(true|false)/g, 'debug: false, optimized: true');
                }
                if (solutionPath !== '' && moduleName === 'main') {
                    return 'window.verSolution="' + solutionPath + '";\n' + contents;
                }
                return contents;
            },
            preserveLicenseComments: false,
            removeCombined: options.removeCombined,
            fileExclusionRegExp: /^\./
        };

        var defaultWidgetOptions = {
            shim: reqConf.shim || {},
            optimize: "none",
            // optimizeCss: "none",
            removeCombined: true,  // 永远移除合并项
            preserveLicenseComments: false,
            fileExclusionRegExp: /^\./,
            separateCSS: true,
            onBuildWrite: function (moduleName, path, contents) {
                // Bugfixed：当在未知的情况下，有可能会出现识别不了部件的情况
                var packageName = moduleName.substring(0, moduleName.indexOf('/main'));
                if (packageName.length > 0) {
                    return contents + "\ndefine('" + packageName + "', ['" + moduleName + "'], function (main) { return main; });";
                }
                return contents;
            }
        };

        grunt.initConfig({
            // 任务配置
            requirejs: {
                // 单个网站
                site: {
                    options: defaultSiteOptions
                },
                widget: {
                    options: defaultWidgetOptions
                }
            },
            concat: {
                options: {
                    separator: '\n'
                }
            },
            copy: { main: {} },
            clean: {
                // TODO: 这里写死了一些路径，需考虑一种更优雅的方式
                main: [
                   options.dir + '/**/*.less',
                   options.dir + '/**/build.txt',
                   options.dir + '/**/widgets/**/styles'
                ],
                output: [options.dir],
                others: options.clean,
                widgets: [options.dir + '/**/__temp__']
            },
            css_combo: {
                main: {
                    files: {
                        'public/styles/index.css': ['public/styles/index.css']
                    }
                }
            },
            cssmin: {
                main: {
                    files: [{
                        expand: true,
                        cwd: options.dir,
                        src: ['**/*.css'].concat(options.optimize.paths),
                        filter: 'isFile',
                        dest: options.dir
                    }]
                }
            },
            uglify: {
                main: {
                    files: [{
                        expand: true,
                        cwd: options.dir,
                        src: ['**/*.js'].concat(options.optimize.paths),
                        filter: 'isFile',
                        dest: options.dir
                    }]
                }
            }
        });

        grunt.loadNpmTasks('grunt-contrib-requirejs');
        grunt.loadNpmTasks('grunt-contrib-concat');
        grunt.loadNpmTasks('grunt-contrib-copy');
        grunt.loadNpmTasks('grunt-contrib-clean');
        grunt.loadNpmTasks('grunt-css-combo');
        grunt.loadNpmTasks('grunt-contrib-uglify');
        grunt.loadNpmTasks('grunt-contrib-cssmin');

        grunt.registerTask('site', ['requirejs:site']);

        grunt.registerTask('widgets', function () {
            var mbConfig = helper.getModuleBuildConfig(allModules);

            var moduleReqConfig = helper.getModulesReqConfig(mbConfig);

            // 分别为每个部件源进行打包
            _.each(mbConfig, function (source, i) {

                if (moduleReqConfig[i].modules === false) return;

                var reqOptions = _.extend({}, grunt.config('requirejs.widget.options'), moduleReqConfig[i]);

                // requirejs
                grunt.config('requirejs.widget' + i, { options: reqOptions });

                grunt.config('clean.widget' + i, {
                    src: [
                        source.target + '/**/templates/',
                        source.target + '/**/build.txt',
                        source.target + '/**/css.js',
                        source.target + '/**/css-builder.js',
                        source.target + '/**/normalize.js',
                        source.target + '/**/text.js',
                        source.target + '/**/main.css'
                    ]
                });

                grunt.config('copy.widget' + i, {
                    expand: true,
                    cwd: source.target + '/',
                    src: '**',
                    dest: source.copy
                    // flatten: true,
                    // filter: 'isFile'
                })

                // 压缩该目录下所有插件
                grunt.task.run('requirejs:widget' + i);
                // 清理
                grunt.task.run('clean:widget' + i);
                // 拷贝部件
                grunt.task.run('copy:widget' + i);

            });

            grunt.task.run('clean:widgets');
        });

        grunt.registerTask('css-cmb', function () {
            var allStyleStream = '';
            var cssComboOptions = { files: {} };
            var cssTarget = options.cssTarget;
            var widgetStyles = [];
            var fs = require('fs');

            _.each(defaultSubPaths, function (p) {
                var src = path.join(options.dir, options.baseUrl, p);

                var thisStyles = grunt.file.expand([src + '/**/*.css', '!' + src + '/**/*.min.css']);
                widgetStyles.push(thisStyles);
            });

            _.each(widgetStyles, function (styles, idx) {
                var stream = '';
                _.each(styles, function (style) {
                    stream += '@import "' + helper.getRelativePath('./', style, cssTarget) + '";\n';
                });

                if (options.cssPack === "module") {  // 为每一个 modules 分别建立 css 文件
                    grunt.file.write(options.cssTarget + '/modules/module' + idx + '.css', stream);
                } else {
                    allStyleStream += stream;
                }
            });

            if (allStyleStream !== '') {

                // 生成 CSS 合并后文件
                grunt.file.write(options.cssTarget + '/modules.css', allStyleStream);

                if (options.cssPack === 'all') {
                    cssComboOptions.files[cssTarget + '/modules.css'] = [cssTarget + '/modules.css'];
                }
                if (options.cssPack === 'module') {
                    cssComboOptions.files[cssTarget + '/modules.css'] = _.map(fs.readdirSync(cssTarget + '/modules'),
                        function (fileName) {
                            return cssTarget + '/modules/' + fileName;
                        });
                }
            }

            grunt.config('css_combo.all', cssComboOptions);
        });

        grunt.registerTask('default', function () {
            grunt.task.run('clean:output');
            grunt.task.run('site');
            grunt.task.run('widgets');
            grunt.task.run('css-cmb');
            grunt.task.run('css_combo:all');
            grunt.task.run('clean:main');
            grunt.task.run('clean:others');
            if (options.optimize) {
                grunt.task.run('uglify');
                grunt.task.run('cssmin');
            }

        });

        grunt.registerTask('publish', function () {
            var widgetStyles = [];
            _.each(defaultSubPaths, function (p) {
                var src = path.join(options.dir, options.baseUrl, p);
                var thisStyles = grunt.file.expand([src + '/**/*.css', '!' + src + '/**/*.min.css']);
                widgetStyles.push(thisStyles);
            });
        });

        grunt.task.run('default');
    });

};
