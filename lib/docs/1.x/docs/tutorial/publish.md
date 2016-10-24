# 发布

由于将页面结构分成若干小部件后，脚本、样式表等会非常碎片化，整个网站连接数会相当多，会造成一定的性能问题，因此需要进行发布时打包优化

**打包的好处**

* 连接数降低至少 80%
* 传输大小降低至少 50%
* 系统运行速度明显提升 
* 代码混淆压缩

## 使用 grunt-veronica

### 安装

* 联网状态

**1**

安装 grunt 运行时

```shell
npm install -g grunt-cli
```

**2**

在项目目录文件夹下，安装 grunt-veronica

```shell
npm install grunt-veronica --save-dev
```

* 断网状态

**1**

安装 grunt

在安装有 grunt-cli 的机器中，拷贝相关包。（Windows下在用户文件夹下的 Roming/npm 中）

**2**

安装 grunt-veronica

拷贝 grunt-veronica 源码和相关依赖项到 node_modules 文件夹中

### 运行

在项目的根目录下，放置 Gruntfile.js 文件

* Gruntfile.js 文件

```js

'use strict';

module.exports = function (grunt) {

    var reqConf = require('./app/require-conf.js')();

    grunt.initConfig({
        veronica: {
            defaults: {
                options: {
                    appDir: './app/',
                    baseUrl: '.',
                    dir: './app-release',
                    reqConfig: reqConf,
                    clean: [''],
                    modules: [{
                        name: 'basic',
                        source: './modules'
                    }],
                    removeCombined: false
                }
            }
        }

    });

    grunt.loadNpmTasks('grunt-veronica');
    grunt.registerTask('default', ['veronica']);

};
```

在控制台运行命令 `grunt`

该命令执行以下的工作：

1. 拷贝 `appDir` 中所有代码到 `dir` 目录中；
2. 利用 RequireJS 的打包逻辑，对 `dir` 基路径下的 main.js 文件进行打包，打包过程会读取 `merge`、`notMerge` 配置，确定哪些文件会被打包到 main 文件里；
3. 根据 `optimize` 配置，对 CSS 和 JS 代码进行压缩优化
4. 根据 `modules` 配置，将 widgets 和 plugins 拷贝到 `dir` 中的特定文件夹，并对这些 widgets 和 plugins 分别进行打包（简称：widgets 打包）
 1. widgets 打包以每个 module 进行分组，对每个 widgets 分别作为 RequireJS 的单个 module 进行打包，打包时会读取`moduleMerge`配置，确定哪些公共库会被打包到每个 widgets 中；
 2. 初步打包完成后的 widget 文件夹放置到 \__temp__/[moduleName] 目录里，对该目录进行清理，删除多余文件和打包中间文件；
 3. 以 module 为单位，将单个 module 内的所有 widgets 的CSS文件引用放置到一个CSS文件中，称为：modules.css；
 4. 将 \__temp__ 中的 widgets 拷贝到正式发布的文件夹中；
 5. 对所有 widgets 目录进行清理；
5. 对 modules.css 执行 css combo，以便将所有CSS合并到一个文件中
6. 对整个输出目录 `dir` 进行清理，删除多余文件

**具体的配置项说明请参见 grunt-veronica 项目的说明文件**
