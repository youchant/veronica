define([
    'text!./index.html',
    './subView',
    'ver!world'
], function (tpl, subView) {

    return {
        name: 'hello',
        defaults: {
            autoAction: true
        },
        template: tpl,
        initAttr: function () {
            this.defineAttr({
                name: 'code',
                origin: 'querystring'
            })
        },
        attrChanged: {
            'code': function (value) {
                alert(value);
            }
        },
        views: {
            'sub': {
                initializer: subView,
                options: {
                    host: '.subView'
                }
            }
        },
        changeHandler: function (e, app) {
            app.qs.set('code', '12312222')
        }
    };
});
