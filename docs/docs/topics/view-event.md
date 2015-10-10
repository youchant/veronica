# 事件驱动的视图

与用户交互的界面编程天然是一个事件驱动模型，并且利用事件可较好的组织异步代码

在视图中，有几种方式的事件（或与之相似）模型

## DOM 事件

处理 DOM 事件，由于继承于 Backbone.View，因此也能使用它所使用的事件代理模式

```js
var View = app.view.define({
    events: {
        'mousedown .item': 'itemPressHandler' 
    },
    itemPressHandler: function(e) {
        
    }
});
```

在此基础上，视图提供了一些语法糖，能够快捷的监听 DOM 事件

**action**

将 `autoAction` 参数设为 `true`, 在DOM元素上添加 `data-action` 属性可声明点击该元素应执行的行为

```html
<button data-action="save">Save</button>
```

```js
var View = {
    saveHandler: function (e) {
        // 点击后执行
    }
};
```

## trigger/on

自定义事件通信采用 Backbone.View 自带的[事件机制](http://backbonejs.org/#Events)

```js
// 触发事件
this.trigger('rendered', data, msg);
```

**监听事件**

所有的事件监听的代码统一写到方法 `listen` 中，方便进行管理：

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

## pub/sub

发布者订阅者模式适用于部件间数据传递，它与自定义事件的一个较大不同点则是订阅者不需要知道发布者的任何信息，因此是低耦合的，
而事件监听者则需要在视图中引用事件触发者的实例对象

```
// 发布消息
this.pub('custom-msg', 'helloworld');

// 订阅消息
this.sub('custom-msg', function(msg){
    console.log(msg);
});
```

所有的消息订阅的代码统一写到方法 `subscribe` 中，方便进行管理：

```js
subscribe: function(){
    this.sub('custom-msg', function(msg){
        console.log(msg);
    });

    this.sub('msg2', function(){

    });
}
```
