define([
    'text!./index.html',
    './subView',
    'ver!com'
], function (tpl, subView) {

    return {
        name: 'hello',
        defaults: {
            autoAction: true
        },
        template: tpl,
        views: {
            'sub': {
                initializer: subView,
                options: {
                    host: '.subView'
                }
            }
        }
    };
});
