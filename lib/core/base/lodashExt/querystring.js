define([
    'lodash'
], function (_) {
    var qs = {};

    /**
     * 查询字符串的来源
     * @enum
     * @type {number}
     */
    var QueryStringType = {
        /** 浏览器 URL 的查询部分 */
        SEARCH: 0,
        /** 浏览器 URL 的 hash 部分 */
        HASH: 1
    };

    /**
     * 查询字符串处理类
     * @class QueryString
     * @memberOf veronica
     * @param {QueryStringType} choice - 查询字符串来源
     */
    function QueryString(choice) {
        if (choice == null) {
            choice = 1
        }
        this.choice = choice;
    }

    /**@lends veronica.QueryString# */
    QueryString.prototype = {
        constructor: QueryString,
        _qsToJSON: function (str) {
            str || (str = location.search);
            var matches = /([^\?]*)\?([^\?]+)/.exec(str);
            if (matches != null) {
                str = matches[2];
            }
            var pairs = str.split('&');

            var result = {};
            _.each(pairs, function (pair) {
                pair = pair.split('=');
                result[pair[0]] = decodeURIComponent(pair[1] || '');
            });

            return JSON.parse(JSON.stringify(result));
        },
        _updateQueryString: function (uri, key, value) {
            var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
            var separator = uri.indexOf('?') !== -1 ? "&" : "?";
            if (uri.match(re)) {
                return uri.replace(re, '$1' + key + "=" + value + '$2');
            }
            else {
                return uri + separator + key + "=" + value;
            }
        },
        /**
         * 获取查询字符串的 url
         * @private
         */
        _getUrl: function () {
            var str = this.choice;
            if (this.choice === 0) {
                str = window.location.search;
            }
            if (this.choice === 1) {
                str = window.location.hash;
            }
            return str;
        },

        _setUrl: function (str) {
            if (this.choice === 1) {
                window.location.hash = str;
            }
            if (this.choice === 0) {
                window.location.search = str;
            }
        },

        /**
         * 设置
         * @param {string} key
         * @param {Any} value
         */
        set: function (key, value) {
            var str = this._getUrl();
            var me = this;
            if (_.isObject(key)) {
                _.each(key, function (val, k) {
                    str = me._updateQueryString(str, k, val);
                });
            } else {
                str = me._updateQueryString(str, key, value);
            }

            this._setUrl(str);

            return str;
        },

        /**
         * 获取值
         * @param {string} key
         * @returns {string} 结果
         */
        get: function (key) {
            var url = this._getUrl();

            key = key.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
            var regex = new RegExp("[\\?&]" + key + "=([^&#]*)");
            var results = regex.exec(url);

            return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        },

        /**
         * 整个转换为对象
         * @returns {Object} 结果
         */
        toJSON: function (combineSearch) {
            var url = this._getUrl();
            if (combineSearch == null) {
                combineSearch = false;
            }
            var obj1, obj2;
            obj1 = this._qsToJSON(url);
            if (combineSearch) {
                obj2 = this._qsToJSON(window.location.search);
            }

            return _.extend({}, obj2, obj1);
        }
    }

    if (!_.qs) {
        _.qs = function (choice) {
            return new QueryString(choice);
        }
    }
});
