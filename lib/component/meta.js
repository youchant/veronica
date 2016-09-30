define([
    '../base/index'
], function (baseLib) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var typeNamePattern = /^(.*)\:(.*)/;


    return {
        methods: {
            _getComponent: function(id){
                return this.get('part:app:component').get(id);
            },
            _getContext: function () {
                return this.options._source;
            },
            _getBatchName: function(){
                return this.options._batchName;
            },
            _i18n: function (key) {
                var i18n = this.get('part:app:i18n').get();
                return i18n[key];
            },
            /**
             * 获取后台请求的 url
             * @param name - url 名称
             * @return {string}
             */
            url: function (url) {
                return this.options.url[url];
            },
            when: function (args) {
                if (_.isArray(args)) {
                    return $.when.apply($, args);
                }
                return $.when;
            },
            /**
             * 为沙箱记录日志
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
            },
            /**
             * 调用成员方法，如果是对象，则直接返回
             * @param {string} methodName - 方法名
             * @param {boolean} [isWithDefaultParams=true] - 是否附加默认参数（app, _, $）
             * @returns {*}
             * @private
             */
            _invoke: function (methodName, isWithDefaultParams) {
                var app = this.app();
                var args = _.toArray(arguments);
                var sliceLen = args.length >= 2 ? 2 : 1;
                if (isWithDefaultParams == null) {
                    isWithDefaultParams = true;
                }

                if (isWithDefaultParams) {
                    args = args.concat([app, _, $]);
                }

                var method = methodName;
                if (_.isString(methodName)) {
                    method = this[methodName];
                }

                return _.isFunction(method) ? method.apply(this, args.slice(sliceLen)) : method;
            }
        }
    };
});
