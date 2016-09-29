define([
], function () {

    'use strict';

    return function (app) {

        app.page.add('_common', {
            name: '_common',
            inherits: false
        });

        app.page.add('default', {
            name: 'default',
            layout: 'default',
            inherits: ['_common']
        });

    };

});
