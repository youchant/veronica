define([
    'text!./index.html'
], function (tpl) {
    return {
        template: tpl,
        defaults: {
            hi: 'Hello',
            name: 'Veronica'
        }
    };
});
