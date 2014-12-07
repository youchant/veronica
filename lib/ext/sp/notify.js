define([
   'noty'
], function (noty) {
    return function (app) {
        var $ = app.core.$;
        app.notify = {}

        app.notify._core = function (option) {
            var n = noty($.extend({
                type: 'warning',
                dismissQueue: false,
                layout: 'topCenter',
                theme: 'defaultTheme',  // bootstrapTheme
                closeWith: ['click'],
                maxVisible: 1,
                animation: {
                    open: { height: 'toggle' },
                    close: { height: 'toggle' },
                    easing: 'swing',
                    speed: 100 // opening & closing animation speed
                },
                killer: true,
                modal: false
            }, option));

        }

        app.notify.warn = function (text) {
            app.notify._core({
                text: text,
                type: 'warning',
                timeout: 2000,
            });
        }
        app.notify.success = function (text) {
            app.notify._core({
                text: text,
                timeout: 1000,
                type: 'success'
            });
        }
        app.notify.error = function (text) {
            app.notify._core({
                text: text,
                type: 'error',
                timeout: 4000
            });
        }

        app.notify.confirm = function (successCb, cancelCb) {
            app.notify._core({
                text: '确定进行这个操作？',
                type: 'confirm',
                modal: true,
                buttons: [{
                    addClass: 'btn btn-primary btn-xs', text: '确定', onClick: function ($noty) {
                        $noty.close();
                        successCb();
                    }
                }, {
                    addClass: 'btn btn-danger btn-xs', text: '取消', onClick: function ($noty) {
                        $noty.close();
                        cancelCb();
                    }
                }]
            });
        }

        function notifyByResp(resp) {
            if (resp.Type === 0) {
                app.notify.error(resp.Msg);
            }
            if (resp.Type === 1) {
                app.notify.warn(resp.Msg);
            }
            if (resp.Type === 2) {
                app.notify.success(resp.Msg);
            }
        }

        // 自动报告
        if (app.config.autoReport) {

            // TODO: 仅报告成功时消息
            $(document).ajaxSuccess(function (e, xhr, f, resp) {
                if (resp.Level) {
                    if (resp.Level === 0) return;
                    notifyByResp(resp);
                }
            });
        }
    };
});
