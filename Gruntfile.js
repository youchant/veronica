
'use strict';

module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        requirejs: {
            main: {
                options: {
                    "baseUrl": "lib",
                    "paths": {
                        "veronica": "main",
                        'underscore': '../bower_components/underscore/underscore',
                        'jquery': 'empty:',
                        'eventemitter': '../bower_components/eventemitter2/lib/eventemitter2',
                        'art-dialog': '../assets/artDialog/dist/dialog-plus',
                        'text': '../bower_components/requirejs-text/text'
                    },
                    'shim': {
                        'art-dialog': { 'exports': 'dialog', deps: ['jquery'] },
                        'noty': { 'exports': 'noty' }
                    },
                    "include": ["../bower_components/almond/almond", "veronica"],
                    "exclude": ["jquery", "underscore", "text"],
                    "out": "dist/veronica.js",
                    "wrap": {
                        "startFile": "tools/wrap.start",
                        "endFile": "tools/wrap.end"
                    },
                    "optimize": "none"
                }
            }
        },
        clean: {
            main: [
            'dist/build.txt',
            'dist/text.js'
            ]
        },
        uglify: {
            main: {
                files: {
                    'dist/veronica.min.js': ['dist/veronica.js']
                },
                report: 'gzip'
            }
        },
        jsdoc: {
            dist: {
                src: ['lib/**/*.js', 'README.md'],
                options: {
                    verbose: true,
                    destination: './docs',
                    configure: 'jsdoc-conf.json',
                    template: 'assets/jaguarjs-jsdoc',
                    'private': false
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-jsdoc');

    grunt.registerTask('default', ['requirejs', 'clean', 'uglify']);
    grunt.registerTask('doc', ['jsdoc']);
};
