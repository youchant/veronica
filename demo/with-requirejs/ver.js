// requirejs 插件 ver
define(function () {

    function isFunction(x) {
        return Object.prototype.toString.call(x) == '[object Function]';
    }

    var loadResource = function (resourceName, parentRequire, callback, config) {

        try {
            if (window) {
                var app = window.__verApp;  // 这里使用了全局的应用程序类，不太好
                app.widget.package(resourceName);

                parentRequire([resourceName], function (templateContent) {

                    if (!isFunction(templateContent)) {
                        templateContent = app.view.define(templateContent);
                    }
                    callback(templateContent);

                });
            }
        } catch (e) {
            callback();
        }
    };

    return {
        load: loadResource
    };
});
