define([
    'text!./index.html',
    'ver!charts',
    'css!./index.css'
], function (tpl, Charts) {
    return {
        template: tpl,
        defaults: {
            hi: 'Hello',
            name: 'Veronica',
            autoAction: true
        },
        views: function () {
            return {
                'charts': {
                    initializer: Charts,
                    options: {
                        el: this.$('.sub')
                    }
                }
            };
        },
        openWndHandler: function () {
            this.widgetWindow('charts', null, { options: { modal: true } });
        }
    };
});
