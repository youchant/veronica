define([
    'chai', 'sinon', 'sinon-chai', 'veronica'
], function (chai, sinon, sinonChai, veronica) {

    chai.use(sinonChai);
    var _ = veronica._;
    var $ = veronica.$;

    describe('App - WidgetManager', function () {
        var app;
        var target;

        beforeEach(function () {
            app = new veronica.createApp();
            target = new veronica.WidgetManager({
                app: app
            });
        });

        it('has props', function () {
            expect(target._pool).to.eql({});
            expect(target._currBatchName).to.be.null;
            expect(target._currBatchConfigList).to.eql([]);
            expect(target._lastBatchConfigList).to.eql([]);
            expect(target._isLoading).to.be.false;
        });

        it('isLoading', function () {
            expect(target.isLoading()).to.be.false;
        });

        it('normalizeConfig', function () {
            var actual = target.normalizeConfig('xxx');
            expect(actual).to.eql({
                name: 'xxx',
                xtype: '',
                options: {
                    _name: 'xxx',
                    _hostNode: '.v-widget-root'
                }
            });

            var actual1 = target.normalizeConfig('xxx(j-j@c-c)=>#test');

            expect(actual1).to.eql({
                name: 'xxx',
                xtype: 'j-j@c-c',
                options: {
                    _name: 'xxx',
                    _hostNode: '#test'
                }
            });

            var actual2 = target.normalizeConfig({
                xtype: 'xx@yy',
                options: {
                    a: 1
                }
            });
            console.log(actual2);

            expect(actual2).to.eql({
                name: undefined,
                xtype: 'xx@yy',
                options: {
                    a: 1,
                    _name: undefined,
                    _hostNode: '.v-widget-root'
                }
            })
        });

        it('normalizeBatchConfig', function () {
            var actual = target.normalizeBatchConfig([{
                name: 'xx',
                xtype: 'yy'
            }], 'batch1');

            expect(actual).to.eql([{
                name: 'xx',
                xtype: 'yy',
                options: {
                    _name: 'xx',
                    _hostNode: '.v-widget-root',
                    _batchName: 'batch1'
                }
            }])
        });

        it('_isCurrBatch', function(){
            var stub = app.page.isCurrent = sinon.stub().returns(false);

            var actual = target._isCurrBatch('xx');
            expect(actual).to.be.false;

            var actual1 = target._isCurrBatch();
            expect(actual1).to.be.true;

        });


    })
});
