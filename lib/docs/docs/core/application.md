# 应用程序

<!-- toc -->

创建应用程序使用如下方法：

```js
var app = veronica.createApp({/* options */});
```

## 参数

具体的参数如下：

### features

* Type: Array
* Defaults: ['plugin', 'dialog', 'spa']

设置创建的该应用程序需要启用哪些特性，目前包括：

* dialog: 支持对话框
* plugin: 支持插件扩展widget
* spa: 支持单页面应用程序的构建（页面、布局、路由，导航等）

### name

**String** *'app'*

应用程序名称

### autoReport

**Boolean** *true*

是否启用自动通知

### autoBuildPage

**Boolean** *false*

是否启用自动页面配置。当通过路由或 `app.page.change`访问某个页面时，如果未找到对应的页面配置，启用自动页面配置时，会根据页面名称自动生成页面配置。

> **关于自动页面配置**
>
> 访问 basic/home/index 或 basic-home-index 时，系统会去查找名为 basic-home-index 的widget，并且添加 _common 的页面继承;
> 如果访问index，则会查找basic/Home/index，如果访问 home/index，则会查找basic/home/index

### autoParseWidgetName

**Boolean** *false*

自动解析 widget 名称，这个参数设置为`true`的意义在于如果widget配置没有设置source，则会根据widget的名称来获取source

### global

**Boolean** *false*

默认app对象不能通过全局访问，设为`true`，则可通过全局变量`__verApp`访问到该应用程序

### homePage

**String** *home*

当使用Router导航页面时，对于路径''或'/'所对应的页面

**页面配置的默认参数**

在配置页面时，如果没有提供对应的参数采取的默认值

### page.defaultLayout

**String** *default*

默认的布局

### page.defaultHost

**String** *.v-render-body*

当widget未指定宿主对象时，采用的默认宿主对象

### page.defaultSource

**String** *basic*

默认的源

### page.defaultInherit

**String** *_common*

默认的继承页面

**模块配置的默认参数**

在进行模块配置时，如果没设置该参数，采用的默认参数

### module.defaultMultilevel

**Boolean** *false*

默认多级别，当设为`true`时，指明该模块下的widget采用多层级文件夹放置

### module.defaultWidgetPath

**String** *widgets*

默认的widget放置路径

### module.defaultSource

**String** *modules*

默认模块的放置源

### module.defaultHasEntry

**Boolean** *true*

默认是否有入口文件配置

### modules

**Array** *[]*

**模块配置**

模块配置传入一个数组，指定该应用程序包括的所有模块，包括如下参数：

* name: 模块名称
* source: 模块源
* multilevel: widget 为多级目录
* hasEntry: 有入口文件

当每个模块配置参数为字符串时，该字符串指定该模块的名称，其他参数采用默认参数

### extensions

**Array** *[]*

扩展列表

```
extensions: ['veronica-ui']
```

## 应用程序启动流程

* 单页面模式

```js
app.launch().done(function () {
    // 解析界面
    app.parser.parse();
});
```

* 多页面模式（路由）

```js
app.launch().done(function () {
    // 启动页面，开启路由
    app.page.start();
});
```