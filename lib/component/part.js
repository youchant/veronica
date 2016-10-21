define([
    '../base/index',
    '../framework/appProvider'
], function (baseLib, AppProvider) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var partPattern = /^(.*?)\:(.*)/;
    var extend = baseLib.$.extend;

    return {
        /**
         * @lends Component#
         */
        props: {
            /**
             * 部件
             */
            _parts: {},
            _delayListens: {}
        },
        /**
         * @lends Component#
         */
        methods: {

            _partType: function (type) {
                if (type == false) {
                    type = 'default';
                }
                return this.get('part:app:partType').get(type);
            },
            _getPart: function (key) {
                var match = partPattern.exec(key);
                if(match != null){
                    var type = match[1];
                    var name = match[2];
                    if (type == 'app'){
                        return this.app().get('part:' + name);
                    }
                }

                return this._parts[key];
            },
            _addPart: function (key, part) {
                var origin = this._parts[key];
                if (origin == null) {
                    this._parts[key] = part;
                    this.trigger('addPart', key, part);
                }
            },
            _addPartListen: function (key, callback) {
                var ar = this._delayListens[key];
                if (ar == null) {
                    this._delayListens[key] = [];
                }
                this._delayListens[key].push(callback);
            },
            _callPartListen: function (key) {
                var listens = _.find(this._delayListens, function (item, i) {
                    return i === key;
                })
                if (listens != null) {
                    _.each(listens, function (callback) {
                        callback();
                    });
                }
            },
            /**
             * 获取部件
             * @param {string} key - 部件名称
             * @returns {*}
             * @example
             *  var componentMana = this.part('component')
             */
            part: function(key){
                return this._getPart(key);
            },
            /**
             * 创建部件
             * @param {string} name - 名称
             * @param {Object} options - 初始化参数
             * @param {function} options.ctor - 构造器
             * @param {Object} options.options - 构造器参数
             * @returns {AppPart}
             */
            createPart: function (name, options) {
                var ctor = options.ctor;
                options = options.options;

                var me = this;
                // 从 application 中读取配置
                options = extend({
                    app: me
                }, me.options[name], options);

                var part = new ctor(options);
                if (name != null) {
                    me._addPart(name, part);
                }
                return part;
            },
            /**
             * 创建提供者部件
             * @param {string} name - 名称
             * @param {Object} [options] - 初始化参数
             * @param {function} [options.ctor=AppProvider] - 构造器
             * @param {Object} [options.options] - 构造器参数
             * @returns {AppProvider}
             */
            createProvider: function (name, options) {
                options || (options = {});

                if (options.ctor == null) {
                    options.ctor = AppProvider;
                }
                if (typeof options.ctor === 'object') {
                    options.ctor = AppProvider.extend(options.ctor);
                }
                return this.createPart(name, options);
            }
        }
    };
});
