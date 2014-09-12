# FormView

当一个视图主要是呈现表单或详情页面时，使用 `app.mvc.formview`，以下是一个简单的示例：

```js
var sandbox = options.sandbox;
var app = sandbox.app;

var AppView = app.mvc.formView({
    tag: 'form',
    className: 'form-horizontal',
    template: tpl,
    defaults: {
		data: { name: 'hello' }, 
        isLocal: true,
        autoAction: true
    },
    validation: {
        rules: {
            equal: function (input) {
                if (input.is("[name=name]")) {
                    return input.val() === "Tom";
                }
                return true;
            }
        },
        messages: {
            equal: 'must equal Tom'
        }
    },
    initAttr:function(){
        this.baseModel = {
            id: '2'
        }
    },
    saveHandler: function (e) {
        e.preventDefault();
        this.save();
    },
    resetHandler: function () {

    }
});

return new AppView(options);
```

> 注意
> 
> FormView 重写了基本方法 `init`，因此如果要继承并重写 init 方法，
> 应在 init 方法内调用 `app.mvc._formView.init`

表单的操作包括以下几个：

* GET 获取
* RESET 重置
* SAVE 保存

获取和重置执行的操作是一样的，如果是单纯显示详情的表单，那么将不会使用重置和保存操作。

## 获取（重置）数据

表单（或详情）界面的首要功能就是呈现数据，通过调用表单的 read 方法实现：

```js
this.read();
```

在界面渲染完成（即 rendered 事件触发）后，默认的会自动调用 read 方法，你可以通过设置配置项 autoRead 为 false 阻止这种行为

根据获取数据的目的可划分为两种情况，一种是获取表单的初始值（默认值），
一种是根据参数获取表单实体的值。典型的应用场景是：当表单用于新增时，则获取表单的初始值，可能包括一些默认值、下拉列表的值等，
当表单用于编辑时，则根据特定参数（通常是ID），获取指定数据实体的值。

```js
defaults:{
	url:{
		defaults: '/Foo/Defaults',
		read: '/Foo/Get'
	},
	state: 'add' // or 'edit',
	id: '',
	data: {}
}
```

这里涉及两个配置参数：url 和 state, url 的 defaults 路径用于获取默认值， read 路径则根据 id 或 data（id 优先级更高），获取
指定的数据。

配置 state 用于标识该表单是用于“新增”还是“编辑”，这样用于决定是使用 defaults 还是 read

**不同的数据源**

按照数据的来源划分，获取数据又可分为获取本地数据源的数据和获取远程数据源的数据，通过配置参数 isLocal 实现

```js
defaults:{
	isLocal: false
}
```

默认采用的是远程数据源的数据，这样就按照上面所述的方法请求数据，如果 isLocal 设置为 true，那么将不会请求远程，
直接会将 data 配置项作为表单的数据对象，无论是 add 或 edit。

**后端数据转换**

从设计的角度，我们应尽量避免在前端进行数据的转换，但根据具体呈现的需要，有时又难以避免，因此，如果你配置 schema 配置项，
则可以对后端获取的数据进行转换以满足前端呈现的需要。

```js
defaults:{
	schema: {
		'data': 'Data', // 前端字段：后端字段
		'name': 'Name'
	}
}
```

以上是传入一个映射表，将后端字段映射成前端字段，当然你也可以传入一个函数，自定义转换的逻辑。

**重置数据**

通过调用 reset 方法可使用表单的重置功能，不同于浏览器默认的重置行为，这里定义的重置是恢复到后端数据已保存的状态，
因此实际进行的操作就是获取数据，你也可以重写 reset 方法添加自己的重置逻辑。

## 保存数据

使用方法 save 能够将数据提交给后端，在保存的时候，会调用 validate 方法，进行前端验证，如果验证通过才提交。

```js
this.save();
```

根据 state 的不同，会调用不同的后端接口，以针对不同的业务场景：

```js
defaults:{
	url:{
		add: '', // state为 'add'
		modify: '',  // state 为 'edit'
	}
}
```

**自定义验证**

默认的你可以通过HTML5的验证标签进行验证，但你也可以定义自己的验证方法，通过重写 validation 属性实现。

```js
validation: {
    rules: {
        equal: function (input) {
            if (input.is("[name=name]")) {
                return input.val() === "Tom";
            }
            return true;
        }
    },
    messages: {
        equal: 'must equal Tom'
    }
}
```

**保存本地数据源**

如果保存的是本地数据，则不会做实际的保存动作，但你可以通过监听 saved 事件进行自己的保存动作。

