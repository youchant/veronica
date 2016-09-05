define(['chai', 'sinon', 'veronica'], function (chai, sinon, veronica) {

    var _ = veronica._;
    var $ = veronica.$;

    describe('BaseLib - LodashExt', function () {

        describe('_', function () {

            it('ensureArray', function () {
                expect(_.ensureArray([])).to.be.a('array');
                expect(_.ensureArray({})).to.be.a('array');
            })

            it('mapArrayOrSingle', function () {
                var r1 = _.mapArrayOrSingle({a: 1}, function (o) {
                    return o.a;
                })
                expect(r1).to.equal(1);

                var r2 = _.mapArrayOrSingle([{a: 1}], function (o) {
                    return o.a;
                })
                expect(r2).to.deep.equal([1]);
            })

            it('safeInvoke', function () {
                var o = {
                    a: function (val) {
                        return val;
                    }
                };

                var r1 = _.safeInvoke(o, 'a', 1);
                expect(r1).to.equal(1);

                var r2 = _.safeInvoke(null, 'a', 1);
                expect(r2).to.be.null;

                var r3 = _.safeInvoke(o, 'b', 1);
                expect(r3).to.be.null;
            })

            it('decamelize', function () {
                var r1 = _.decamelize('ThisIsABug');
                expect(r1).to.equal('this_is_a_bug');

                var r2 = _.decamelize('VeronicaUI', '-');
                expect(r2).to.equal('veronica-ui');
            })

            it('normalizePath', function () {
                var r1 = _.normalizePath('http:////path//to///some/');
                expect(r1).to.equal('http://path/to/some/');
            })

            it('qsToJSON', function () {
                var r1 = _.qsToJSON('a=1&b=t&c=xxx');
                expect(r1).to.deep.equal({
                    a: '1',
                    b: 't',
                    c: 'xxx'
                });
            })

            it('getParameterNames', function () {
                var a = function (a, b, c) {
                };
                var b = function () {
                };

                var r1 = _.getParameterNames(a);
                expect(r1).to.deep.equal(['a', 'b', 'c']);

                var r2 = _.getParameterNames(b);
                expect(r2).to.deep.equal([]);

            })

            it('whenAjax', function () {
                var a = $.Deferred();
                a.resolve(1, 2, 3);
                var b = $.Deferred();
                b.resolve(1);
                //todo: 未测试 $.ajax 的返回结果
                _.whenAjax(a, b).done(function (a, b) {
                    expect(a).to.deep.equal([1, 2, 3]);
                    expect(b).to.equal(1);
                })
            })
        })

        describe('_.querystring', function () {
            it('test1', function () {
                expect(2).to.be.a('number');
            })
        })

        describe('_.request', function () {
            it('test1', function () {
            })
        })


    })
});
