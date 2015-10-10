# 对话框的使用

每个视图都可以通过调用 `this.window` 创建或获取特定的窗口，默认情况下，调用该方法可弹出一个模态窗口，并居中显示。

```
var wnd = this.window(options, isShow);
```

第一个参数传入一个配置对象，第二个参数是Boolean，指明该窗口是否显示。

当你明确是要获取一个窗口时，可使用：

```
var wnd = this.window(windowName);
```

传入窗口名称获取该窗口，如果未创建窗口，则返回undefined。

### 默认的配置项

#### name

窗口名称，该项是唯一用户必指定的项

#### type

默认的children类型，可能是 'view' 或 'widget'

#### el

窗口的宿主元素，传入选择器或jQuery对象，一般不设置，由程序自动创建

#### center

boolean *true* (*下版本将被废弃*使用新属性：position)

窗口是否居中，默认居中

#### footer
: boolean *false*
: 是否自动添加窗口脚栏，如果为false，最好自己添加一个footer

#### destroyedOnClose
: boolean *true*
: 关闭窗口时，是否销毁子组件

#### options
: 窗口容器的配置项
: （如果采用 kendo.window 作为容器，可参考 KendoUI 的相关文档）

下面是一些比较重要的 options 配置项

#### options.title

* type: string
* default: `"加载中..."`

窗口标题

#### options.width

* type: `int` or `string`
* default: `300`

窗口宽度

#### options.height

* type: `int` or `string`
* default: `200`

窗口高度

#### options.resizable

* Type: `Boolean`
* Default: `false`

#### options.modal

* Type: `Boolean`
* Default: `true`

#### options.draggable

* Type: `Boolean`
* Default: `false`

#### children

* Type: `Array`

包含窗口内的子组件配置集合，有两种类型：view、widget

* type 为 view 时的配置

##### type

组件类型，如果不指定，则采用窗口配置中的 type

##### initializer

视图的初始化函数

##### options

传入视图的参数

##### options.host

视图的宿主元素，如果不传入，则默认以整个窗口作为宿主元素

* type 为 widget 的配置

##### type

组件类型，指定为 widget，如果不指定，则采用窗口配置中的 type

##### name

部件的名称

##### options

传入部件的参数

##### options._source

部件所在的源

### 从已有元素创建窗口

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

使用方法 this.window 创建窗口，多次调用不会产生副作用。如果该窗口存在，则简单的打开该窗口，并返回窗口对象；如果该窗口不存在，才创建。

**传入 widget 或 view**

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

```
this.window({
    name: 'wnd-test',
    children: [{
        type: 'view',
        initializer: EditView
    }]
})
```

### 在view或widget内设置窗口属性

在窗口的widget或view中，可通过 options.parentWnd 访问窗口对象，利用这点，可完成一些常见的需求。

在窗口初始化过程中，我们可不指定窗口的尺寸和标题，而在窗口内部的视图中设置它的这些属性，示例代码如下：

```
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

如果配置了视图的 `windowOptions` 配置项，则会自动设置该视图在窗口中呈现时窗口的大小、标题属性。

