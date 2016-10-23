define([
    '../base/index'
], function (baseLib) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var typeNamePattern = /^(.*)\:(.*)/;
    var listenPattern = /^(.*)\:(.*)/;
    var partPattern = /^(.*?)\:(.*)/;

    return {
        methods: /** @lends Component# */{
            /**
             * 获取，`万能方法`
             * @param {string} expr - 表达式
             * @returns {*}
             * @example
             *  this.get('vm:text')
             *  this.get('ui:.grid')
             *  this.get('dom:#selector')
             *  this.get('cmp:childComponent')
             *  this.get('part:viewEngine')
             */
            get: function (expr) {
                var match = partPattern.exec(expr);
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
            /**
             * 监听，`万能方法`
             * @param {string} expr - 表达式
             * @param listener
             * @returns {*}
             */
            listen: function (expr, listener) {
                var match = listenPattern.exec(expr);
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
            /**
             * 创建，`万能方法`
             * @param {string} expr - 表达式
             * @param options
             * @returns {*}
             */
            create: function (expr, options) {
                var me = this;
                var match = partPattern.exec(expr);
                var type = match[1];
                var name = match[2];

                // part: component
                if (type === 'cmp') {
                    return this.startChildren(options);
                }

                // provider
                if (type === 'provider') {
                    return this.createProvider(name, options);
                }

                if (type === 'part') {
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
                        me._addPart(expr, o);
                    })
                } else {
                    this._addPart(expr, obj);
                }
            },
            _getComponent: function (id) {
                return this.get('part:app:component').get(id);
            },
            _getContext: function () {
                return this.options._source;
            },
            _getBatchName: function () {
                return this.options._batchName;
            },
            _componentManager: function () {
                return this.get('part:app:component');
            },
            _mediator: function () {
                return this.get('part:app:mediator');
            },
            _i18n: function (key) {
                var i18n = this.get('part:app:i18n').get();
                return i18n[key];
            },
            _uiKit: function () {
                return this.get('part:app:uiKit');
            },
            opt: function (namePath) {
                return _.get(this.options, namePath);
            },
            /**
             * 记日志
             * @param {string} msg - 信息
             * @param {string} [type='log'] - 信息类型
             */
            log: function (msg, type) {
                var logger = this.logger();
                type || (type = 'log');
                logger.setName(this._type + '(' + this._name + ')');
                if (_.isArray(msg)) {
                    logger[type].apply(logger, msg);
                } else {
                    logger[type](msg);
                }
                logger.setName();
            }
        }
    };
});
