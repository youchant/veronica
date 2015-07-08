define([
    'text!./index.html'
], function (tpl) {
    return {
        name: 'charts',
        template: tpl,
        defaults:{
            windowOptions: {
                width: 500,
                height: 300
            }
        }

    };
});
