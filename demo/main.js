

require(['./require-conf'], function (c) {

    var framePath = '../bower_components';
    // requirejs 的配置
    require.config(c(framePath));

    require(['app']);

})
