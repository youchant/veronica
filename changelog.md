# 更新日志

## 下一步开发计划

* 如果是远程加载的部件，自动设置 optimized
* 提供打包多个页面的机制
* 扩展 schema 让提交事件的时候也可以使用
* 修复对话框的滚动条bug
* 避免 IE CSS 31 和 4096 的bug

* 废弃通过 sandbox直接访问 core里面的部分api（$ _）

## v 0.2.0

### veronica

* 将插件源配置项 'source' 更名为 '_source'
* 将 Application 的 init 方法 更名为 launch
* 所有部件对象包装成延迟对象

### veronica-mvc
* 添加 notify 组件，notify 的接口产生重大变化
* 添加 router 组件
* tableView
    * `filter` 的筛选方式 `isGroup` 由 true 改为 false
* formView
    * 添加 schema 和 params 配置项
	* 移除 processData 方法

### generator-veronica
* 生成器升级，执行 `grunt` 能同时打包网站和部件