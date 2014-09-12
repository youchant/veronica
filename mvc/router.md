路由
===

系统使用 Backbone 中的 Router 作为基础构建应用程序的路由器

## 默认的路由模式

默认添加了以下的路由：

### page/:pageName

该路由可识别如下的路径：

```html
http(s)://xxx.xx#page/name
```

当跳转到该路由时，系统会调用 `app.switchPage(pageName)` 

### 根路径

当路由到根路径时，系统会跳转到 `home` 页面，因此 'http(s)://xxx.xx' 与 'http(s)://xxx.xx#page/home' 等价

## 启动路由

在应用程序启动后，调用 `app.startRouter` 方法可启动路由，该方法可支持传入一个配置对象，这样用户传入自定义的路由

```js
app.sandbox.on('appStarted', function(){
	app.startRouter({
		foo: function(){
		}
	})
})
```
### 访问已存在的路由

当启动路由后，你可以访问这个路由，通过 `app.mvc.router`，这个对象是 Backbone.Router 的实例，它提供
了许多有用的方法和属性，详细可参见：[Backbone的文档](http://backbonejs.org/#Router)

例如，你可以在默认的路由器上扩展自己的路由：

```js
app.mvc.router.route("page=:number", "page", function(number){ ... });
```

你也可以在前端跳转到某个路由：

```js
app.mvc.router.navigate("help/troubleshooting", { trigger: true });
```

注意把 trigger 设为 true，以便触发我们绑定在路由上的方法

## 重写路由

你可以完全重写路由的实现，比如你不想使用 Backbone，此时，你需要实现 `app.mvc.Router` 方法，
默认的实现如下，可仿照此结构编写自己的实现.

```js
app.mvc.Router = function (obj) {
    obj || (obj = {});
    return Backbone.Router.extend($.extend(true, {}, app.mvc._router, obj));
};
```