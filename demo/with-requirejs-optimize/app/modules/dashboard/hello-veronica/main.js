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
        subscribe: function () {
            this.sub('to parents', function() {
                console.log('I got it');
            });
        },
        //views: function () {
        //    return {
        //        'charts': {
        //            initializer: Charts,
        //            options: {
        //                el: this.$('.sub')
        //            }
        //        }
        //    };
        //},
        openWndHandler: function () {
            this.widgetWindow('charts', null, { options: { modal: false } });
        },
        rebuildHandler: function () {
            this.setOptions({
                hi: 'rebuild'
            });
        },
        pubHandler: function () {
            this.pub('to children', {
                _target: 'children'
            });
        }
    };
});
