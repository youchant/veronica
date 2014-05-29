define(['chai', 'sinon', 'veronica'], function (chai, sinon, core) {

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

    describe('sinon', function () {
        it("calls the original function", function () {
            var callback = sinon.spy();
            var proxy = once(callback);

            proxy();

            assert(callback.called);
        });
    });

    describe('Core', function () {

        describe('Util', function () {
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

        describe('Loader', function () {
            describe('#loadWiget', function () {
                it('should loaded success', function (done) {
                    core.loadWiget('widget1', {}).done(function () {
                        done();
                    });
                });
                it('should loaded fail if in wrong page', function (done) {
                    core.createApp('test');
                    core.loadWiget('widget1', {}, 'test-page').done(function () {

                    }).fail(function () {
                        done();
                    });
                });
            });
            describe('#start', function () {
                it('should success with widget array', function (done) {
                    core.start([
                            { name: 'widget1', options: { host: '.page-view' } },
                            { name: 'widget2', options: { host: '.page-view' } }
                    ]).done(function () {
                        done();
                    });
                });
                it('should success with callback', function (done) {
                    core.start([
                      { name: 'widget1', options: { host: '.page-view' } },
                      { name: 'widget2', options: { host: '.page-view' } }
                    ], function () {
                        done();
                    });
                })
            });
            describe('#stop', function () {
                it('should work if host element have widget', function (done) {
                    var $ = core.$;
                    core.start([
                        { name: 'widget1', options: { host: '.page-view' } }
                    ]).done(function () {
                        core.stop($('.page-view'));
                        $('.page-view').children().length.should.equal(0);
                        done();
                    });
                })
            });
            describe('#stopBySandbox', function () {
                it('pure object', function () {
                    core.stopBySandbox({});
                })
                it('no paramas', function () {
                    core.stopBySandbox();
                })
            });
            describe('#stopByName', function () {
            });
            describe('#recycle', function () {
            });
            describe('#waitWidgets', function () {
            });
            describe('#registerWidgets', function () {
            });
        });

    });

    describe('Sandbox', function () {
        describe('')
    });
});