# 视图中的数据

我们提倡尽可能的操作数据，以数据驱动运作视图，避免直接操作DOM，为了实现这个目的，视图提供
了两种方式进行数据的处理和操作：

* 使用数据属性
* 使用视图模型

## 数据属性

数据属性是以键值对简单存储数据的模式，使用 `attr` 方法进行获取或设置

```js
// 设置
this.attr('number', 'No.123')

// 获取
var num = this.attr('number')
```

**定义有数据源的数据属性**

有时数据属性的数据来源于其他数据源，并且当数据源数据变化时，属性需要同步更新，这时需要使用**属性定义**进行
精细化控制

```js
this.defineAttr({
    name: 'number',
    source: 'querystring',
    sourceKey: 'user_num',
    setup: 'rendered'
})
```

以上代码定义了一个 number 属性，它的数据来源于浏览器的 url 查询字符串里的 'user_num'，并且在 `rendered` 事件触发时进行设置

> 属性数据与数据源数据是单项绑定，因此，数据源数据变化会引起属性数据变化，但属性数据变化不会引起数据源
数据变化

**属性事件**

属性的变更会触发 `attr-changed` 事件，你可以选择监听该事件实现当属性变化时做某些处理的逻辑，另外，
视图也提供了一个可重写的方法去定义属性变更时的操作

```js
attrChanged: {
    // 不同的属性变更定义不同的处理方法
    'number': function (value) {
        this.$('.text').html(value);
    }
}

// 或者
this.listenTo(this, 'attr-changed', function(name, value){
    if (name === 'number') {
        
    }
})
```

## 视图模型

MVVM 是迄今为止界面编程中较为高效的一种模式，它较好的实现了界面与模型的双向绑定，降低了界面编程的复杂度

现在业界有许多成熟的MVVM库（或框架），视图提供了一种机制使用这些库作为视图的MVVM驱动，需要使用者重定义视图中的一些方法，
这点会用专门的文章进行说明

**视图模型对象**

视图模型默认是一个空对象，默认情况下，渲染完毕后，如果视图模型不为空，则会进行数据绑定。

如果不设置视图模型，则默认不会进行数据绑定，这个行为可以通过 `bindEmptyModel` 参数进行配置，如果设置为 `true`，则即使没有设置视图模型，在渲染完毕后，都会进行数据绑定。

调用 `model` 方法，可获取或设置视图模型。

```js
var View = app.view.define({
    staticModel: function() {
        return {
            foo: 'bar'
        };
    },
    initAttr: function(){

        this.model({}, false);

        // 设置 viewModel
        this.model({
            foo: 'bar'
        }, false);

        // 获取 viewModel
        var viewModel = this.model();
    }
});
```

**绑定**

绑定即是模型与界面建立关联，每次使用 `model` 设置新的视图模型后，会自动将该模型与视图DOM进行绑定，以使当前界面显示与视图模型一致，
如果不想设置时立刻绑定，则传入一个 `false` 的参数

> 当模型设置发生在视图渲染之前时（渲染时会进行视图绑定），例如在 `initAttr` 和 `init` 方法中设置视图模型，则必须设置自动绑定 `false`，否则会触发两次视图绑定

**静态模型**

设置视图模型会替换掉原来的视图模型，有时视图模型中的某些属性是存在于所有模型中的，这时可将这些属性定义到静态模型中，使用 `staticModel` 配置项

**事件**

modelBound

绑定视图模型完毕后会触发 `modelBound` 事件，这通常表明用户界面的主要呈现工作已经完成，我们可在模型绑定之后做一些后续操作，例如异步读取数据等
