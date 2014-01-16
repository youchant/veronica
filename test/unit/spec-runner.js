require.config({
    // urlArgs: 'cb=' + Math.random(),
    paths: {
        'underscore': '../../bower_components/underscore/underscore',
        'jquery': '../../bower_components/jquery/jquery',
        'eventemitter': '../../bower_components/eventemitter2/lib/eventemitter2',
        'text': '../../bower_components/requirejs-text/text',
        'backbone': '../../bower_components/backbone/backbone',

        'jasmine': '../../bower_components/jasmine/lib/jasmine-core/jasmine',
        'jasmine-html': '../../bower_components/jasmine/lib/jasmine-core/jasmine-html',
        'plugins': '../../lib/plugins'
    },
    shim: {
        'underscore': { 'exports': '_' },
        'jquery': { 'exports': 'jquery' },
        'backbone': { deps: ['underscore', 'jquery'], 'exports': 'Backbone' },
        jasmine: { exports: 'jasmine' },
        'jasmine-html': { deps: ['jasmine'], exports: 'jasmine' }
    },
    packages: [{
        name: 'veronica',
        location: '../../lib'
    }],
    sources: {
        'default': 'mock/widgets',
        'other': 'mock/widgets2'
    }
});

require([
    'require',
    'jquery',
    'jasmine-html'
], function (require, $, jasmine) {

    var jasmineEnv = jasmine.getEnv();
    jasmineEnv.updateInterval = 1000;

    var htmlReporter = new jasmine.HtmlReporter();

    jasmineEnv.addReporter(htmlReporter);

    jasmineEnv.specFilter = function (spec) {
        return htmlReporter.specFilter(spec);
    };

    var specs = [];

    specs.push('spec/core-spec');

    $(function () {
        require(specs, function (spec) {
            jasmineEnv.execute();
        });
    });

});