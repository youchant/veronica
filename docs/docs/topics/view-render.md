# 视图渲染

视图渲染（render）（或呈现）是将模板转化成HTML片段并添加到DOM树中的过程，
它是视图的一个必不可少的行为，这个行为使视图元素呈现到界面上。

与渲染相关的传入参数包括：`autoRender`、`autoCreateSubview`、`_place`、`host`，
继承于 Backbone.View 的参数：`el`、`className`、`tagName`、`attributes` 等

与之相关的自定义项包括：`templateUrl`、`template`、`rendered`

与之相关的方法包括：`render`（内部还使用了一些私有方法：`_render`、`_refresh`、`_activeUI`，一般用户不用自己主动调用）

## 视图的DOM元素

在[Backbone View](http://backbonejs.org/#View-el)中，DOM元素的设置有两种方式：

* 显示指定（使用`el`）
* 自动生成（使用`tagName`、`className`、`attributes`等控制生成）

对于第二种方式，这里扩展了一种机制，考虑到自动生成的DOM元素还未插入到页面DOM树中，因此你可以配置 `host` 和 `_place` 两个参数，
前者传入选择器或jQuery元素对象，代表你的视图DOM元素插入的父级，而`_place`的可选值为 0 或 1，分别代表是 append 方式还是 prepend 方式

## 如何渲染

有三种设置方式决定了视图如何进行渲染：

### 使用 templateUrl

如果设置了 templateUrl 配置项（使用 string 或 function），那么应用程序会认为该视图的模板来源于远程路径，
因此会在 render 方法调用的时候，自动从 templateUrl 的结果地址请求 html 片段作为该视图的DOM片段

```js
var View = app.view.define({
    templateUrl: '/demo/getTemplate?id=1'
});
var theView = new View({
    text: 'Hello World!'
});
```

### 使用 template

如果设置了 template 配置项，那么应用程序会将该设置项作为视图的模板，并且默认它是一个 underscore 的模板片段

在解析时会传入视图的 options 参数进行模板解析（在模板中使用 `data.*` 访问），最终解析后的结果就是视图的DOM片段

```js
var View = app.view.define({
    template: 'The Text: <%= data.text %>'
});
var theView = new View({
    text: 'Hello World!'
});
```

### 内联 HTML

如果视图是在已有的DOM元素上初始化（设置 el），并且没有显式设置 template 和 templateUrl，那么视图会在该元素上进行模板解析和渲染

```html
<div class="widget">
    The Text: <%= data.text %>
</div>
```

```js
var View = app.view.define();
var theView = new View({
    el: '.widget',
    text: 'Hello World!'
});
```

## 控制渲染行为

**自动渲染**

通过 `autoRender` 参数可控制是否在视图初始化完成后就立即进行渲染，默认为 `true`，如果设置为 `false`，那么接下来你应该
手动调用 `render` 方法进行渲染

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

**渲染事件**

* rendering  
  模板渲染中，表示模板构造完毕，如果有 `host`，则还未添加到DOM树中
* rendered  
  模板渲染完毕，表示模板构造完毕，并已添加到DOM树中


渲染后视图中的状态 `isRendered` 会被更改为 `true`

另外还有个参数`autoCreateSubview`用于控制渲染后是否自动创建子视图，这将在讨论视图的子级视图的文档中详细阐述


