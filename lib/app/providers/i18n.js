define([], function () {
    return function (app) {
        var extend = app.core._.extend;
        var logger = app.core.logger;
        var _ = app.core._;

        /**
         * 显示文本（国际化）
         * @namespace
         * @memberOf veronica
         */
        app.i18n = app.provider.create();

        app.i18n.add('default', {
            /** 对话框标题 */
            defaultDialogTitle: '对话框',
            /** 对话框关闭文本 */
            windowCloseText: '关闭',
            /** 加载中文本 */
            loadingText: '加载中...'
        });
    };
});
