define('com/main',[],function () {
    return {
        name: 'com',
        template: 'Sub widget'
    };
});

define('com', ['com/main'], function (main) { return main; });
