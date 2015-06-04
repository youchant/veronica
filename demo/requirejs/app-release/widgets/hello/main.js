
define('text!hello/index.html',[],function () { return '<div style="background:#ccc;">\r\n    Hi!, I\'m Hello Widget\r\n    <div class="subView"></div>\r\n    <button data-view="com?name=FFFF">Sub Widget</button>\r\n    <button data-view="hello?name=FFFF"><%= data.name %></button>\r\n    <button data-widget="world?name=FFFF"><%= data.name2 %></button>\r\n</div>';});

define('hello/subView',[
], function () {
    return {
        name: 'hehe',
        template: 'Im subView from hello widget'
    }
});


define('hello/main',[
    'text!./index.html',
    './subView',
    'ver!com'
], function (tpl, subView) {

    return {
        name: 'hello',
        defaults: {
            autoAction: true
        },
        template: tpl,
        views: {
            'sub': {
                initializer: subView,
                options: {
                    host: '.subView'
                }
            }
        }
    };
});

define('hello', ['hello/main'], function (main) { return main; });
