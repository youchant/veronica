# 开始编写应用程序
  
通过这个教程，你可以基于 veronica 库创建一个可用的 web 应用程序，并简单了解该应用的执行逻辑

在我们的应用程序中，我们需要一个 HTML 页面，
最简单的情况下，它会是如下的样子： 

```
<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Hello-veronica</title>
</head>
<body>
    <div data-ver-role="hello-veronica" data-options='{ "hi": "Hello", "name": "Veronica!"  }'>
        <%= data.hi %> <%= data.name %>
    </div>
</body>
</html>
```

只是一个符合html5标准的 页面，里面有个 `div`。

* `data-ver-role` 指定该元素的部件名称
* `data-options` 指定实例化该部件传入的配置项

接下来引入 RequireJS，通常放在页面底部

> 我们所有的JS文件都按照AMD/UMD风格编写，同时使用 RequireJS 加载

```
<script src="../bower_components/requirejs/require.js"></script>
```

编写自定义的代码

```
    <script>
        require(['require-conf'], function (config) {
            // 设置 require.config
            require.config(config('../bower_components'));

            require(['veronica'], function (veronica) {

                // 创建 app
                var app = veronica.createApp();

                // 创建 widget: hello-veronica
                app.widget.register('hello-veronica', function (options) {
                    var app = options.sandbox.app;
                    var View = app.view.define();
                    return new View(options);
                });

                // 解析界面
                app.parser.parse();
            });

        });
    </script>
```

这里为了便于维护和复用，我们把 requirejs 的配置放到单独的文件中进行管理，命名为 require-conf，它类似与
下面的样子：

```
// requirejs
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(function () {
            return factory();
        });
    } else if (typeof exports === 'object') {
        // Node.js
        module.exports = factory();
    } else {
        // Browser globals
        root.Backbone = factory();
    }
}(this, function () {

    return function (framePath) {
        require.config({
            debug: true,
            paths: {
                'underscore': framePath + '/underscore/underscore',
                'jquery': framePath + '/jquery/jquery',
                'eventemitter': framePath + '/eventemitter2/lib/eventemitter2',
                'text': framePath + '/requirejs-text/text',
                'css': framePath + '/require-css/css',
                'normalize': framePath + '/require-css/normalize',
                'css-builder': framePath + '/require-css/css-builder'
            },
            shim: {
                'underscore': { 'exports': '_' },
                'jquery': { 'exports': 'jquery' }
            },
            packages: [{ name: 'veronica', location: '../lib' }]
        });
    }

}));

```

