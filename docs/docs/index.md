
# Veronica 

<small>v0.2.3</small>

Veronica 是一个Web前端开发库，用于以模块化的方式开发 Web 应用，当你尝试完成以下任务的时候你可以考虑使用它：

* 构建大型单页面 Web 应用
* 多页面 Web 站点中 JavaScript 的模块化组织
* 与多种第三方库写作，编写富交互页面

以及其他你能想到的应用方式

## 依赖库

库目前集成了 [Backbone](http://backbonejs.org/) 的 View 和 Router 作为视图基类和路由，以及 [artDialog](http://aui.github.io/artDialog/) 作为对话框，同时额外需要以下依赖：

* jQuery（1.7.0+）或 Zepto
* Underscore（1.4.0+）或 Lodash

另外，十分推荐使用 [RequireJS](http://requirejs.org/) 来管理复杂的项目，并且也推荐你使用 [Bootstrap](http://getbootstrap.com/) 作为界面库

同时本库可并不限于与以下前端库协同：

* AngularJS
* KendoUI
* VueJS
* React
* Knockout

## 安装

使用 `bower`

```
bower install veronica
```

**使用 `yo` 生成项目架构**

首先应确保安装了 `yo` 脚手架工具

```
npm install -g yo
```

从源码库中获取项目 generator-veronica，获取完毕后，
由于该项目没有在 npm 中注册，因此你需要在 generator-veronica 目录下使用以下命令，以便在后续执行命令时能够链接到本地路径：

```
npm link
```

可以创建一个文件夹，例如 `hello-veronica`，在该目录中，执行

```
yo veronica
```

这将创建基本的项目结构，并下载依赖包

> **题外话**：如果出现获取依赖失败的情况，使用代理或切换为国内的 npm 源


## 资源

### API 文档

[http://gochant.github.io/veronica/api](http://gochant.github.io/veronica/api)

### 相关项目

|名称|描述|
|---|---|
|[grunt-veronica](https://github.com/gochant/grunt-veronica)|grunt 插件，用于构建 veronica 搭建的项目|
|[veronica-debugger](https://github.com/gochant/veronica-debugger)|chrome 插件，方便开发者更好的调试项目|
|veronica-ui|veronica 的一个扩展，主要引入 KendoUI Core、Bootstrap 等进行数据绑定，界面构建等|


## 授权协议

MIT