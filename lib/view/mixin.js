define(function () {

    return function (base, app) {
        var $ = app.core.$;
        var _ = app.core._;
        var noop = $.noop;

        /**
         * mixins
         * @deprecated
         */
        var mixinAbility = {
            /** @lends veronica.View# */
            configs: {
                _mixins: function () {
                    return [];
                },
                /**
                 * **`重写`** 混入其他视图方法
                 * @type {function}
                 * @returns {array}
                 * @example
                 *   mixins: function () {
                 *       return [editHelper];
                 *   }
                 */
                mixins: noop
            },
            /** @lends veronica.View# */
            methods: {
                _applyMixins: function () {
                    var me = this;
                    var defaultMixins = this._invoke('_mixins');
                    var mixins = this._invoke('mixins'); // return array

                    mixins = defaultMixins.concat(mixins);
                    _.each(mixins, function (mixin) {
                        if (_.isFunction(mixin)) {
                            mixin(me, app);
                        } else {
                            _.each(mixin, function (member, key) {
                                // 注意：这里不会覆盖已存在的成员
                                if (me[key] == null) {
                                    me[key] = member;
                                }
                            });
                        }
                    });
                }
            }
        };

        base._extend(mixinAbility);
    };
});
