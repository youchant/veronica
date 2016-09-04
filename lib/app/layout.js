define([

], function () {
    return function (app) {

        var SCAFFOLD_LAYOUT_NAME = 'scaffold';

        app.layout.add(SCAFFOLD_LAYOUT_NAME, {
            html: '<div class="' + app.config.page.defaultLayoutRoot + '"></div>'
        });
    };
});
