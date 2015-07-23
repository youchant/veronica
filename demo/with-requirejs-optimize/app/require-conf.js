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

    return function (devPath, releasePath) {

        var config = {
            debug: true,
            shim: {
                'underscore': { 'exports': '_' }
            }
        };

        var framePath = config.debug === true ? devPath : releasePath;

        config.paths = {
            'underscore': framePath + '/underscore/underscore',
            'jquery': framePath + '/jquery/dist/jquery',
            'text': framePath + '/requirejs-text/text',
            'css': framePath + '/require-css/css',
            'normalize': framePath + '/require-css/normalize',
            'css-builder': framePath + '/require-css/css-builder',
            'veronica': '../../../dist/veronica',
            'ver': framePath + '/requirejs-ver/ver'
        }

        return config;
    }

}));
