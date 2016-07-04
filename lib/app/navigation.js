define([
], function () {

    'use strict';

    return function (app) {
        var _ = app.core._;

        function createNav(data) {
            _.each(data, function (item, index) {
                if (item.items) {
                    createNav(item.items);
                    item.items = _.compact(item.items);
                }
                if (item.url) {
                    var pageConfig = app.page.get(item.url);
                    if (pageConfig) {
                        if (!item.name) {
                            item.name = pageConfig.name;
                        }
                        if (!item.code && pageConfig.code) {
                            item.code = pageConfig.code;
                        }
                    } else {
                        data[index] = false;
                    }
                }
            });
        }

        app.navigation = {
            _nav: null,

            create: function (data) {
                createNav(data);
                this._nav = _.isArray(data) ? _.compact(data) : data;
            },
            get: function () {
                return this._nav;
            }
        }
    };

});
