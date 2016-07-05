define([
    'text!./index.html'
], function (tpl) {
    return {
        name: 'charts',
        template: tpl,
        defaults: {
            windowOptions: {
                width: 500,
                height: 300
            },
            autoAction: true
        },
        initAttr: function () {
            this.defineAttr({
                name: 'id',
                source: 'querystring'
            });
        },
        subscribe: function () {
            this.sub('to children', function () {
                console.log('I got it');
            });
        },
        attrChanged: {
            'id': function (value) {
                this.$('.text').html(value);
            }
        },
        changeIdHandler: function (e) {
            var currId = this.attr('id');
            this.attr('id', ++currId);
        },
        pubHandler: function () {
            this.pub('to parents', {
                _target: 'parents'
            });
        }
    };
});
