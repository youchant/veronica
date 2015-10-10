define(function () {

    return function (app) {

        var noop = function () { };

        /**
         * **`重写`** 重写该方法，使视图自适应布局，当开启 `autoResize` 后，窗口大小变化时，该方法会被调用，
         * 如果有必要，在该方法中应编写窗口大小变化时，该视图对应的处理逻辑
         * @type {function}
         */
        app.view.base.resize = noop;

        app.view.base._autoResize = function () {
            if (this.options.autoResize) {
                this.listenTo(this, 'rendered', function () {
                    _.defer(me.resize);
                });
                $(window).on('resize', this.resize);
            }
        };
    };
});
