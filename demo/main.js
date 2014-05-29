

require(['./require-conf'], function (conf) {

    var framePath = '../bower_components';
    // requirejs 的配置
    require.config(conf(framePath));

    require(['app']);

})
