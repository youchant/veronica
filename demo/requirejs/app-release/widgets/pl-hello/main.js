define('pl-hello/main',[], function () {
    return function (app) {
        return {
            'main': function () {
                console.log(this._name);
            }
        }
    };
});

define('pl-hello', ['pl-hello/main'], function (main) { return main; });
