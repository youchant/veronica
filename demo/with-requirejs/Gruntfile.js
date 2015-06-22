
'use strict';

module.exports = function (grunt) {

    var reqConf = require('./app/entries/require-conf.js')('../../../../bower_components');

    grunt.initConfig({
        veronica: {
            defaults: {
                options: {
                    appDir: './app',
                    baseUrl: './entries',
                    dir: './app-release',
                    reqConfig: reqConf,
                    clean: [
                      './app-release/parts/**/*.css',
                      './app-release/parts/**/*.html',
                      './app-release/widgets',
                      './app-release/**/require-conf.js'
                    ],
                    entryPack: [{
                        name: './main',
                        include: ['./require-conf']
                    }, {
                        name: './main2',
                        include: ['./require-conf']
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
                    },
                    merge: ['veronica'],
                    notMerge: ['jquery'],
                    optimize: true
                }
            }
        }

    });

    grunt.loadNpmTasks('grunt-veronica');
    grunt.registerTask('default', ['veronica']);

};
