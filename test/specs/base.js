define(['chai', 'sinon', 'veronica'], function (chai, sinon, veronica) {

    var _ = veronica._;
    var $ = veronica.$;

    describe('BaseLib', function () {

        describe('Klass', function(){
            it('#bug: deep combine null props throw exception', function(){
               var base = veronica.klass({
                    options: {
                        a: null,
                        b: {}
                    }
                })
                var sub = base.extend({
                    options:  {
                        c: 1,
                        a: '1'
                    }
                })

                var actual = new sub();

                expect(actual.options).to.eql({
                    a: '1',
                    b: {},
                    c: 1
                })
            })


        })

        describe('ClassBase', function () {
            var target;
            beforeEach(function () {
                target = new veronica.ClassBase();
                target._defaults = {};
            })

            it('_call', function () {
                target._call(target._initProps, arguments);

            })

            it('_extend', function () {
                target._extend({
                    options: {
                        a: 1
                    },
                    configs: {
                        c1: 'xx'
                    },
                    methods: {
                        test: function () {

                        }
                    }
                })

                expect(target._defaults).to.deep.equal({
                    a: 1
                })
                expect(target.c1).to.equal('xx');
                expect(target.test).to.be.a('function');
            })

            it('_extendMethod', function () {
                var callback = sinon.spy();
                target._extendMethod('_extendMethod', callback);
                target._extendMethod('_extendMethod', function () {
                });
                expect(callback.called).to.be.true;
            })

        })

        describe('Logger', function () {
            var target;
            var w = console.warn;
            var e = console.error;
            var l = console.log;
            var i = console.info;
            beforeEach(function () {
                target = new veronica.Logger();
            })
            after(function () {
                console.warn = w;
                console.error = e;
                console.log = l;
                console.info = i;
            })

            it('setName', function () {
                target.setName('a');
                expect(target.name).to.equal('a');
            })

            it('enable', function () {
                var callback = console.warn = sinon.spy();
                target.warn('xxx');
                expect(callback.called).to.be.false;
                target.enable();
                target.warn('xxx');
                expect(callback.called).to.be.true;
            })
            it('warn', function () {
                var callback = console.warn = sinon.spy();
                target.enable();
                target.warn('xxx');
                expect(callback.called).to.be.true;
            })
            it('error', function () {
                var callback = console.error = sinon.spy();
                target.enable();
                target.error('xxx');
                expect(callback.called).to.be.true;
            })
            it('log', function () {
                var callback = console.log = sinon.spy();
                target.enable();
                target.log('xxx');
                expect(callback.called).to.be.true;

            })
            it('info', function () {
                var callback = console.info = sinon.spy();
                target.enable();
                target.info('xxx');
                expect(callback.called).to.be.true;
            })
        })
    })
});
