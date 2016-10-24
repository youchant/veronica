# 视图 View

视图是界面呈现的基本单元，它包括构成某块区域界面的界面模板（html）、界面逻辑（js）、界面样式（css）。
在 Veronica 中，视图是一个核心概念，以 Backbone.View 为基础，在这之上封装并加入自己的方法，可以说它是一个**扩展的 Backbone View**。

> **注意**
>
在经典的MVC模式中（如Spine.js、ASP.NET MVC、yii 等），视图更多的表示界面模板，而界面逻辑一般称为控制器，我们采用的是 Backbone 的设计理念，用视图指代控制器。

回顾一下，Backbone 中的视图定义及实例化方式：

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

它的特点有：

* 内置了渲染的逻辑
* 支持属性、数据模型与数据绑定（MVVM）
* 扩展了事件与消息
* 子视图管理
* 对话框支持