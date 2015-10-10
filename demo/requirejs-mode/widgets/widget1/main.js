define([
    'text!./index.html',
    './subView',
    'ver!widget2'
], function (tpl, subView) {

    return {
        name: 'view1',
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
