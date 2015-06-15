define([
], function () {
    return function (app) {

        var $ = app.core.$;

        /**
         * @namespace
         * @memberOf Application#
         */
        var request = {};

        /**
         * $.get 的包装
         */
        request.get = function (url, data) {
            return $.get(url, data);
        };

        /**
         * 获取JSON（$.getJSON）
         */
        request.getJSON = function (url, data) {
            return $.getJSON(url, data);
        };

        /**
         * 传入复杂对象进行 GET 请求（需要后台进行JSON字符串的反序列化）
         * @param {string} url - 地址
         * @param {Object} data - 数据
         * @param {Object} [options] - 选项
         */
        request.getComplex = function (url, data, options) {
            options || (options = {});

            return $.ajax($.extend({
                url: url,
                type: 'GET',
                contentType: "application/json",
                data: JSON.stringify(data)
            }, options));
        };

        /**
         * $.post
         */
        request.post = function (url, data) {
            return $.post(url, data);
        }

        /**
         * POST 复杂对象（使某些后台处理程序（如 ASP.NET MVC）能够正常进行数据绑定）
         * @param {string} url - 地址
         * @param {Object} data - 数据
         * @param {Object} [options] - 选项
         */
        request.postComplex = function (url, data, options) {
            return $.ajax($.extend({
                url: url,
                type: 'POST',
                contentType: "application/json",
                dataType: 'json',
                data: JSON.stringify(data)
            }, options));
        }

        app.request = request;
    };
});
