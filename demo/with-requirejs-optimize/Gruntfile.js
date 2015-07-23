
'use strict';

module.exports = function (grunt) {


    grunt.initConfig({
        veronica: {
            defaults: {
                options: {
                    appDir: './app',
                    baseUrl: './',
                    dir: './release',
                    reqConfig: require('./app/require-conf.js')('../__local__/bower_components'),
                    clean: [],
                    notMerge: [],
                    optimize: false,
                    entryPack: [{
                        name: './main',
                        include: [
                            './require-conf',
                            'veronica', 'jquery', 'underscore',
                            'text', 'css', 'ver',
                            './modules/dashboard/main',
                            './modules/user-control/main'
                        ]}, {
                        name: './main2',
                        include: ['./require-conf', 'veronica', 'jquery', 'underscore',
                           'text', 'css']
                    }],
                    jsPack: {
                        paths: [
                            'dashboard',
                            'user-control',
                            {
                                name: 'others',
                                origin: './modules/others',
                                target: './widgets',
                                unique: true
                            }
                        ]
                    },
                    cssPack: {},
                    remote: {
                        vendor: [{
                            name: 'bower_components.zip',
                            path: 'http://192.168.1.18:8097/cdn/bower_components/'
                        }],
                        //modules: [{
                        //    name: 'tiny_basic.zip',
                        //    path: 'http://localhost:59529/'
                        //}],
                        copy: {
                            files: [{
                                expand: true,
                                cwd: '__local__/bower_components/',
                                src: [
                                    'jquery/**',
                                    'tinyui/**'
                                ],
                                dest: 'release/vendor'
                            }, {
                                expand: true,
                                cwd: '__local__/modules/tiny_basic/',
                                src: ['**/*'],
                                dest: 'release/widgets'
                            }]
                        }
                    }
                }
            }
        }

    });
    grunt.loadNpmTasks('grunt-veronica');

    grunt.registerTask('default', ['veronica']);

};
