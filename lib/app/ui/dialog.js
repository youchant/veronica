define([
    'art-dialog'
], function (dialog) {
    return function (app) {
        app.ui || (app.ui = {});

        /**
         * 对话框UI控件的配置参数（默认采用 artDialg）
         * @typedef DialogUIOptions
         * @see {@link http://aui.github.io/artDialog/doc/index.html}
         */

        app.ui.dialog = dialog;

        app.ui.confirm = function (content, successCallback, cancelCallback) {
            if (window.confirm(content)) {
                successCallback && successCallback();
            } else {
                cancelCallback && cancelCallback();
            }
            //app.ui.dialog({
            //    width: 250,
            //    quickClose: true,
            //    content: "<div class='confirm_content'>"+content+"</div>" ||"<div class='confirm_content'>确认进行该操作？</div>",
            //    okValue: '确定',
            //    ok: function () {
            //        successCallback && successCallback();
            //    },
            //    cancelValue: '取消',
            //    cancel: function () {
            //        cancelCallback && cancelCallback();
            //    }
            //}).showModal();
        };
    };
});
