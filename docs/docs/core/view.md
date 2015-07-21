# 视图 View

视图是界面呈现的基本单元，它包括构成某块区域界面的界面模板（html）、界面逻辑（js）、界面样式（css）

> **注意**
>
在经典的MVC模式中（如Spine.js、ASP.NET MVC、yii 等），视图更多的表示界面模板，而界面逻辑一般称为控制器，我们采用的是 Backbone 的设计理念，用视图指代控制器。

在 Veronica 中，视图以 Backbone.View 为基础，在这之上封装并加入自己的方法。

Backbone 中的视图定义及实例化方式：

```js
 var SearchView = Backbone.View.extend({
    initialize: function(){
        this.render();
    },
    render: function(){
        var variables = { search_label: "My Search" };
        var template = _.template( $("#search_template").html(), variables );
        this.$el.html( template );
    },
    events: {
        "click input[type=button]": "doSearch"
    },
    doSearch: function( event ){
        alert( "Search for " + $("#search_input").val() );
    }
});

var search_view = new SearchView({
    el: $("#search_container")
});
```

它具有如下特性：

* 有一个主元素（el）
* 生命周期主要包括：初始化（initialize）、渲染（render）、移除（remove）三个动作
* 使用事件代理管理子DOM元素事件
* 使用模板构造html

下面看看 Veronica 的视图定义方式：

```js
var FamilyView = app.view.define({
    template: tpl,
    init: function(){

    },
    defaults: {
        autoRender: false,
        autoAction: true
    },
    views: {
        'active': 'view-detail',
        'view-detail': {
            initializer: detailView
        },
        'view-members': {
            initializer: membersView
        }
    },
    initAttr: function(){
        this.model({
            text: 'Hello World'
        }, false);
    }
});

var view = new FamilyView({
    host: '#main'
});
```

Veronica 重新定义了 Backbone.View 的 initialize 和 render 方法（默认是空方法）

## 渲染

渲染是将模板转化成HTML片段并添加到DOM树中的过程

```js
// 使用默认模版渲染
view.render();
// 使用指定模板渲染
view.render('hello <%: data.foo %>');
```

配置 `template` 属性可设置默认的模板，模板默认采用 Underscore.js 的模板引擎。

```js
var View = app.view.define({
    template: 'I say: <%= data.answer %>'
})

var view = new View({ answer: 'hello' });
```

模板中使用的数据对象来源于视图的options对象，可通过 `data.*` 的方式访问，同时你也可以在模板中通过 `data.lang` 访问到 `app.lang` 的对象，用于支持不同语言或不同显示文本。

**自动渲染**

视图默认是自动渲染的，可以通过设置 `autoRender` 为 false 禁止这种行为，自动渲染读取默认模板。

**渲染事件**

* rendering  
  模板渲染中，表示模板构造完毕，如果有 `host`，则还未添加到DOM树中
* rendered  
  模板渲染完毕，表示模板构造完毕，并已添加到DOM树中

## 数据绑定

视图模型默认是一个空对象，默认情况下，渲染完毕后，如果视图模型不为空，则会进行数据绑定。

因此，如果不设置视图模型，则默认不会进行数据绑定，可以修改 `bindEmptyModel` 配置项为 true，强制绑定空对象。这样即使没有设置视图模型，在渲染完毕后，都会进行数据绑定。

**设置视图模型**

调用 `this.model` 方法，可获取或设置视图模型。

```js
var View = app.view.define({
    initAttr: function(){
        // 设置 baseModel
        this.baseModel = {
            foo: 'bar'
        };
        this.model({}, false);

        // 设置  viewModel
        this.model({
            foo: 'bar'
        }, false);

        // 获取 viewModel
        var viewModel = this.model();
    }
});
```

不绑定

每次设置视图模型后，会自动绑定视图模型，以使当前界面显示与视图模型一致，如果不想设置时立刻绑定，则传入一个 `false` 的参数即可

> **注意**
>
> 当模型设置发生在视图渲染之前时（渲染时会进行视图绑定），例如在 `initAttr` 和 `init` 方法中设置视图模型，则必须设置自动绑定 `false`，否则会触发两次视图绑定

baseModel

设置视图模型会替换掉原来的视图模型，并重新进行数据绑定。可设置 `baseModel` 属性，这个基础模型在每次视图模型替换时都会被设置。

**双向绑定**

