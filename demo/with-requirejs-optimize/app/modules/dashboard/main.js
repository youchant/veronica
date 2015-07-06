define(function (require) {
    return function (mod) {
        // 添加布局
        mod.addLayout({
            'dashboard': require('text!./dashboard-layout.html')
        });

        // 添加页面
        mod.addPage([{
            'dashboard': {
                name: '仪表盘',
                layout: 'dashboard',
                widgets: [
                    'hello-veronica@#hard@dashboard',
                    'charts@#hard@dashboard'
                ]
            }
        }]);
    }
});
