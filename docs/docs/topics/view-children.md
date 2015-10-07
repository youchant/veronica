# 部件的复用：子视图与子部件

在视图中复用其他部件（widget）有两种模式：使用视图方式和使用部件方式

## 使用子视图

这种模式是将其他部件作为普通视图引用，通过视图的创建方式创建，并作为该视图的子视图

它的优势是可以在视图中访问到该视图的实例，可以直接通过事件进行通信

由于创建视图需要一个构造器（或创建函数），所以这种模式需要获取视图的定义，通常该视图的定义放置在另一个文件中，
因此会造成该视图文件与当前文件存在依赖关系，也就无法使用按需加载，这样会带来额外的加载耗时

> 其实也可以在创建子视图的时候按需去获取该视图的定义文件，但这样会造成后续异步代码的产生，不利于代码的维护和编写，因此暂时不提供异步加载的方式

这种模式适用于外部部件与该视图联系比较密切并且依赖比较确定的情况，例如主表单中的子表单，多个选项卡中的各个独立选项内容等场景

**自动创建子视图**

你可以在视图定义中设置 `views` 配置项，设置该视图有哪些子视图，这样当 `autoCreateSubview` （默认为 true）参数为`true`时，视图就会在渲染时（插入DOM树**之前**）自动初始化这些视图。
否则，你需要调用`_createSubviews`方法手动初始化这些视图

> 子视图名称的建议命名规则："view-*"

```js
var SubView = {
    template: '<strong>SubView!!</strong>'
};

var MainView = app.view.define({
    defaults: {
        autoCreateSubview: false
    },
    views: function() {
        return {
            'view-sub': {
                initializer: SubView,
                options: {
                    el: this.$('.sub')
                }
            }
        };
    },
    rendered: function () {
        this._createSubviews();
    }
});
```

**`view` 方法**

该方法用于获取或手动创建单个子视图，在获取子视图时，如果该视图不存在，则读取 views 配置中同名的配置进行创建

```js
// 获取视图
var sv = this.view('subview');
sv.render();

// 创建视图
var sv = this.view('subview', {
    initializer: Subview,
    options: { }
});
```

> 创建子视图时，会在 options 中自动附件视图名称（_name）和当前视图的 sandbox

**在子视图间切换显示状态**

配置 `switchable`，指定在这些子视图中，同一时间只有一个视图处于显示状态，设置 `activeView` 参数，指定默认显示的子视图

```
defaults: {
    activeView: 'view1'
},
switchable: ['view1', 'view2']
```

通过 `active()` 获取当前活动的视图

当视图中某个子视图设为活动时，会触发该视图的 `activeView` 事件，也会触发子视图的 `active` 事件

**监听子视图事件**

```
this.listenToDelay('viewName', 'eventName', function(data){

});
```

## 使用子部件

在视图中开启一个新的 widget，使用 `startWidgets` 方法

```js
this.startWidgets({
    name: 'sub-widget',
    options: {
        host: '.sub-widget'
    }
})
```

子部件是在每次创建的时候去加载部件定义，因此可实现按需加载，但相互通信只能通过消息传递