
'use strict';

module.exports = function (grunt) {

    grunt.initConfig({
        veronica: {
            defaults: {
                options: {
                    appDir: './app',
                    baseUrl: './entries',
                    dir: './app-release',
                    reqConfig: require('./app/require-conf.js')('../../../../bower_components'),
                    clean: [
                      './app-release/parts/**/*.css',
                      './app-release/parts/**/*.html',
                      './app-release/widgets',
                      './app-release/**/require-conf.js'
                    ],
                    notMerge: ['jquery'],
                    optimize: false,
                    entryPack: [{
                        name: './main',
                        include: ['../require-conf', 'veronica']
                    }, {
                        name: './main2',
                        include: ['../require-conf', 'veronica']
                    }],
                    jsPack: {
                        paths: [{
                            name: '',
                            origin: '../widgets',
                            target: '../parts'
                        }]
                    },
                    cssPack: {
                        mode: 'all',
                        name: 'module.css',
                        src: ['../parts'],
                        target: './app-release/styles'
                    }
                }
            }
        }

    });

    grunt.loadNpmTasks('grunt-veronica');
    grunt.registerTask('default', ['veronica']);

};
