define([
    '../base/index'
], function (baseLib) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var partPattern = /^(.*)\:(.*)/;

    return function (base) {

        base._extend({
            props: {
                _parts: {},
                _delayListens: {}
            },
            methods: {
                get: function (key) {
                    var match = partPattern.match(key);
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
                    return this.app().componentPart.get(type);
                },
                _getPart: function (key) {
                    return this._parts[key];
                },
                _addPart: function (key, part) {
                    var origin = this._parts[key];
                    if (origin != null) {
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
                    var listens = _.find(this._delayListens, function(item, i){
                        return i === key;
                    })
                    if(listens != null){
                        _.each(listens, function(callback){
                            callback();
                        });
                    }
                },
                create: function (key, options) {
                    var app = this.app();
                    var me = this;
                    var match = partPattern.match(key);
                    var type = match[1];
                    var name = match[2];

                    // 默认的 part 类型
                    if (type === 'cmp') {
                        return this.startChildren(options);
                    }

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
        });
    };
});
