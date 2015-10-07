define([], function () {
    return function (app) {
        return {
            'main': function () {
                console.log(this._name);
            }
        }
    };
});
