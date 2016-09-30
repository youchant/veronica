define([
    '../base/index',
    '../framework/appProvider'
], function (baseLib, AppProvider) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var partPattern = /^(.*?)\:(.*)/;
    var extend = baseLib.$.extend;

    return {
        props: {
            _parts: {},
            _delayListens: {}
        },
        methods: {
            get: function (key) {
                var match = partPattern.exec(key);
                var type = match[1];
                var name = match[2];

                if (type === 'vm') {
                    return this.model(name);
                }
                if (type === 'ui') {
                    return this.ui(name);
                }
                if (type === 'dom') {
                    return this.$(name);
                }
                if (type === 'cmp') {
                    var child = this._findChild(name);
                    return this._getComponent(child.id);
                }
                if (type === 'part') {
                    return this._getPart(name);
                }
            },
            listen: function (key, listener) {
                var match = listenPattern.exec(key);
                var type = match[1];
                var name = match[2];

                // 内置的监听类型
                if (type === 'bus') {
                    listener = evt;
                    return this.sub(name, listener);
                }

                var match = eventPattern.exec(name);
                var event = match[1];
                var target = match[2];

                // 使用 event 逻辑
                if (type === '' || type == null) {
                    return this.listenTo(name, listener);
                }
                if (type === 'vm') {

                }


                var partKey = type + ':' + target;
                var callback = _.bind(function (type, name, listener) {
                    var partType = this._partType(type);
                    return partType.listen(this, name, listener);
                }, this, type, name, listener);

                this._addPartListen(partKey, callback);

                var part = this._getPart(partKey);
                if (part != null) {
                    return callback();
                }
            },
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
            part: function(key){
                return this._getPart(key);
            },
            /**
             * 创建部件
             * @param {string} name - 名称
             * @param {function} ctor - 构造器
             * @param {Object} [options] - 初始化参数
             * @returns {Object}
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
             * @param {function} [ctor=AppProvider] - 构造器
             * @param {Object} options - 调用参数
             * @returns {*|Object}
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
            },

            create: function (key, options) {
                var me = this;
                var match = partPattern.exec(key);
                var type = match[1];
                var name = match[2];

                // part: component
                if (type === 'cmp') {
                    return this.startChildren(options);
                }

                // provider
                if(type === 'provider'){
                    return this.createProvider(name, options);
                }

                if(type === 'part'){
                    return this.createPart(name, options);
                }

                // 默认 part 类型
                var obj;
                if (_.isFunction(options)) {
                    obj = options.call(this);
                } else {
                    var partType = this._partType(type);
                    if (partType != null) {
                        obj = partType.create(this, name, options);
                    }
                }

                if (obj.then && _.isFunction(obj.then)) {
                    obj.then(function (o) {
                        me._addPart(key, o);
                    })
                } else {
                    this._addPart(key, obj);
                }
            }
        }
    };
});
