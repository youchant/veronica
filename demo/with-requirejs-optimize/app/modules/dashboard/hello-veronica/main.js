define([
    'text!./index.html',
    'ver!charts',
    'css!./index.css'
], function (tpl, CC) {
    return {
        template: tpl,
        defaults: {
            hi: 'Hello',
            name: 'Veronica',
            autoAction: true
        },
        openWndHandler: function () {
            this.widgetWindow('charts');
        }
    };
});
