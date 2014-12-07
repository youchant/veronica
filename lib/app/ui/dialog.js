define([
    'artDialog'
], function (dialog) {
    return function (app) {
        app.ui || (app.ui = {});
        app.ui.dialog = dialog;
        app.ui.confirm = function (content, successCallback, cancelCallback) {
            app.ui.dialog({
                width: 250,
                quickClose: true,
                content: content || '确认进行该操作？',
                okValue: '确定',
                ok: function () {
                    successCallback && successCallback();
                },
                cancelValue: '取消',
                cancel: function () {
                    cancelCallback && cancelCallback();
                }
            }).showModal();
        };
    };
});
