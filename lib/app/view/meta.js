define(function () {

    return function (base, app) {

        base._extend({
            methods: {
                _getContext: function () {
                    return this.options._source;
                }
            }
        });
    };
});
