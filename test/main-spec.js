define(['chai', 'sinon', 'veronica'], function (chai, sinon, veronica) {

    var should = chai.should();

    function once(fn) {
        var returnValue, called = false;
        return function () {
            if (!called) {
                called = true;
                returnValue = fn.apply(this, arguments);
            }
            return returnValue;
        };
    }

    describe('hooks', function () {
        before(function () {
            // runs before all tests in this block
            console.log('before');
        })
        after(function () {
            // runs after all tests in this block
        })
        beforeEach(function () {
            // runs before each test in this block
        })
        afterEach(function () {
            // runs after each test in this block
        })
        // test cases
    })

    describe('sinon', function () {
        it("calls the original function", function () {
            var callback = sinon.spy();
            var proxy = once(callback);

            proxy();

            assert(callback.called);
        });
    });

    describe('core', function () {

        var core = veronica;

        describe('util', function () {
            describe('#decamelize', function () {
                it('should work normal string', function () {
                    var r = core.util.decamelize('test');
                    r.should.equal('test');
                });
                it('should work with symbol string', function () {
                    var r = core.util.decamelize('test-_+=!@#$%^&*()');
                    r.should.equal('test-_+=!@#$%^&*()');
                });
                it('should work with uppercase string', function () {
                    var r = core.util.decamelize('testA');
                    r.should.equal('test_a');
                });
            });
            describe('#extend', function () {
                it('different property', function () {
                    var obj = { a: '1', b: '2' };
                    var ext = { c: '3' };
                    var r = core.util.extend(obj, ext);
                    r.should.have.property('c').with.equal('3');
                });
                it('same property', function () {
                    var obj = { a: '1', b: '2' };
                    var ext = { b: '3' };
                    var r = core.util.extend(obj, ext);
                    r.should.have.property('b').with.equal('3');
                });
            });
            describe('#include', function () {
                it('extend constructor', function () {
                    var A = function () {
                    };
                    var r = core.util.include(A, {
                        say: function () {
                        }
                    });
                    r.should.have.property('say').with.be.a('function');
                });
                it('same property', function () {
                    var obj = { a: '1', b: '2' };
                    var ext = { b: '3' };
                    var r = core.util.extend(obj, ext);
                    r.should.have.property('b').with.equal('3');
                });
            });
        });

        describe('loader', function () {
            describe('#useGlobalRequire', function () {
                it('ok', function () {
                    core.loader.useGlobalRequire.should.to.not.throw();
                })
            });
            describe('#useGlobalRequirejs', function () {
                it('ok', function () {
                    core.loader.useGlobalRequirejs();
                })
            });
            describe('#require', function () {
                core.loader.require();
            });
        });

    });

    describe('app', function () {
        var app;
        var $;
        var $host;

        // create a simple widget
        function createWiget() {
            var widgetName = 'hello';
            app.widget.register(widgetName, {});

            app.widget.start({
                name: widgetName,
                options: {
                    host: $host
                }
            });

            var $el = $host.find('.' + widgetName);
            return app.sandboxes.get($el.data(app.core.constant.SANDBOX_REF_NAME));
        }

        beforeEach(function () {
            app = veronica.createApp();
            $ = app.core.$;
            $host = $('<div></div>');
        })

        describe('widget', function () {
            describe('.package', function () {
                it('should run ok', function () {
                    app.widget.package();
                });
            });
            describe('.register', function () {
                it('should run ok', function () {

                    app.widget.register({});
                    console.log(app.widget);
                });
            });
            describe('.start', function () {
                it('should create a widget', function () {

                    var sandbox = createWiget();
                    var widget = sandbox.getHost();
                    var $el = widget.$el;

                    $el.length.should.to.equal(1);
                    widget._name.should.to.equal('hello');
                    widget.sandbox.should.to.equal(sandbox);
                    $el.parent().get(0).should.to.equal($host.get(0));
                    $el.hasClass(app.core.constant.WIDGET_CLASS).should.to.be.true;
                });
            });
            describe('.stop', function () {
                it('should run ok when incoming Sandbox', function () {
                    var sandbox = createWiget();

                    app.widget.stop(sandbox);

                    should.not.exist(app.sandboxes.get(sandbox.id));
                    $host.children().length.should.to.equal(0);
                });
                it('should run ok when incoming jQuery element', function () {
                    var sandbox = createWiget();

                    app.widget.stop($host);

                    $host.children().length.should.to.equal(0);
                });
                it('should run ok when incoming widget name', function () {
                    var sandbox = createWiget();

                    app.widget.stop(sandbox.name);

                    $host.children().length.should.to.equal(0);
                });
            });
        })

    });
});
