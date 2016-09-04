define(function () {

    return function (base, app) {
        var $ = app.core.$;
        var _ = app.core._;
        var noop = $.noop;

        // aspect
        var aspectAbility = {
            /** @lends veronica.View# */
            configs: {
                /**
                 * 配置该视图的子视图 **`重写`**
                 * @type {function}
                 * @default
                 * @example
                 *   aspect: function(){
                 *     this.after('initAttr', function(){
                 *         this.param = { test: 'A' }
                 *     });
                 *     this.before // ...
                 *   }
                 */
                aspect: noop
            },
            /** @lends veronica.View# */
            methods: app.core.aspect
        };
        base._extend(aspectAbility);
    };
});
