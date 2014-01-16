define([
    "veronica",
    'jquery',
    'backbone'
], function (core, $, Backbone) {

    var widgets = [{
        name: 'widget1',
        options: {
            msg: 'haha',
            el: '#test'
        }
    }, {
        name: 'widget2',
        options: {
            msg: 'hah2',
            el: '#test2'
        }
    }];
    var widgets2 = [{
        name: 'widget3',
        options: {
            msg: 'haha',
            el: '#test3'
        }
    }];
    var pages = {
        a: {
            name: 'test',
            widgets: widgets
        },
        b: {
            name: 'test2',
            widgets: widgets2,
            inherit: ['a']
        }
    };
    var pages2 = {
        a1: {
            name: 'test',
            widgets: widgets
        },
        b1: {
            name: 'test2',
            widgets: widgets2,
            inherit: ['a']
        }
    };

    var app = core.createApp('testApp');

    var A;

    A = (function () {

        A.name = 'A';

        function A() {
            this.name = 'a';
        }

        A.prototype.say = function () {
            console.log(this.name);
        }

        return A;

    })();

    describe("core", function () {

        describe("object:util", function () {

            it("decamelize", function () {
                expect(core.util.decamelize('isVeryGood')).toEqual('is_very_good');
            });

            it('extend', function () {
                var a = new A;
                core.util.extend(a, { length: 5 });
                expect(a.length).toEqual(5);
            });
            it('include', function () {
                var a = new A;
                core.util.include(A, {
                    jump: function () {
                       return 0;
                    }
                });
                expect(a.jump()).toEqual(0);
            });
            it('mixin', function () {
                var a = new A;
                core.util.mixin(a, { length: 5 });
                core.util.mixin(A, {
                    jump: function () {
                        return 0;
                    }
                });
                expect(a.length).toEqual(5);
                expect(a.jump()).toEqual(0);
            });
        });

        describe('object:aspect', function () {
            it('before', function () {
                core.util.mixin(A, core.aspect);
                core.util.mixin(A, Backbone.Events);
                var a = new A;
                var b;
                a.before('say', function () {
                    b = 0;
                });
                a.say();
                expect(b).toEqual(0);
            });
            it('after', function () {
                core.util.mixin(A, core.aspect);
                core.util.mixin(A, Backbone.Events);
                var a = new A;
                var b;
                a.after('say', function () {
                    b = 0;
                });
                a.say();
                expect(b).toEqual(0);
            });
        });

        describe('object:logger', function () {

        });

    });
});

