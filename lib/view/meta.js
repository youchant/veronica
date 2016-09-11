define(function () {

    return function (base, app) {

        var $ = app.core.$;
        var _ = app.core._;

        base._extend({
            methods: {
                _getContext: function () {
                    return this.options._source;
                },
                when: function(args){
                    if(_.isArray(args)){
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
                }
            }
        });
    };
});
