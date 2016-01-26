define(function (require) {
    return function (mod) {
        // 添加布局
        mod.addLayout({
            'normal': require('text!./normal-layout.html')
        });

        // 添加页面
        mod.addPage([{
            'user-list': {
                name: '用户列表',
                layout: 'normal',
                widgets: [
                    'user-list2@#hard@user-control'
                ]
            }
        }]);
    }
});
