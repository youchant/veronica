# 数据

## 基于数据驱动的应用程序

![数据源](../../images/datasource.png)

默认使用 Kendo UI Core 的 DataSource 对象作为数据源对象，详细的使用请参见：

[Kendo DataSource](http://docs.telerik.com/kendo-ui/api/framework/datasource)

不建议直接通过 `kendo.data.DataSource` 的方式访问或创建数据源

```js
var source = app.mvc.baseSource(options);
```

等价于

```js
var source = new kendo.data.DataSource(options);
```

## 数据源

DataSource十分强大，主要包含以下的功能：

### 使用本地数据

使用 `data` 配置

```js
var dataSource = app.mvc.baseSource({
  data: [
    { name: "Jane Doe", age: 30 },
    { name: "John Doe", age: 33 }
  ]
});
```

### 使用远程数据

使用 `transport` 配置

```js
{
	transport: {
		create:
		destroy:
		parameterMap:
		push:
		read: {  // 这里使用jQuery的配置
			url: 
			cache:
			contentType:
			data:
			dataType:
		}
}
```