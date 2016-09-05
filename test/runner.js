/*global define mocha */
var should;

require.config({
    baseUrl: './',
    paths: {
        'lodash': '../bower_components/lodash/dist/lodash',
        'jquery': '../bower_components/jquery/dist/jquery',
        'eventemitter': '../bower_components/eventemitter2/lib/eventemitter2',
        'text': '../bower_components/requirejs-text/text',
        'css': '../bower_components/require-css/css',
        'chai': '../node_modules/chai/chai',
        'sinon': '../node_modules/sinon/pkg/sinon',
        // 'veronica': '../dist/veronica'
    },
    shim: {
        'jquery': { 'exports': 'jquery' },
        'sinon': { 'exports': 'sinon' }
    },
    packages: [{
        name: 'veronica',
        location: '../lib',
        main: 'main'
    }]
});

define(['chai'], function (chai) {
    window.chai = chai;
    window.expect = chai.expect;
    window.assert = chai.assert;
    window.should = chai.should();
    window.notrack = true;

    mocha.setup({
        ui: 'bdd',
        timeout: 2000
    });

    require([
        'specs/index'
    ], function () {
        mocha.run();
    });
});
