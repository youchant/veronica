# 基础库

基础库提供了框架的一些基本的机制，为应用程序管理提供支撑，同时，基础库还用于屏蔽第三方库的具体实现，为
上层提供一致的接口。

基础库中包含了不同方面的许多常用方法

## 应用程序和插件管理


### createApp

创建应用程序

```js
core.createApp('test-application', {
	// some config
})
```

### registerWidgets

注册某个小部件，这样该部件能够被其他部件直接引用.

可使用 `部件名 + '@' + 源` 的方式，注册不同源的部件

```js
// 注册部件
core.registerWidgets(['widget1@foobar'])

// 定义 widget2 时，可如下使用
define([
	'widget1'
], function(){

});

```

### waitWidgets

等待其他部件加载完，再执行某些动作。该方法可在定义某个部件时，该部件依赖于其他部件时使用

> 最佳实践
> 
> 虽然提供此方法，但部件间最好不要产生直接的依赖关系

```js
return core.waitWidgets(['widget1', 'widget2'], sandbox, function(){
	return {
		// widget ojbect
	};
})
```

### getConfig

获取 RequireJS 中定义的配置

## 一些工具

### core.$

jQuery 对象

### core._

Underscore 对象

### core.aspect

AOP 机制，包括 `before` 和 `after`

### core.util.mixin

扩展实例属性（当传入对象时），扩展类属性（传入构造函数时）

```js
core.util.mixin(app, { color: 'red' });
core.util.mixin(Application, { say: function(){ } });
```

### core.logger

日志对象，包含 `warn`、`log`、`error` 等方法