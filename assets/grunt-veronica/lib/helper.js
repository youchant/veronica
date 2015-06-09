/*
* grunt-veronica
* https://github.com/gochant/grunt-veronica
*
* Copyright (c) 2014 channing
* Licensed under the MIT license.
*/

'use strict';

var _ = require('underscore');
var path = require('path');



module.exports = function (options) {

    var appBasePath = path.join(options.appDir, options.baseUrl);
    // 应用程序基路径
    var appTargetBasePath = path.join(options.dir, options.baseUrl);

    var defaultSubPaths = ['widgets', 'plugins'];
    var reqPluginNames = ['ver', 'text', 'css', 'normalize', 'css-builder'];
    var notEmptyPaths = ['', 'main', 'styles', 'views', 'templates'];
    var excludeFileNames = ['.css', '.js', '.DS_Store', 'styles'];

    var DEFAULT_MODULE_NAME = '__default__';

    var helper = {
        // 获取某个部件源目录下的所有部件，并为每个部件生成 RequireJS 的模块配置
        // 参数：（所有源路径）
        _getReqModulesAndPaths: function (modsBuildConfig) {
            var widgetsRefPath = {};
            var modules = _.map(modsBuildConfig, function (config) { // source: { origin, target }
                var fs = require('fs');
                var origin = config.origin;

                if (!config || !fs.existsSync(config.origin)) {
                    return false;
                }

                var subSource = [];  // 不是部件文件夹

                // 找到所有文件夹名称
                var dirs = fs.readdirSync(origin);
                _.each(dirs, function (dir) {
                    // 排除不是部件文件夹的目录
                    if (_.indexOf(fs.readdirSync(origin + '/' + dir), 'main.js') < 0) {
                        subSource.push(dir);
                    }
                });

                var clearedDirs = _.reject(dirs, function (dir) {
                    // 排除特殊的文件（夹）名称和其他源路径名称
                    return _.find(excludeFileNames.concat(subSource), function (tag) {
                        return dir.indexOf(tag) > -1;
                    });
                });
                var result = _.map(clearedDirs, function (dir) {

                    if (options.otherIsEmptyPath) {
                        widgetsRefPath[dir] = 'empty:';

                        _.each(notEmptyPaths, function (name) {
                            var m = dir + '/' + name;
                            widgetsRefPath[m] = m;
                        });
                    }

                    return {
                        name: dir + '/main',
                        // name: getRelativePath('./', source.origin, basePath) + '/' + dir + '/main',
                        exclude: reqPluginNames
                    };
                });

                return result;
            });
            return {
                modules: modules,  // 部件的 modules 配置
                paths: widgetsRefPath  // 部件的 path 配置
            }
        },

        _createModuleBuildConfig: function (module, subpath, type) {
            var name = module.name === DEFAULT_MODULE_NAME ? '' : module.name;

            var finalCopyPath = module.build ? (_.template(module.build, {
                interpolate: /\{\{(.+?)\}\}/g
            }))({
                dir: options.dir + '/',
                baseUrl: options.baseUrl + '/',
                type: type
            }) : path.join(options.dir, options.baseUrl, type);

            var result = {
                // 原始路径
                origin: path.join(options.appDir, options.baseUrl, module.source, name, subpath),
                // 打包过程中的目标路径
                target: path.join(options.dir, options.baseUrl, subpath + '/__temp__', name),
                // 最终放置的路径
                copy: path.join(finalCopyPath),
                // 类型
                type: type
            };

            return result;
        },
        // 根据模块生成所有的源配置
        getModuleBuildConfig: function (modules) {
            var sources = [];

            _.each(modules, function (module) {
                var subpaths = defaultSubPaths;
                if (module.subpaths) {
                    subpaths = _.uniq(subpaths.concat(module.subpaths));
                }
                _.each(subpaths, function (subpath) {
                    var type = _.find(defaultSubPaths, function (p) {
                        return subpath.indexOf(p) >= 0;
                    });

                    sources.push(helper._createModuleBuildConfig(module, subpath, type));
                });
            });

            return sources;
        },
        // 获取相对于某个基路径的真实路径
        getRelativePath: function (originBasePath, originPath, currBasePath) {
            // 实际路径
            var truePath = path.join(originBasePath, originPath);
            var dep = 10;  // 设定最多向上查找10次

            // 如果基路径不在应用程序路径中，则附加应用程序路径
            if (path.join(originBasePath) !== '.\\' && path.join(currBasePath, originPath).indexOf(path.join(originBasePath) + '\\') < 0) {
                originPath = path.join(appBasePath, originPath);
            }
            while (truePath !== path.join(currBasePath, originPath) && dep !== 0) {
                originPath = path.join('../', originPath);
                dep--;
            }
            return originPath;
        },

        // 为每个 module 生成Req配置
        getModulesReqConfig: function (modsBuildConfig) {

            var reqConf = options.reqConfig;
            var reqModulesAndPaths = helper._getReqModulesAndPaths(modsBuildConfig);
            var widgetModules = reqModulesAndPaths.modules;
            var widgetRefPaths = reqModulesAndPaths.paths;

            return _.map(modsBuildConfig, function (config, index) {

                var widgetPaths = {};
                var emptyPaths = {};
                var widgetPackages = [];
                var modules = widgetModules[index];

                // 解析以下几个文件相对于部件文件夹的正确路径 ['text', 'css', 'normalize', 'css-builder']
                // reqConf.paths

                _.each(options.notMerge, function (name) {
                    emptyPaths[name] = 'empty:';
                })

                _.each(reqConf.paths, function (path, pathName) {
                    if (_.contains(reqPluginNames, pathName)
                        || _.contains(options.moduleMerge, pathName)) {
                        widgetPaths[pathName] = helper.getRelativePath(appBasePath, path, config.origin);
                    } else {
                        emptyPaths[pathName] = 'empty:';
                    }
                });
                _.each(reqConf.packages, function (pkg, i) {
                    var clonePkg = _.clone(pkg);
                    if (!_.contains(options.notMerge, pkg.name)) {
                        clonePkg.location = helper.getRelativePath(appBasePath, clonePkg.location, config.origin);
                        widgetPackages.push(clonePkg);
                    }
                });

                return {
                    baseUrl: config.origin,
                    dir: config.target,
                    paths: _.extend({}, widgetRefPaths, widgetPaths, emptyPaths, options.buildPaths || {}),
                    modules: modules,
                    packages: widgetPackages
                };
            });

        },

        getSolutionPath: function () {
            return options.solution === '' ? '' : helper.getRelativePath('./', options.solution, appTargetBasePath);
        }
    };

    return helper;
}
