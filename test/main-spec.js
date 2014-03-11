define(['chai', 'veronica'], function (chai, core) {

    var should = chai.should();

    describe('core', function () {

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
                    var obj = {a: '1', b: '2'};
                    var ext = {c: '3'};
                    var r = core.util.extend(obj, ext);
                    r.should.have.property('c').with.equal('3');
                });
                it('same property', function () {
                    var obj = {a: '1', b: '2'};
                    var ext = {b: '3'};
                    var r = core.util.extend(obj, ext);
                    r.should.have.property('b').with.equal('3');
                });
            });
            describe('#include', function () {
                it('extend constructor', function () {
                    var A = function () {
                    };
                    var r = core.util.include(A, { say: function () {
                    } });
                    r.should.have.property('say').with.be.a('function');
                });
                it('same property', function () {
                    var obj = {a: '1', b: '2'};
                    var ext = {b: '3'};
                    var r = core.util.extend(obj, ext);
                    r.should.have.property('b').with.equal('3');
                });
            });
        });

        describe('loader', function () {
            describe('#loadWiget', function () {
                it('base usage', function (done) {
                    core.loadWiget('widget1', {}).done(function () {
                        done();
                    });
                });
                it('with wrong page', function (done) {
                    core.createApp('test');
                    core.loadWiget('widget1', {}, 'test-page').done(function () {

                    }).fail(function () {
                            done();
                        });
                });
            });
            describe('#start', function () {
                it('load widget array', function (done) {
                    core.start([
                            {name: 'widget1', options: {}},
                            {name: 'widget2'}
                        ]).done(function () {
                            done();
                        });
                });
                it('load with callback', function (done) {
                    core.start([
                        {name: 'widget1'},
                        {name: 'widget2'}
                    ], function () {
                        done();
                    });
                })
            });
            describe('#stop', function () {
            });
            describe('#stopBySandbox', function () {
                it('pure object', function () {
                    core.stopBySandbox({});
                })
                it('no paramas', function(){
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

});