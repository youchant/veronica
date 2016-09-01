define([], function () {
    return function (app) {
        
        app.constants || (app.constants = {});

        app.constants.SANDBOX_REF_NAME = '__sandboxRef__';
        app.constants.DEFAULT_MODULE_NAME = '__default__';
        app.constants.SCAFFOLD_LAYOUT_NAME = 'scaffold';
        app.constants.WIDGET_TYPE = 'widget';
        app.constants.WIDGET_CLASS = 'ver-widget';
        app.constants.WIDGET_TAG = 'ver-tag';
    };
});
