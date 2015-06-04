define(function () {
    require(['require-conf'], function (config) {
        // 设置 require.config
        require.config(config('../../../bower_components'));

        require(['veronica'], function (veronica) {
            // 创建 app
            var app = veronica.createApp({
                global: true,
                plugins: {
                    'hello': ['pl-hello']
                }
            });

            // 创建 widget: hello-veronica
            app.widget.register('hello-veronica', {});

            app.launch().done(function () {
                // 解析界面
                app.parser.parse();
            });
        });

    });

});