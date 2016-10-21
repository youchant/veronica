define([
    '../base/index',
    './appPart'
], function (baseLib, AppPart) {

    var _ = baseLib._;
    var extend = _.extend;


    var AppProvider = AppPart.extend(/** @lends AppProvider.prototype */{
        /**
         * 应用程序提供者容器部件
         * @class AppProvider
         * @param {Object} options - 配置参数
         * @augments AppPart
         */
        initialize: function (options) {
            this.supr(options);
            this._pool = {};
            this._defaultKey = 'default';
            this._nested = false;
        },
        /**
         * 添加提供者时，进行预处理的钩子
         * @param data
         * @returns {*}
         * @private
         */
        _preprocess: function (data) {
            return data;
        },
        /**
         * 设置默认名称
         * @param {string} name - 名称
         */
        setDefault: function (name) {
            this._defaultKey = name;
        },
        /**
         * 获取提供者
         * @param {string} name - 提供者名称
         * @returns {object} - 提供者对象
         */
        get: function (name) {
            name || (name = this._defaultKey);
            var r = this._nested ? _.get(this._pool, name) :
                this._pool[name];
            return r;
        },
        /**
         * 添加提供者
         * @param {string} name - 名称，在这个容器内必须唯一
         * @param {Object} value - 提供者对象
         * @param {Object} [options] - 添加时参数
         * @param {boolean} [options.force=false] - 遇到重复名称时，是否强制添加覆盖
         * @param {string} [options.inherit='default'] - 所继承的提供者的名称
         */
        add: function add(name, value, options) {
            var me = this;
            // 按照 key-value 获取
            if (_.isObject(name)) {
                options = value;
                _.each(name, function (val, key) {
                    add.call(me, key, val, options);
                });
            } else {
                options = extend({
                    force: false,
                    inherit: 'default'
                }, options);
                var exists = this.get(name);
                if (!exists || options.force === true) {
                    if (typeof value !== 'string') {
                        var parent = this.get(options.inherit);
                        if (!_.isFunction(value)) {
                            value = extend({}, parent, value);
                        }
                    }
                    value.__id = name;
                    value = me._preprocess(value);
                    this._pool[name] = value;
                }
            }
        },
        /**
         * 判断提供者是否存在
         * @param {string} name - 提供者名称
         * @returns {boolean} - 是否存在
         */
        has: function (name) {
            return typeof this._pool[name] !== 'undefined';
        },
        /**
         * 移除提供者
         * @param {string} name - 提供者名称
         */
        remove: function (name) {
            this._pool[name] = null;
            delete this._pool[name];
        }
    });

    return AppProvider;
});
