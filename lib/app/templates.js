// 模板扩展
define(['require'], function (require) {
    return function (app) {
        var _ = app.core._;

        app.templates = {
            _templates: {},
            set: function (name, tpl, isRequire) {

                if (isRequire) {
                    isRequire(['text!' + tpl], function (resp) {
                        app.templates._templates[name] = resp;
                    });
                } else {
                    app.templates._templates[name] = tpl;
                }
            },
            get: function (name) {
                return app.templates._templates[name];
            },
            getName: function (tpl) {
                _.each(app.templates._templates, function (item, name) {
                    if (item === tpl) {
                        return name;
                    }
                });
                return null;
            }
        }
    };
});
