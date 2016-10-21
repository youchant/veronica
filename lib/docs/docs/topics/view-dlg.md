# 对话框的使用

每个视图都可以通过调用 `this.window` 创建或获取特定的窗口，默认情况下，调用该方法可弹出一个非模态窗口，并居中显示。

```
var wnd = this.window(options, isShow);
```

第一个参数传入一个配置对象，第二个参数是Boolean，指明该窗口是否显示。

当你明确是要获取一个窗口时，可使用：

```
var wnd = this.window(windowName);
```

传入窗口名称获取该窗口，如果未创建窗口，则返回undefined。

## 创建对话框

基本语法：

```js
// 在 view 的成员方法内
this.window({
    name: 'wnd_test',
    children: [{
        type: 'view',
        name: 'editview',
        initializer: EditView,
        options: {
            host: '.dlg-body'
        }
    }]
})
```

从已有元素创建窗口：

```
this.window({
    name: 'wnd-test',
    el: '.dlg-test',
    options: {
        title: 'test',
        width: 200,
        height: 100
    }
})
```

> 使用方法 this.window 创建窗口，多次调用不会产生副作用。如果该窗口存在，则返回窗口对象；如果该窗口不存在，则创建后返回。

### 对话框的内容

对话框的内容可能包括：普通HTML、视图、widget、iframe 内嵌网页等。view 和 widget 作为内容都应把创建所需的配置传入 `children` 参数，
该参数配置对话框的所有子集

* 使用 widget

```
this.window({
    name: 'wnd-test',
    children: [{
        type: 'widget',
        name: 'widgetA',
        options: {
            _source: 'source1'
        }
    }]
})
```

* 使用 view

```
this.window({
    name: 'wnd-test',
    children: [{
        type: 'view',
        initializer: EditView
    }]
})
```

**在view或widget内更改窗口属性**

在窗口的widget或view中，可通过 options.parentWnd 访问窗口对象，利用这点，可完成一些常见的需求，例如根据子对象自身的尺寸，动态设置父级对话框尺寸。如下：

```js
// 我们不指定窗口的尺寸和标题，在窗口内部的视图中设置它的这些属性
initAttr: function(){

    // 以下代码可写在任意初始化方法中
    if(this.options.parentWnd){

        // 设置窗口的标题、宽、高
        this.options.parentWnd.setOptions({
            title: 'Hello',
            width: 500,
            height: 400
        });

        // 在新的窗口尺寸下使窗口居中
        this.options.parentWnd.center(); 
    }
}
```

对于完成以上任务，还提供了更简便的方法，配置视图的 `windowOptions` 配置项，这样则会在视图创建之后自动设置该视图所在窗口的大小、标题属性。

```js
defaults: {
    windowOptions: {
        width: 200,
        height: 150
    }
}
```

### 创建对话框的快捷方法

提供了一些快捷方法用于特定类型的对话框创建

* 包含单个视图的对话框 `viewWindow`

```js
this.viewWindow('viewName', EditView, { host: '.dlg-content' }, { modal: true });
```

* 包含单个 widget 的对话框 `widgetWindow`

```js
this.widgetWindow('widgetName', { host: '.dlg-content' });
```

* 普通 HTML 的对话框 `htmlWindow`

```js
this.htmlWindow('<b>Hello!</b>');
```

## 对话框的生命周期

对话框的存在受制于创建它的视图，视图被销毁，对话框也被销毁

对话框关闭后即被销毁，同时对话框的 children 内的内容也会被销毁，当再次打开对话框时，会重新创建对话框

