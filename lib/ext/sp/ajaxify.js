define([], function () {
    return function (app) {
        app.ajaxify = app.ajaxify || {};

        app.ajaxify.link = function (context) {
            var $el = context.$el;
            $el.find('[href]').on('click', function (e) {
                var $this = $(this);
                if ($this.data('noajaxify')) {
                    return;
                } else {
                    e.preventDefault();
                    var url = $this.attr('href');
                    var method = $this.data('ajaxify');
                    method = method || '_linkHandler';
                    context[method](url);
                }
            });
        }
    };
});