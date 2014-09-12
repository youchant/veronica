扩展
============

上一节我们搭建了一个非常简单应用程序，要搭建内容丰富并且可用的web应用，要做的工作还很多，下面我们就使用框架的一个mvc扩展，
来完成接下来的任务。

**获取扩展**

当使用生成器生成项目之后，会看到 vendor 文件夹内有一个名为 veronica-mvc 的项目，这就是我们的扩展，如果自己自建的项目，那么需要到
git源上去获取。

**包含的内容**

现有的扩展中引用了以下外部库：

* Bootstrap
* KendoUI Core
* Font Awesome
* Backbone
* pnotify

因此主要包括以下内容：

* 路由和视图（依赖 Backbone）
* 公共的提示框（依赖 pnotify）
* 基础及组件样式（依赖 Bootstrap、KendoUI Core）
* 字体图标（依赖 Font Awesome 或 Bootstrap）
* MVVM （依赖 KendoUI Core）
* 表单验证 （依赖 KendoUI Core）
* 数据源（依赖 KendoUI Core）
* 常用的UI组件（依赖 KendoUI Core 和 Bootstrap）

> 定制
>
> 可根据自己的需要定制依赖项，例如 KendoUI Core 就是一个比较庞大的项目，可获取到源码后，删除不必要的组件引用

## 使用路由

```js
app.start().done(function () {

    app.core.registerWidgets(app.core.getConfig().controls);

    app.ext(extensions);
    app.addPage(pages);
    app.addLayout(layouts);

    app.sandbox.on('appStarted', function () {
        app.startRouter();
    }); 

    app.startPage();
});
```

调用 app.startRouter() 方法，开启一个路由，这样你可以通过地址栏输入： http(s)://domain#page/other-page 跳转到 other-page 页面，
这个方法是基于 Backbone.Router 的简单封装，你可以参见[相关文档](http://backbonejs.org/#Router)

## 使用视图

在上一节，我们在页面上使用部件，并添加了一个标题，现在我们用更好的方式去实现这个功能，那就是使用'视图'，
视图是MVC里面的概念，我们采用的是 Backbone.View，详细的内容可参见[相关文档](http://backbonejs.org/#View)

直接使用 Backbone 的 View 过于简陋，我们有针对性的对它进行了一定的扩展，提供了一些便捷的机制。一般的部件可使用 app.mvc.baseView。

```js
define([
    'text!./templates/index.html'
], function (tpl) {

    return function (options) {
        var app = options.sandbox.app;
        var sandbox = options.sandbox;
        var $ = app.core.$;
        var _ = app.core._;

        var View = app.mvc.baseView({
            template: tpl
        });

        return new View(options);
    };
});
```

注意到我们的部件方法并没有像以前一样返回一个自定义的对象，而是返回了一个视图的实例，这个视图的实例就作为我们的部件对象。

上面我们并没有显式的调用任何方法去将HTML添加到页面中，也没有调用模板方法去转化模板，但我们也实现了相同的功能，这依赖于 baseView 提供的机制，
避免大量处理DOM，结构也更加清晰。

视图作为划分界面单元与部件对象间并没有一一对应关系，一个部件可包含任意多个视图，但需要有个视图作为部件对象，这个视图称为主视图，其他
视图都是这个视图的子视图。

## 参考

路由：