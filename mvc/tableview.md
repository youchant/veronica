# TableView

当一个视图主要是由表格构成时，使用 `app.mvc.tableview`，使用方法：

```js
var AppView = app.mvc.tableView({
    template: tpl,
    defaults: {
        columns: ['name', 'code'],
        isLocal: true,
        source: function () {
            return new kendo.data.DataSource({
                data: [
                    { name: "Jane Doe", age: 30 },
                    { name: "John Doe", age: 33 }
                ]
            });
        },

        enableChk: true,
        autoResize: true
    }
});

return new AppView(options);
```

以上代码展示了基于 `app.vmc.tableView` 构建自己的Table，而 `tableView` 又混入了 `baseView` 的所有属性，因此`baseView`的所有用法在`tableView`内均适用。

在 `tableView` 中，覆写了 `initAttr`、`resize`、`listenSelf`，因此最好不重写这些方法，可以使用 `this.after('initAttr')` 这样的 AOP 机制去扩展它，如果确实要覆写，调用原始方法使用：

```js
app.mvc._tableView.initAttr()
```
