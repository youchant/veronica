
'use strict';

module.exports = function (grunt) {

    var reqConf = require('./app/require-conf.js')('../../../bower_components');

    grunt.initConfig({
        veronica: {
            defaults: {
                options: {
                    appDir: './app',
                    baseUrl: '.',
                    dir: './app-release',
                    reqConfig: reqConf,
                    clean: [
                      './app-release/modules',
                      './app-release/test'
                    ],
                    merge: ['veronica'],
                    notMerge: ['jquery'],
                    optimize: true,
                    removeCombined: false
                }
            }
        }

    });

    grunt.loadNpmTasks('grunt-veronica');
    grunt.registerTask('default', ['veronica']);

};
