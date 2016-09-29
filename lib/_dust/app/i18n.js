define([], function () {
    return function (app) {
        /**
         * 显示文本（国际化）
         * @namespace
         * @memberOf veronica
         */
        app.createProvider('i18n');

        // 默认使用中文
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
