# 快速入门

通过这个教程，你可以基于 veronica 库创建一个非常简单的 web 应用程序：Hello Veronica，并借此简单了解基于 Veronica 的应用的执行逻辑

在我们的应用程序中，我们需要一个 HTML 页面，最简单的情况下，它会是如下的样子：

* hello-veronica.html

```
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
        <strong><%= data.hi %> <%= data.name %></strong>
    </div>
    <script src="../../bower_components/jquery/dist/jquery.min.js"></script>
    <script src="../../bower_components/underscore/underscore-min.js"></script>
    <script src="../../dist/veronica.js"></script>
    <script src="app.js"></script>
</body>
</html>
```

这里引入了脚本文件（根据你实际情况适当调整路径）：

* jquery
* underscore
* veronica

这仅是一个非常普通的符合HTML5标准的页面，注意到里面有个 `div`，有两个自定义属性：

* `data-ver-role`：指定该元素的 widget 名称
* `data-options`：指定实例化该 widget 传入的配置项

下面写一点JS代码：

* app.js

```js
// create app
var app = veronica.createApp();

// create widget: hello-veronica
var helloVeronicaWidget = {};
// registe widget
app.widget.register('hello-veronica', helloVeronicaWidget);

// launch app
app.launch({ parse: true });
```

在浏览器中显示如下：

![预览](./images/preview-hello-veronica.png)

**需要注意的几点**

1. widget 对象是一个普通的JS对象，在注册后会被创建为`Widget`对象的一个实例，同时它也是`Backbone.View`的实例，Veronica 对 Backbone 默认的视图进行了扩展
2. 在应用程序启动（launch）后，如果参数 `parse` 设为 `true`，那么应用程序会实例化所有具有 `data-ver-role` 属性的元素
3. `hello-veronica` 的宿主元素内部使用了 Underscore 的模板，外部传入的参数全部通过 `data` 字段进行访问

实际上对于`hello-veronica` widget 我们什么都没写，Widget 类为我们做了大部分事情，包括如何传入参数，如何渲染模板等，下面我们改写以下定义 widget 的写法，让我们能够更多的了解在 veronica 中视图（view）的一些写法

* hello-veronica.html

```html
...
<div data-ver-role="hello-veronica"></div>
...
```

* app.js

```js
var helloVeronicaWidget = {
	template: '<strong><%= data.hi %> <%= data.name %></strong>',
    defaults: {
    	hi: 'Hello',
        name: 'Veronica!'
    }
};
```

改写后最终结果是一样的，这里通过 `template` 属性设置默认模板，通过 `defaults` 属性设置默认参数





