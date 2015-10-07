define(function () {

    return function (app) {
        var $ = app.core.$;
        var _ = app.core._;
        var noop = $.noop;

        var configs = {
            /**
             * **`重写`** 属性变化
             * @type {Object}
             * @example
             *   attrChanged: {
             *       code: function (value): {
             *         alert('code changed' + value);
             *       }
             *   }
             */
            attrChanged: {},
            /**
             * **`重写`** 初始化属性
             * @type {Function}
             * @default
             * @example
             *  initAttr: function(){
             *      this.message = 'hello';
             *      this.baseModel = {
             *          data: {
             *              name: 'veronica'
             *          }
             *      }
             *  }
             */
            initAttr: noop
        };

        var methods = {
            /**
             * 定义属性
             * 注意：属性的变更是单向的，就是说 origin 变化会引起 attr 变化，但 attr 变化不会引起 origin 变化
             * @function
             * @param {object} options - 配置项
             * @param {string} options.name - 属性名称
             * @param {function} [options.getter] - 获取数据的方法
             * @param {string} [options.source=options] - 数据来源（包括：'options', 'global', 'querystring'）
             * @param {string} [options.setup=rendered] - 初始化时机（所有该视图相关的事件名称）
             * @param {string} [options.sourceKey] - 原始数据的字段名称
             */
            defineAttr: function (options) {
                // if (options.source == null) options.source = 'options';
                if (options.setup == null) options.setup = 'rendered';
                if (options.sourceKey == null) options.sourceKey = options.name;

                var me = this;

                if (options.source === 'options') {
                    if (options.getter == null) {
                        options.getter = function (data) {
                            return this.options[data.sourceKey];
                        }
                    }
                }

                if (options.source === 'querystring') {
                    if (options.getter == null) {
                        options.getter = function (opt) {
                            return app.qs.get(opt.sourceKey);
                        }
                    }
                    // 监听查询字符串改变
                    this.sub('qs-changed', function (obj) {
                        var value = obj[options.sourceKey];
                        var originalValue = me.attr(options.name);
                        if (value != originalValue) {
                            me.attr(options.name, value);
                        }
                    });


                }

                // 当事件发生时，设置该属性
                this.listenToOnce(this, options.setup, function () {
                    var val = this._invoke(options.getter, true, options);

                    this.attr(options.name, val);
                });

            },

            /**
             * 获取设置属性
             * @function
             */
            attr: function (name, value) {
                if (!_.isUndefined(value)) {
                    this._attributes[name] = value;
                    this.trigger('attr-changed', name, value);
                }
                return this._attributes[name];
            }
        };

        $.extend(app.view.base, configs);
        $.extend(app.view.base, methods);
    };
});
