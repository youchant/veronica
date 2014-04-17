
'use strict';

module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        requirejs: {
            compile: {
                options: {
                    baseUrl: "lib",
                    dir: 'dist',
                    modules: [{ name: 'veronica' }],
                    packages: [{ name: 'veronica', location: '.' }],
                    paths: {
                        'underscore': 'empty:',
                        'jquery': 'empty:',
                        'eventemitter': 'empty:',
                        'text': '../bower_components/requirejs-text/text',
                        'backbone': 'empty:'
                    },
                    optimize: "none",  // uglify
                    removeCombined: true,
                    fileExclusionRegExp: /^\./
                }
            }
        },
        clean: {
            main: [
            'dist/build.txt',
            'dist/veronica.js',
            'dist/text.js'
            ]
        }
    });

    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-clean');

    grunt.registerTask('default', ['requirejs:compile', 'clean:main']);

};