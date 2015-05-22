define(function () {
    require(['require-conf'], function (config) {
        // 设置 require.config
        require.config(config('../../../bower_components'));

        require(['veronica'], function (veronica) {
            // 创建 app
            var app = veronica.createApp({
                global: true,
                modules: [{
                    name: '',
                    source: './',
                    hasEntry: false
                }]
            });

            // 创建 widget: hello-veronica
            app.widget.register('hello-veronica', function (options) {
                var app = options.sandbox.app;
                var View = app.view.define();
                return new View(options);
            });

            app.launch().done(function () {
                // 解析界面
                app.parser.parse();
            });
        });

    });

});