内部方法 `_bind` 完成具体的绑定，它是一个可自定义的方法，默认提供了 KendoUI 的绑定方式，这样视图中的视图模型对象就是 KendoUI 中的 `ObservableObject` 实例

> 也可以用其他MVVM框架自定义绑定机制，例如 Knockout、AngularJS 等

KendoUI 的视图绑定会自动实例化 KendoUI 的控件，通过读取 `data-role` 及 `data-*` 等标签属性构建这些控件对象，这是一个很棒的特性，因此，有了视图模型绑定机制后，我们就可以尽量避免手动实例化相应的控件，并且通过标签声明的方式也使代码更加简洁

**事件**

modelBound

绑定视图模型完毕后会触发 `modelBound` 事件，这通常表明用户界面的主要呈现工作已经完成，我们可在模型绑定之后做一些后续操作，例如异步读取数据等

## 事件

采用 Backbone.View 自带的[事件机制](http://backbonejs.org/#Events)

```js
// 触发事件
this.trigger('rendered', data, msg);
```

**监听事件**

在视图定义时，一般把所有的事件监听放到 `listen` 方法内定义

```js
listen: function(){
    this.listenTo(this, 'modelBound', function(){
        // 这里面的 this 是本视图
        console.log(this.model());
    });

    this.listenToDelay('view-detail', 'rendered', function(){
        console.log(this.$el);
    });
}
```

有两个监听事件的方法：`listenTo` 和 `listenToDelay`，
listenToDelay 用来监听子视图，因为当消息监听执行时，子视图可能还未实例化，使用该方法能够将监听延迟到子视图实例化之后执行。

## 消息

消息用于部件间数据传递

```
// 发布消息
this.pub('custom-msg', 'helloworld');

// 订阅消息
this.sub('custom-msg', function(msg){
    console.log(msg);
});
```

所有的消息订阅应放到方法 `subscribe` 中：

```js
subscribe: function(){
    this.sub('custom-msg', function(msg){
        console.log(msg);
    });

    this.sub('msg2', function(){

    });
}
```

## 子视图

调用方法 `this.view` 可以开启一个子视图

```
this.view(viewName, viewInstance);
```

第一个参数是视图的名称，建议命名规则："view-*"，第二个参数是 view 的实例

```
var viewName = 'view-editView';
this.view(viewName, editView({
    host: this.$('.fn-edit'),
    sandbox: this.options.sandbox,
    _name: viewName
}));
```

实例化子视图时，应该总是传入两个配置项：sandbox 和 _name，前者传递当前部件的沙箱，后者则是该子视图的名称。

**声明子视图**

可以配置 `views` 属性声明视图，而不用自己手动实例化

```
views: {
    'view-editView': {
        initializer: editView,
        options: {
            host: '.fn-edit'
        }
    }
}
```

> **注意**
>
> 通过声明方式添加子视图时，参数中不用传入 sandbox 和 _name

通过配置的方式声明子视图，子视图将会在主视图添加到DOM树**之前**进行实例化、渲染及可能的数据绑定。

如果在子视图中进行了数据绑定，并且子视图在主视图的DOM子孙节点中，那么在稍后主视图的数据绑定中，会再次对子视图的元素进行数据绑定，这样就造成了重复绑定，因此，这里需要对 KendoUI 的源代码进行一些修改，添加识别已经绑定的元素的代码，避免重复绑定。

kendo.binder.js

```
if(!$(childrenCopy[idx]).hasClass('k-bind-block'))
    bindElement(childrenCopy[idx], source, roles, parents);
```

**监听子视图事件**

```
this.listenToDelay('viewName', 'eventName', function(data){

});
```

**在子视图间切换显示状态**

配置 `switchable`，指定在哪些子视图间切换显示状态，在这些子视图中，同一时间只有一个视图处于显示状态。

```
defaults: {
    switchable: ['view1', 'view2']
}
```

可以在 views 中配置一个特殊的名称：active，以指定哪个视图是默认显示的视图。

```
views: {
    active: 'view1',
    view1: {
        initializer: editView,
        options: {
            host: '.edit',
            data: { foo: 'bar' }
        }
    },
    view2: ...
}
```

通过 this.active() 获取当前活动的视图

当视图中某个子视图设为活动时，会触发该视图的 `activeView` 事件，也会触发子视图的 `active` 事件

## 窗口

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

## AOP

## 动作触发器

## 工具条

## 共享视图模型

## 布局自适应

当视图设置了固定尺寸时，调整窗口大小，不会重计算视图的大小


