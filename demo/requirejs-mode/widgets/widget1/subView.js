define([
    'ver!widget2'
], function (widget2) {
    return {
        name: 'hehe',
        template: 'Im subView from hello widget <button data-action="open">Open</button>',
        defaults: {
            autoAction: true
        },
        openHandler: function () {
            this.viewWindow("hh", widget2);
        }
    }
});
