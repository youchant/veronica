var tests = [];
for (var file in window.__karma__.files) {
    if (/spec\.js$/.test(file)) {
        tests.push(file);
    }
}

requirejs.config({
    // Karma serves files from '/base'
    baseUrl: '/base/test',
    paths: {
        'underscore': '../bower_components/underscore/underscore',
        'jquery': '../bower_components/jquery/jquery',
        'eventemitter': '../bower_components/eventemitter2/lib/eventemitter2',
        'text': '../bower_components/requirejs-text/text',
        'chai': '../node_modules/chai/chai',
        'plugins': '../../lib/plugins'
    },
    shim: {
        'underscore': { 'exports': '_' },
        'jquery': { 'exports': 'jquery' }
    },
    packages: [{
        name: 'veronica',
        location: '../lib'
    }],

    // ask Require.js to load these files (all our tests)
    deps: tests,

    // start test run, once Require.js is done
    callback: window.__karma__.start
});
