
'use strict';

module.exports = function (grunt) {
    var path = require('path');
    var banner = "/*!\n" +
	" * Veronica v<%= pkg.version %>\n" +
	" *\n" +
	" * <%= pkg.homepage %>\n" +
	" *\n" +
	" * Copyright (c) <%= grunt.template.today('yyyy') %> <%= pkg.author.name %>\n" +
	" * Released under the <%= _.pluck(pkg.licenses, 'type').join(', ') %> license\n" +
	" */\n";

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            dist: {
                options: {
                    banner: banner
                },
                files: {
                    'dist/veronica.js': ['dist/veronica.js']
                }
            }
        },
        requirejs: {
            main: {
                options: {
                    "baseUrl": "lib",
                    "paths": {
                        "veronica": "main",
                        'underscore': '../bower_components/underscore/underscore',
                        'jquery': 'empty:',
                        'eventemitter': '../bower_components/eventemitter2/lib/eventemitter2',
                        'art-dialog': '../lib/assets/artDialog/dist/dialog-plus',
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
            options: {
                report: 'gzip',
                sourceMap: true
            },
            main: {
                files: {
                    'dist/veronica.min.js': ['dist/veronica.js']
                }
            }
        },
        jsdoc: {
            dist: {
                src: ['lib/**/*.js', 'README.md', '!lib/assets/**/*'],
                options: {
                    verbose: true,
                    destination: './site/api',
                    configure: 'jsdoc-conf.json',
                    // template: 'node_modules/ink-docstrap/template',
                    template: 'node_modules/jaguarjs-jsdoc-patched',
                    'private': false
                }
            }
        },
        watch: {
            options: {
                livereload: true
            },
            jsdoc: {
                files: ['lib/**/*.js'],
                tasks: ['jsdoc']
            }
        },
        connect: {
            options: {
                hostname: '*'
            },
            jsdoc: {
                options: {
                    port: 8000,
                    middleware: function (connect, options) {
                        return [
                            require('connect-livereload')(),
                            connect.static(path.resolve('./site'))
                        ];
                    }
                }
            }
        },
        mkdocs: {
            dist: {
                src: './docs',
                options: {
                    clean: true
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-jsdoc');
    grunt.loadNpmTasks('grunt-mkdocs');


    grunt.registerTask('default', ['requirejs', 'concat', 'clean', 'uglify']);
    grunt.registerTask('doc', ['mkdocs', 'jsdoc', 'connect', 'watch']);
};
