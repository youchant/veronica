# 启动应用程序


在我们的应用程序中，我们需要一个 HTML 页面，
最简单的情况下，它会是如下的样子：

```html
<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Hello-veronica</title>
</head>
<body>
    <div data-ver-role="hello-veronica" data-options='{ "hi": "Hello", "name": "Veronica!"  }'>
        <%= data.hi %> <%= data.name %>
    </div>
</body>
</html>
```

只是一个符合html5标准的 页面，里面有个 `div`。

* `data-ver-role` 指定该元素的部件名称
* `data-options` 指定实例化该部件传入的配置项

接下来引入 RequireJS，通常放在页面底部

> 我们所有的JS文件都按照AMD/UMD风格编写，同时使用 RequireJS 加载

```js
<script src="../bower_components/requirejs/require.js"></script>
```

编写自定义的代码

```js
    <script>
        require(['require-conf'], function (config) {
            // 设置 require.config
            require.config(config('../bower_components'));

            require(['veronica'], function (veronica) {

                // 创建 app
                var app = veronica.createApp();

                // 创建 widget: hello-veronica
                app.widget.register('hello-veronica', function (options) {
                    var app = options.sandbox.app;
                    var View = app.view.define();
                    return new View(options);
                });

                // 解析界面
                app.parser.parse();
            });

        });
    </script>
```

这里为了便于维护和复用，我们把 requirejs 的配置放到单独的文件中进行管理，命名为 require-conf，它类似与
下面的样子：

```js
// requirejs
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(function () {
            return factory();
        });
    } else if (typeof exports === 'object') {
        // Node.js
        module.exports = factory();
    } else {
        // Browser globals
        root.Backbone = factory();
    }
}(this, function () {

    return function (framePath) {
        require.config({
            debug: true,
            paths: {
                'underscore': framePath + '/underscore/underscore',
                'jquery': framePath + '/jquery/jquery',
                'eventemitter': framePath + '/eventemitter2/lib/eventemitter2',
                'text': framePath + '/requirejs-text/text',
                'css': framePath + '/require-css/css',
                'normalize': framePath + '/require-css/normalize',
                'css-builder': framePath + '/require-css/css-builder'
            },
            shim: {
                'underscore': { 'exports': '_' },
                'jquery': { 'exports': 'jquery' }
            },
            packages: [{ name: 'veronica', location: '../lib' }]
        });
    }

}));

```

这种写法与标准的AMD模块有些不同，称之为 [UMD](https://github.com/umdjs/umd) 模式，它能兼容 RequireJS、NodeJS和普通的全局浏览器
环境，这便于我们在 Grunt 中（NodeJS环境）对该配置文件进行读取

由于 requirejs 配置文件的单独放置，因此我们需要在配置文件真正请求并加载后，才能编写应用相关的代码。

require-conf 文件里面通过 package 方式配置 veronica 的路径，否则会出现 404 错误，如下所示：

```js
packages: [{
    name: 'veronica', location: framePath + '/veronica/lib'
}
```

> 由于框架项目是个多文件项目，因此如果你直接引用 `lib` 文件夹里的源代码，那么应该使用 packages 配置项，
而不是 paths，这样整个项目会被当成一个包加载，并能正确的解析文件之间的依赖关系。其他多文件的工程项目，也应
使用这种方式配置。

**几个API**

* createApp

创建应用程序是最开始做的工作，这个方法接收两个参数：应用程序名和应用程序配置项，多次调用该方法会销毁上一个app，并创建新的app

* app.widget.register

注册一个部件

* app.parser.parse

解析界面，该方法会查找界面上声明的widget，并实例化它


以上代码运行的结果是在界面上呈现了一段简单的字符串：  hello veronica

**完整的代码**

```html
<!DOCTYPE html>
<html>
<head>
    <title>simpe page</title>
    <meta http-equiv="content-type" content="text/html;charset=UTF-8" />
    <style>
        /*为了避免界面一开始闪烁*/
        [data-ver-role] {
            display: none;
        }
    </style>
</head>

<body>
    <div data-ver-role="hello-veronica" data-options='{ "hi": "Hello", "name": "Veronica!"  }'>
        {{= data.hi }} {{= data.name }}
    </div>
    <script src="../bower_components/requirejs/require.js"></script>
    <script>
        require(['require-conf'], function (config) {
            // 设置 require.config
            require.config(config('../bower_components'));

            require(['veronica'], function (veronica) {

                // 创建 app
                var app = veronica.createApp();

                // 创建 widget: hello-veronica
                app.widget.register('hello-veronica', function (options) {
                    var app = options.sandbox.app;
                    var View = app.view.define();
                    return new View(options);
                });

                // 解析界面
                app.parser.parse();
            });

        });
    </script>
</body>
</html>
```
