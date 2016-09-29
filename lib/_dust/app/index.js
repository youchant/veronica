define([
    '../core/index',
    './_combine'
], function (coreLib, combine) {

    return function (app) {
        var config = app.config;
        app.core = coreLib;

        app.logger = new coreLib.Logger();
        if (config.debug) {
            app.logger.enable();
        }

        /**
         * 事件发送者
         * @external EventEmitter
         * @see {@link https://github.com/asyncly/EventEmitter2}
         */
        app.createComponent('mediator', coreLib.EventEmitter);
        app.createComponent('componentDef', coreLib.ComponentDefManager);
        app.createComponent('component', coreLib.ComponentManager);
        app.createComponent('layout', coreLib.LayoutManager);
        app.createComponent('page', coreLib.PageManager);

        app.use(combine);


    };
});
