// requirejs
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(function () {
            return factory();
        });
    } else if (typeof exports === 'object') {
        // Node.js
        module.exports = factory();
    } else {
        // Browser globals
        root.RequireConf = factory();
    }
}(this, function () {

    return function (framePath) {
        return {
            debug: false, optimized: true,
            paths: {
                'underscore': framePath + '/underscore/underscore',
                'jquery': framePath + '/jquery/jquery',
                'text': framePath + '/requirejs-text/text',
                'css': framePath + '/require-css/css',
                'normalize': framePath + '/require-css/normalize',
                'css-builder': framePath + '/require-css/css-builder',
                //'art-dialog': framePath + '/art-dialog/src/dialog-plus',
                'veronica': '../../../dist/veronica',
                'ver': framePath + '/../assets/requirejs-ver/ver'
            },
            shim: {
                'underscore': { 'exports': '_' }
            },
            packages: [{ name: 'art-dialog', location: framePath + '/art-dialog/src', main: 'dialog-plus' }]
        };
    }

}));
