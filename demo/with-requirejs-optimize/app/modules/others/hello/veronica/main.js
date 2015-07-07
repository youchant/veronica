define([
    'text!./index.html',
    'css!./index.css'
], function (tpl) {
    return {
        template: tpl,
        defaults: {
            hi: 'Hello',
            name: 'Veronica'
        }
    };
});
