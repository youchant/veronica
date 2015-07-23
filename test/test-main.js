var allTestFiles = [];
var TEST_REGEXP = /(spec|test)\.js$/i;

Object.keys(window.__karma__.files).forEach(function(file) {
  if (TEST_REGEXP.test(file)) {
    // Normalize paths to RequireJS module names.
    allTestFiles.push(file);
  }
});

require.config({
  // Karma serves files under /base, which is the basePath from your config file
  baseUrl: '/base',
  paths: {
      'underscore': './bower_components/underscore/underscore',
      'jquery': './bower_components/jquery/dist/jquery',
      'eventemitter': './bower_components/eventemitter2/lib/eventemitter2',
      'text': './bower_components/requirejs-text/text',
      'css': './bower_components/require-css/css',
      'chai': './node_modules/chai/chai',
      'sinon': './node_modules/sinon/pkg/sinon',
      'veronica': './dist/veronica'
  },
  shim: {
      'underscore': {
          exports: '_'
      }
  },
  // dynamically load all test files
  deps: allTestFiles,

  // we have to kickoff jasmine, as it is asynchronous
  callback: window.__karma__.start
});