这种写法与标准的AMD模块有些不同，称之为 [UMD](https://github.com/umdjs/umd) 模式，它能兼容 RequireJS、NodeJS和普通的全局浏览器
环境，这便于我们在 Grunt 中（NodeJS环境）对该配置文件进行读取

由于 requirejs 配置文件的单独放置，因此我们需要在配置文件真正请求并加载后，才能编写应用相关的代码。

require-conf 文件里面通过 package 方式配置 veronica 的路径，否则会出现 404 错误，如下所示：

```js
packages: [{
    name: 'veronica', location: framePath + '/veronica/lib'
}
```

> 由于框架项目是个多文件项目，因此如果你直接引用 `lib` 文件夹里的源代码，那么应该使用 packages 配置项，
而不是 paths，这样整个项目会被当成一个包加载，并能正确的解析文件之间的依赖关系。其他多文件的工程项目，也应
使用这种方式配置。

**几个API**

* createApp

创建应用程序是最开始做的工作，这个方法接收两个参数：应用程序名和应用程序配置项，多次调用该方法会销毁上一个app，并创建新的app

* app.widget.register

注册一个部件

* app.parser.parse

解析界面，该方法会查找界面上声明的widget，并实例化它


以上代码运行的结果是在界面上呈现了一段简单的字符串：  hello veronica

**完整的代码**

```html
<!DOCTYPE html>
<html>
<head>
    <title>simpe page</title>
    <meta http-equiv="content-type" content="text/html;charset=UTF-8" />
    <style>
        /*为了避免界面一开始闪烁*/
        [data-ver-role] {
            display: none;
        }
    </style>
</head>

<body>
    <div data-ver-role="hello-veronica" data-options='{ "hi": "Hello", "name": "Veronica!"  }'>
        <%= data.hi %> <%= data.name %>
    </div>
    <script src="../bower_components/requirejs/require.js"></script>
    <script>
        require(['require-conf'], function (config) {
            // 设置 require.config
            require.config(config('../bower_components'));

            require(['veronica'], function (veronica) {

                // 创建 app
                var app = veronica.createApp();

                // 创建 widget: hello-veronica
                app.widget.register('hello-veronica', function (options) {
                    var app = options.sandbox.app;
                    var View = app.view.define();
                    return new View(options);
                });

                // 解析界面
                app.parser.parse();
            });

        });
    </script>
</body>
</html>
```

# 练习：更规范的程序

在前面完成的基础示例上，你需要搭建一个更规范，更具扩展性的应用程序


## 目录结构

把 JavaScript 代码写到 HTML 文件里面不是一种最佳实践，将脚本放到单独的文件中，命名为 `main.js` ，它是应用的启动脚本，代码如下：

```js
// 创建应用程序
var app = veronica.createApp({
    name: 'test-app',
    homePage: 'home'
});

// 启动应用程序
app.launch().done(function(){

	// 添加一个名为 'home' 的页面
	app.page.add({
		'home': {
			name: '起始页',
			layout: 'default',
			widgets:[{
				name: 'hello-veronica',
				options: {
					host: '.container',
					_source: 'default'
				}
			}]
		}
	});

	app.layout.add({
		'default': '<div class="container"></div>'
	})

	// 启动页面
	app.page.start(true);
});
```

上面代码展示了应用启动后做的最简单的工作，我们添加了一个页面，添加了一个布局，然后进行页面启动，这里 `page.start` 会进行布局的初始化。

## 定义部件

我们定义一个名为 hello-veronica 的部件，在 widgets 目录下，创建一个文件夹，命名为：hello-veronica

创建部件的路径由 options._source 配置项决定，该配置项设置应用程序应该从哪个'源'加载该部件，如果你不设置它，那么将会采用默认的源：default，
该源指向的路径是 widgets 目录，如果你把部件放置在其他文件夹，你应该使用不同的源，或者更改默认源的路径。

### 配置部件源

在require-conf的配置里，你可以定义不同的源：

```js
sources:{
	'default': '../widgets/test',
	'others': '../widgets/test2'
}
```

这样当你使用在 test2 文件夹下放置的部件时，你就可以设置 _source 的值为 others。

**通过模块引入源**

当加载某个模块时，会默认添加该模块下的 widgets 文件夹作为一个源，并且源名称为模块的名称

### 编写 main.js

在创建好的 hello-veronica 文件夹里，创建一个 main.js 文件，作为该部件的入口文件，就像这样：

```js
define([
	// 设置依赖项
], function(){
	return function(options){
		// 编写你的代码
		// ...

		// 返回一个对象
		return { };
	};
})
```

这是一个普通的AMD模块，但需要注意的是，该模块必须返回一个方法，并且该方法必须返回一个对象，
这是因为当每个部件加载完毕后，就会尝试执行这个方法，并将该方法返回的对象作为部件对象实例（widget object），这样可在应用程序中对该
部件进行相应的操作。

在这个方法里，传入了个配置对象，你可以通过控制台查看该配置对象里究竟包含哪些属性，可以利用它完成许多任务。

```js
define([
	// 设置依赖项
], function(){
	return function(options){
		var sandbox = options.sandbox;
		var app = sandbox.app;
		var $ = app.core.$;

		$(options.host).html('<h1>hello veronica</h1>');

		sandbox.emit('notify', 'I do something');

		return { };
	};
})
```

上面的代码做了个简单的任务，在宿主元素（host）上呈现 hello veronica 的标题，并广播一个名为 notify 的消息。

> 这里有个沙箱（sandbox）的概念，每个部件的沙箱都是完全独立的，你可以把它看作是个工具箱，提供了你完成编程任务的所有底层接口。



#### 部件间消息传递

通过 sandbox 的相关方法可实现部件间通信，这在实际应用中比较常见，例如在某个部件内选择不同的数据项，对应的其他部件的信息发生不同的变化。

```js
// widget A
sandbox.emit('selectedChange', id);

// widget B
sandbox.on('selectedChange', function(id) {
	// do something
})

```

### 引入模板

上面的代码稍微有一些问题，我们将HTML直接写到了JS代码里，不利于维护，根据较好的实践，我们把这段HTML代码提取出来放到单独的文件里。

我们在 hello-veronica 创建一个文件夹 templates，在它里面创建个文件：index.html

```html
<div class="hello-veronica">
	<h1>hello veronica</h1>
</div>
```

在 main.js 里面，我们把它当作文本引入，这里需要用到 RequireJS 的 text 插件。

```js
define([
	'text!./templates/index.html'
], function(tpl){
	return function(options){
		var sandbox = options.sandbox;
		var app = sandbox.app;
		var $ = app.core.$;

		$(options.host).html(tpl);

		sandbox.emit('notify', 'I do something');

		return { };
	};
})
```

我们这样做后，还可以进一步优化，例如通过参数传递文本的值

* templates/index.html：

```html
<div class="hello-veronica">
	<h1><%= data.header %></h1>
</div>
```

* main.js：

```js
define([
	'text!./templates/index.html'
], function(tpl){
	return function(options){
		var sandbox = options.sandbox;
		var app = sandbox.app;
		var $ = app.core.$;
		var _ = app.core._;

		$(options.host).html(_.template(tpl, options));

		sandbox.emit('notify', 'I do something');

		return { };
	};
})
```

* page config：

```js
 {
		name: '默认页',
		layout: 'default',
		widgets:[{
			name: 'hello-veronica',
			options: {
				host: '.container',
				_source: 'default',
				header: 'hello veronica'
			}
		}]
 }
```

### 引入样式表

创建文件夹 styles，在内创建文件 index.css

```css
.hello-veronica h1{
	color: green;
}
```

> css内的所有选择器都应加上当前部件的类名作为范围限定，否则会出现部件间样式的相互干扰，
一种更方便维护样式表的方式是使用一些CSS预处理语言，如 less 或 sass。

引入 css 文件的方式是使用 RequireJS 的 css 插件，由于该插件会将css直接添加到页面内的，所以不需要再做额外的工作。

```js
define([
	'text!./templates/index.html',
	'css!./styles/index.css'
], function(tpl){
	return function(options){
		var sandbox = options.sandbox;
		var app = sandbox.app;
		var $ = app.core.$;
		var _ = app.core._;

		$(options.host).html(_.template(tpl, options));

		sandbox.emit('notify', 'I do something');

		return { };
	};
})
```

## 切换页面

刚刚我们搭建了一个简单的页面，并且这个页面是我们的默认页，下面我们再添加一个页面，这个页面拥有不同的部件。

```js
app.addPage({
	'other-page': {
		name: '另一个页面',
		layout: 'default',
		widgets:[{
			name: 'other-widget',
			options: {
				host: '.container',
				_source: 'default'
			}
		}]
	}
});
```

我们可以更新下 hello-veronica 部件，实现点击一个按钮，跳转到刚添加的那个页面

```html
<div class="hello-veronica">
	<h1>hello veronica</h1>
	<button class="btn-switch">跳转到</button>
</div>
```

```js
define([
	'text!./templates/main.html',
	'css!./styles/index.css'
], function(tpl){
	return function(options){
		var sandbox = options.sandbox;
		var app = sandbox.app;
		var $ = app.core.$;
		var _ = app.core._;

		$(options.host).html(_.template(tpl, options));

		$(options.host).on('click', '.btn-switch', function(e){
			app.page.change('other-page');
		});

		sandbox.emit('notify', 'I do something');

		return { };
	};
})
```

如果我们将页面的切换和浏览器地址栏路由的变化关联起来，那么会更有意义一些，完成这类工作有一些现成的库供我们使用，例如 Backbone 里面的
Router，veronica 集成了它，你可以通过 `app.core.Router` 访问到。

## 使用视图

视图能够帮助你更好的组织界面逻辑，并且使返回的部件对象更有意义，而不是像上面那样的空对象，上面的代码用视图改写如下：

```js
define([
    'text!./templates/index.html',
    'css!./styles/index.css'
], function (tpl) {
    return function (options) {
        var app = options.sandbox.app;

        var View = app.view.define({
            template: tpl,
            defaults: {
                header: 'Hello Veronica'
            },
            events: {
                'click .btn-switch': 'switchHandler'
            },
            switchHandler: function () {
                app.page.change('other-page');
            },
            listen: function () {
                this.listenTo(this, 'rendered', function () {
                    // 类似于 sandbox.emit
                    this.pub('notify', 'I do something');
                });
            }
        });

        return new View(options);
    };
});

```

当我们使用视图后，会自动帮我们创建根元素，因此模板可以进行精简：

```html
<h1><%= data.header %></h1>
<button class="btn-switch">跳转到</button>
```


视图有许多丰富的特性，将在后面的内容中详细讲解

## 扩展

框架默认依赖了一些基础库：jQuery、Underscore，这样你可以完成一些基础的任务，例如DOM操作，异步编程，数组字符串操作，Ajax请求等，对于一些
更高级的需求，你可以编写一些扩展来扩充你的应用程序。

如下方式，为 app 对象扩展一个 `sayHello` 方法：

```js
app.addExtension(function(app){
	app.sayHello = function(){
		console.log('Hello World');
	};
});
```

`app.addExtension` 方法可以传递一个方法或一个数组去扩展这个应用程序，这是扩展应用程序的最常用模式。

你也可以在创建应用时传入扩展的链接，进行扩展声明，在 `launch` 时就会加载这个扩展

```js
app.createApp({
    extensions: ['veronica-mvc']
});
app.launch();
```

这种情况主要用于加载一个作为外部项目的扩展

## 项目组织

随着我们项目的规模越来越大，良好的项目组织显得尤其重要，在我们的项目中，我们可以把刚才提到的几个概念，单独提取出来进行放置，例如可以把
页面配置放到单独的文件夹，扩展放到一个文件夹，布局放到单独的文件夹，并且每一种配置使用独立的文件存放，使结构更清晰，更利于多人协作。

另外你应该在功能越来越多的时候，把功能按照一定的粒度划分为模块，每个模块维持自己那个体系内的配置、部件等，各模块之间松耦合，典型的目录结构如下所示：

```
app/
├── modules/   该目录放所有模块
│   └── basic/   basic 模块
│       ├── config/
│       ├── extensions/
│       ├── layouts/
│       ├── subpages/
│       ├── widgets/
│       └── main.js
├── styles/    站点样式
│   └── index.css
│── vendor/    第三方库
│   ├── veronica/
│   ├── underscore/
│   ├── jquery/
│   ├── requirejs/
│   └── ……/
│── main.js
│── index.html
└── require-conf.js
```

当你根据生成器建立好默认的项目时，就会有这种组织风格实践的例子，你可以看一看并理解其中的结构关系。




