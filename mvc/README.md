Veronica MVC
======

Veronica MVC 是 Veronica 的扩展库，主要包含MVC和MVVM模式，用于构建单页面应用程序

主要包含以下的一些内容：

* data：应用程序公共数据
* lang：应用程序语言资源配置
* router: 默认的路由
* source：数据源
* viewModel：视图模型
* baseView：基础视图
* tableView：表格视图
* formView：列表视图
* notify：公共的通知

**依赖项**

router和view都基于 Backbone 构建，而 source、viewModel、form、table等内容则基于 KendoUI，notify使用的是 pnotify

由于 KendoUI Core 不包含 Grid 组件，因此，需要在后续版本中移除对它的依赖

## 配置包路径

```js
// require.config
packages: [{
	name: 'veronica-mvc', location: '../vendor/veronica-mvc/lib'
}]
```


## 使用方法：

```js
app.use('veronica-mvc');
```