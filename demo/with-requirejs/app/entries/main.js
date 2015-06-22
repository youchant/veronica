!(function(){

    require(['./require-conf'], function (config) {
        require.config(config('../../../../bower_components'));

        require(['veronica'], function (veronica) {

            var app = veronica.createApp({
                module: {
                    defaultModule: {
                        path: '../',
                        multilevel: true
                    }
                },
                releaseWidgetPath: '../parts'
            });

            app.launch({ parse: true });
        });
    });

})()

