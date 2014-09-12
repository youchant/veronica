# FormView

## 配置项

* 通过设置 `defaults` 设置默认配置项
* 调用部件时，设置 `options` 传入外部配置项

### id `string`

表单模型的唯一标识符

### isLocal `boolean` *false*

是否是使用本地数据源

### data `object` *{ }*

传入数据

### state `string` *add*

表单状态，有两种 `add` 和 `edit`

### url

路径，在使用远程数据的时候使用

```js
url: {
    read: '',  // 获取表单数据
    defaults: '',  // 获取表单默认数据
    add: '',  // 新增数据
    modify: ''  // 修改数据
}
```

### processData `function`

进行数据预处理的方法，默认实现如下：

 ```js
    // 第二个参数 action 可以为"read"或"save"，可根据此状态决定怎么处理数据
    function (data, action) {
        return data;
    }
 ```
 
## 属性

### validation

自定义验证

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

## 方法

### read

读取数据

### save

保存数据

### reset

重置数据

### validate

验证

## 事件

### saved

当保存成功后，触发该事件