# TableView

## 配置项

### columns `Array` *[ ]*

定义表格的列，该属性较为灵活，可以直接传入字符串数组
 
```js
['name', 'description']
```

如果你定义了 `app.lang` 的属性，可读取对应字段的显示名称，详见：语言资源 章节，如果未定义，那么将会按照 KendoUI Grid 的规则进行解析
  
你也可以传入 KendoUI Grid 的完整列定义，例如：

```js
[{
	title: '名称',
	field: 'name'
},{
	title: '描述',
	field: 'description' 
}]
```
  
### isLocal `Boolean` *false*

是否是本地数据源，如果该表格是操作本地的数据源，则设为 `true`，反之则为 `false`
  
### url `Object`

当使用远程数据源时，可以配置该属性，典型的配置如下：
  
```js
	url: {
		read: '/Product/List',
		remove: '/Product/Remove'
	}
```

tableView 会使用这些路径来构造远程数据源，并在默认的实现中使用

### source `function`

接收一个方法，该方法应返回一个 `kendo.DataSource` 对象，以替代默认构造的 `DataSource`，当你需要自定义数据源时，使用该配置项

### enableChk `boolean` *false*

是否启用复选框选择功能

### blankContent `html`

当表格未找到数据时显示的内容，一般不重写

### chkTemplate `object`

当启用了复选框功能时，渲染复选框列的模板，默认参数如下，一般不重写：

```js
chkTemplate: {// 全选模板
    headerTemplate: '&nbsp;',
    template: '<input name=\"selectedIds\" class=\"chk"\ type=\"checkbox\" />',
    width: 30
}
```

### filters	`function`

该属性接收一个方法，并且该方法必须返回一个数组，通过这个属性，可设置每次获取数据（通过`filter`方法）的默认筛选

有些场景下，表格每次获取数据都需要传递默认的筛选字段（假设该表格始终需要根据员工的所属部门获取员工列表），就可通过该属性实现，例如：

```
filters: function(){
	return [{ field: "name", operator: "startswith", value: "Jane" }];
}
```

## 属性

没有自己独特的属性，可使用 `baseView` 中的所有属性

## 方法

### $grid

获取表格的jQuery对象

> **注意：** 必须在表格元素上添加 `.grid` 的类，才能通过该方法获取

### grid

获取表格的 Kendo 对象

### edit

弹出编辑窗口

参数：

|名称|类型|描述|
|---|---|---|
|instance|object|编辑视图实例|
|id|string (optional)|待编辑数据的id，如果不传，则代表是新增数据|

### getSelectedId

获取选择的数据项Id

> **注意：** 仅可在单选模式下使用

### getSelectedItem

获取选择的数据项

> **返回值：** 
>
> 如果选择单条数据，则返回该数据项；多条数据，则返回数组；未选择数据，则返回 `null`
  
### source

返回该表格的数据源

### resize

当窗口缩放时，调用该方法可自适应窗口大小，如果配置了 `autoResize` 属性，则会自动调用

### search

根据某个字段搜索

### filter

查询（筛选）

参数：

|名称|类型|描述|
|---|---|---|
|filter|array|筛选配置项|
|isGroup|boolean (false)|是否是组合查询|

### refreshHandler

默认的刷新处理器的实现

### deleteHandler

默认的删除处理器的实现