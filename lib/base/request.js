define([
], function () {
    return function (app) {

        var $ = app.core.$;
        var core = app.core;

        /**
         * 无法直接构造
         * @classdesc 网络请求
         * @class veronica.Request
         */

        /**
         * @lends veronica.Request#
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
         * POST 简单对象
         * @param {string} url - 请求路径
         * @param {Object} data - 数据
         * @returns {Deferred}
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

        /**
         * 多个请求捆绑发送
         * @param {...string|Object} url 或 延迟对象
         * @returns {Deferred}
         */
        request.getBundle = function () {
            var urls = Array.prototype.slice.call(arguments);
            var requests = $.map(urls, function (item) {
                if (_.isString(item)) {
                    return $.get(item);
                } else {
                    return item.done ? item : $.get(item.url, item.data);
                }
            });

            return core.whenSingleResult.apply(core, requests);
        }

        var isChromeFrame = function () {
            var ua = navigator.userAgent.toLowerCase();
            return ua.indexOf('chrome') >= 0 && window.externalHost;
        };

        /**
         * 下载文件
         * @param {Object} settings - 配置对象 eg: { url: '', data: [object] }
         * @returns {}
         */
        request.download = function (settings) {
            settings || (settings = {}); //eg: { url: '', data: [object] }
            if (settings.url == undefined) {
                return;
            }
            if (!_.isString(settings.data)) {
                settings.data = $.param(settings.data, true);
            }
            if (!isChromeFrame()) {  // 当使用ChromeFrame时，采用新窗口打开
                if ($('#global-download-iframe').length === 0) {
                    $('<iframe id="global-download-iframe" src="" style="width:0;height:0;display: inherit;border:0;" \>').appendTo(document.body);
                }
                $('#global-download-iframe').attr('src', settings.url + '?' + settings.data);
            } else {
                window.open(settings.url + '?' + settings.data, "newwindow");
            }
        };

        /**
         * @memberOf veronica.Application#
         * @name request
         * @type {veronica.Request}
         */
        app.request = request;
    };
});
