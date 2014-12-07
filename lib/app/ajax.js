define([
], function () {
    return function (app) {

        var $ = app.core.$;
        app.request = {};

        app.request.get = function (url, data) {
            return $.get(url, data);
        };

        // 获取JSON
        app.request.getJSON = function (url, data) {
            return $.getJSON(url, data);
        };

        // 传入复杂对象进行 GET 请求（需要后台进行JSON字符串的反序列化）
        app.request.getComplex = function (url, data, options) {
            options || (options = {});

            return $.ajax($.extend({
                url: url,
                type: 'GET',
                contentType: "application/json",
                data: JSON.stringify(data)
            }, options));
        };

        // 提交复杂对象到后台，使 ASP.NET MVC 下能够正常进行数据绑定
        app.request.postComplex = function (url, data) {
            return $.ajax($.extend({
                url: url,
                type: 'POST',
                contentType: "application/json",
                dataType: 'json',
                data: JSON.stringify(data)
            }, options));
        }

        app.request.post = function (url, data) {
            return $.post(url, data);
        }
    };
});