## 表单的布局

表单布局可采用两种方式：表格布局和栅格布局

### 表格布局

用表格进行界面布局一直是一个不太推崇的方案，但我们也没必要一点也不使用，有时也要分别对待，
表格用于表单的布局有时是特别方便的，尤其是表单字段很多的时候，所以这也成为我们的一个布局方案。

表格布局相对来说较为固定和简单，初学者可快速使用表格建立合理的布局，这里我们就不详述。

### 栅格布局

我们以 Bootstrap 的栅格为例，在官方的示例中，我们可以看到一些表单布局的例子，这里我们讨论当一行放置
多个输入框的情况。

```html
<fieldset>
    <legend>HTML 表单元素</legend>
    <div class="form-group">
        <label class="col-sm-2 control-label">普通文本：</label>
        <div class="col-sm-4">
            <input type="text" name="required" value="" class="form-control" />
        </div>
        <label class="col-sm-2 control-label">邮箱输入：</label>
        <div class="col-sm-4">
            <input type="email" name="email" value="" class="form-control" />
        </div>
    </div>
    <div class="form-group">
        <label class="col-sm-2 control-label">URL输入：</label>
        <div class="col-sm-4">
            <input type="url" name="url" value="" class="form-control" data-bind="value: url" />
        </div>
        <label class="col-sm-2 control-label">数字输入：</label>
        <div class="col-sm-4">
            <input type="number" data-role="numerictextbox" max="5" min="1" name="numeric" value="" />
        </div>
    </div>
</fieldset>
```

因为 Bootstrap 栅格默认是 12列，以上示例的则是每行放置两个输入框，并且标签与输入框在的情况，如果要考虑响应式布局，可额外增加
其他的栅格类，但通常可不必这么做。

## 表单组件

HTML规范定义了很多表单组件，这些组件大多数受到所有浏览器的支持，同时 KendoUI Core 也对一些组件进行
了增强，以下对这些组件进行罗列。

> 注意
>
> * 类 `form-control` 是让组件能够使用 Bootstrap样式
> * 属性 `data-role` 是为了支持 KendoUI 的 Widget 初始化

### 普通文本框

```html
<input type="text" name="" value="" class="form-control" />
```

### 邮箱输入

```html
<input type="email" name="email" value="" class="form-control" />
```

### URL输入

```html
<input type="url" name="url" value="" class="form-control" />
```

### 数字输入

```html
<input type="number" data-role="numerictextbox" max="5" min="1" name="numeric" value="" />
```

### 滑动块

```html
<input data-role="slider" data-bind="value: slider" name="range" value="" id="" />
```

### 日期选择

```html
<input type="date" data-role="datepicker" value="" />
```

### 日期时间选择

```html
<input data-role="datetimepicker" name="datetime" value="" id="" />
```

### 时间选择

```html
<input type="date" data-role="timepicker" value="" />
```

### 搜索框

```html
<input type="search" class="form-control" name="search" value="" id="" />
```

### 颜色选择

```html
<input type="color" data-role="colorpicker" name="color" value="" />
```

### 组合框

```html
<select data-role="combobox">
    <option value="volvo">Volvo</option>
    <option value="saab">Saab</option>
    <option value="mercedes">Mercedes</option>
    <option value="audi">Audi</option>
</select>
```

### 下拉列表

```html
<select data-role="dropdownlist">
    <option value="volvo">Volvo</option>
    <option value="saab">Saab</option>
    <option value="mercedes">Mercedes</option>
    <option value="audi">Audi</option>
</select>
```

### 多选框

```html
<select multiple="multiple" data-role="multiselect"></select>
```

### 自动填充

```html
<input data-role="autocomplete" autocomplete="on" />
```

## 表单的验证

HTML5规定的表单验证的相关方法，要支持表单验证，首先要为每个输入框配置 `name` 属性，
验证的类型包括以下几种：

### 属性关键字

* required
* maxlength

### 组件类型

使用 `tpye="xxx"`，特定类型的组件自身带有一些特定的规则，例如：

* email
* url

### 正则表达式

使用 `pattern="^xxxx$"` 指定。

常用的正则表达式：

* 是否汉字：

		^[\u4e00-\u9fa5]+$

* 是否英文：

		^[0-9a-zA-Z\_]+$

* 是否英文+数字：

		^[0-9a-zA-Z\_]+$

* 身份证验证15~18位：

		^(\d{15}$|^\d{18}$|^\d{17}(\d|X|x))$