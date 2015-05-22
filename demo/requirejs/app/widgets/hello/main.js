define(['require', 'text!./index.html', 'ver!com'], function (require, tpl) {
   // var tpl = require('text!./index.html');
  //  require('ver!com');
    return function (options) {
        var app = options.sandbox.app;
        var View = app.view.define({
            defaults: {
                autoAction: true
            },
            name: 'hello',
            template: tpl
        });
        return new View(options);
    };
});
