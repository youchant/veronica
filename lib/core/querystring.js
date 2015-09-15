define([
    'underscore'
], function (_) {
    var qs = {};

    function QueryString(choice) {
        this.choice = choice;
    }

    function updateQueryString(uri, key, value) {
        var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
        var separator = uri.indexOf('?') !== -1 ? "&" : "?";
        if (uri.match(re)) {
            return uri.replace(re, '$1' + key + "=" + value + '$2');
        }
        else {
            return uri + separator + key + "=" + value;
        }
    }

    /**@lends QueryString.prototype */
    var qs = QueryString.prototype;

    qs._getUrl = function () {
        var str = this.choice;
        if (this.choice === 0) {
            str = window.location.search
        }
        if (this.choice === 1) {
            str = window.location.hash;
        }
        return str;
    };

    qs.set = function (key, value) {
        var str = this._getUrl();

        if (_.isObject(key)) {
            _.each(key, function (val, k) {
                str = updateQueryString(str, k, val);
            });
        } else {
            str = updateQueryString(str, key, value);
        }

        if (this.choice == 1) {
            window.location.hash = str;
        } else {
            window.location.search = str;
        }
    };

    qs.get = function (key) {
        var url = this._getUrl();

        key = key.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + key + "=([^&#]*)");
        var results = regex.exec(url);

        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    };

    qs.toJSON = function () {
        var url = this._getUrl();

        var obj1;
        if (this.choice !== 0 && this.choice !== 1) {
            obj1 = app.core.util.qsToJSON(url);
        }
        var obj2 = app.core.util.qsToJSON(window.location.search);

        var matches = /([^\?]*)\?([^\?]+)/.exec(url);
        url = '?' + matches[2];
        var obj3 = app.core.util.qsToJSON(url);

        return _.extend({}, obj2, obj3, obj1);
    };

    return function (choice) {
        return new QueryString(choice);
    };
});
