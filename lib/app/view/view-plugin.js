define(function () {

    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;
        var noop = $.noop;

        /**
         * 替换模板文件
         * @function
         */
        app.view.base.replaceTpl = function (origin, content, isDom) {
            if (isDom) {
                this.template = $('<div>' + this.template + '</div>').find(origin).replaceWith(content).end().html();
            } else {
                this.template = this.template.replace(origin, content);
            }
        };


        // 加载插件
        app.view.base._loadPlugin = function () {
            var sandbox = this.options.sandbox;
            var app = sandbox.app;

            if (this.options.plugin) {
                this.options.plugin.call(this);
            }
            app.plugin && app.plugin.execute(sandbox.name, this);
        };
    };
});
