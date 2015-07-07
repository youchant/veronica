
'use strict';

module.exports = function (grunt) {

    grunt.initConfig({
        veronica: {
            defaults: {
                options: {
                    appDir: './app',
                    baseUrl: './',
                    dir: './app-release',
                    reqConfig: require('./app/require-conf.js')('../../bower_components'),
                    clean: [
                      './app-release/widgets/**/*.css',
                      './app-release/widgets/**/*.html',
                      './app-release/modules',
                      './app-release/**/require-conf.js'
                    ],
                    notMerge: [],
                    optimize: false,
                    entryPack: [{
                        name: './main',
                        include: ['./require-conf', 'veronica', 'jquery', 'underscore',
                            'text', 'css', './modules/dashboard/main', './modules/user-control/main']
                    }, {
                        name: './main2',
                        include: ['./require-conf', 'veronica', 'jquery', 'underscore',
                           'text', 'css']
                    }],
                    jsPack: {
                        defaults: {
                            target: './widgets2'
                        },
                        paths: [{
                            name: 'dashboard'
                        }, 'user-control', {
                            name: 'others',
                            origin: './modules/others',
                            target: './widgets',
                            unique: true
                        }]
                    },
                    cssPack: {
                        mode: 'all',
                        name: 'module.css',
                        src: ['./widgets'],
                        target: './app-release/styles'
                    }
                }
            }
        }

    });

    grunt.loadNpmTasks('grunt-veronica');
    grunt.registerTask('default', ['veronica']);

};
