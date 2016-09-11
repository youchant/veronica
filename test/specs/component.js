define(['chai', 'sinon', 'sinon-chai', 'veronica'],
    function (chai, sinon, sinonChai, veronica) {

        chai.use(sinonChai);
        var _ = veronica._;
        var $ = veronica.$;

        describe('App - Component', function () {

            describe('AppRouter', function () {
                var app;
                var target;
                var location;
                var history;
                var callback;
                var startWidgetsCallback;
                var testUrl = 'http://example.com';

                var Location = function (href) {
                    this.replace(href);
                };

                _.extend(Location.prototype, {

                    parser: document.createElement('a'),

                    replace: function (href) {
                        this.parser.href = href;
                        _.extend(this, _.pick(this.parser,
                            'href',
                            'hash',
                            'host',
                            'search',
                            'fragment',
                            'pathname',
                            'protocol'
                        ));

                        // In IE, anchor.pathname does not contain a leading slash though
                        // window.location.pathname does.
                        if (!/^\//.test(this.pathname)) this.pathname = '/' + this.pathname;
                    },

                    toString: function () {
                        return this.href;
                    }

                });


                beforeEach(function () {
                    app = new veronica.createApp();
                    location = new Location(testUrl);
                    history = _.extend(new veronica.History, {location: location});
                    history.interval = 9;


                    // mock & stubs
                    app.widget.start = sinon.spy();
                    target = new veronica.AppRouter({
                        homePage: 'home',
                        testing: 101,
                        app: app,
                        history: history
                    });
                    target._changePage = sinon.spy();
                    history.start({pushState: false});
                })
                afterEach(function () {
                    history.stop();
                })

                function testLocation(hash) {
                    var cb = target._changePage = sinon.spy();
                    location.replace(testUrl + hash);
                    history.checkUrl();
                    return cb;
                }

                it('entry', function () {
                    var cb1 = testLocation('#?123');
                    var cb2 = testLocation('#/');
                    var cb3 = testLocation('');
                    expect(cb1.calledWith('home', '123')).to.be.true;
                    expect(cb2.calledWith('home', null)).to.be.true;
                    expect(cb3.called).to.be.fale;
                })

                it('openPage', function () {
                    var cb1 = testLocation('#page=xxxx/xxx');
                    var cb2 = testLocation('#page=x_x-x');
                    var cb3 = testLocation('#x/x/x');
                    var cb4 = testLocation('#x_x-x&^x@');
                    var cb5 = testLocation('#xx/xxx/xxxx?xx&xxx');
                    expect(cb1.calledWith('xxxx/xxx', null)).to.be.true;
                    expect(cb2.calledWith('x_x-x', null)).to.be.true;
                    expect(cb3.calledWith('x/x/x', null)).to.be.true;
                    expect(cb4.calledWith('x_x-x&^x@', null)).to.be.true;
                    expect(cb5.calledWith('xx/xxx/xxxx', 'xx&xxx')).to.be.true;
                })

                it('executeWidget', function () {
                    // TODO
                })
            })

            describe('LayoutManager', function () {

                function getLayoutRoot() {
                    return $('.v-layout-root');
                }

                function fixture() {
                    return $('#mocha-fixture');
                }

                before(function () {
                    fixture().append('<div class="v-layout-root"></div>')
                })
                after(function () {
                    fixture().empty()
                })

                var app;
                var target;
                beforeEach(function () {
                    app = veronica.createApp({
                        debug: false
                    });
                    target = new veronica.LayoutManager({
                        app: app
                    });
                })

                it('_getLayoutRoot', function () {
                    var actual = target._getLayoutRoot();
                    expect(actual.length).to.equal(1);
                    expect(actual.hasClass('v-layout-root')).to.be.true;

                    fixture().append('<div class="v-l-test-root"></div>')
                    target = new veronica.LayoutManager({
                        rootNode: '.v-l-test-root',
                        app: app
                    })
                    var actual2 = target._getLayoutRoot();
                    expect(actual2.hasClass('v-l-test-root')).to.be.true;
                })

                it('change', function () {
                    var actual1 = target.change('xxx');
                    expect(actual1.state()).to.equal('resolved');

                    var html = '<div class="tt"></div>';
                    target.add('test', html)
                    var actual2 = target.change('test');
                    expect(getLayoutRoot().html()).to.equal(html);
                })
            })

            describe('PageManager', function () {
                var app;
                var target;
                beforeEach(function () {
                    app = veronica.createApp();
                    target = new veronica.PageManager({
                        app: app
                    });

                    target.add('_common', {
                        widgets: [{
                            name: 'basic',
                            options: {
                                _hostNode: 'sxsd',
                                _context: 'mainxx'
                            }
                        }]
                    })

                    target.add('page1', {
                        widgets: [
                            'www@csd=>#sdf'
                        ],
                        inherits: ['_common']
                    })

                    target.add('page2', {
                        widgets: [
                            'www@csd=>#sdf'
                        ],
                        layout: 'layout1'
                    })

                    target.add('page3', {
                        widgets: [
                            'www@csd=>#sdf'
                        ],
                        layout: 'layout1'
                    })

                    target.add('page4', {
                        widgets: [
                            'www@csd=>#sdf'
                        ],
                        layout: 'layout2'
                    })
                });

                it('_build', function () {
                    // default is false
                    // target.options.autoResolvePage = false;
                    var actual = target._build('pagexxx');
                    expect(actual).to.be.null;

                    target.options.autoResolvePage = true;
                    var pname = 'pagexxx';
                    var actual2 = target._build(pname);
                    var expected = {
                        name: pname,
                        widgets: [pname]
                    };
                    expect(actual2).to.deep.equal(expected);
                    var envActual = target.get(pname);
                    expect(envActual).to.have.property('name', pname);
                    expect(envActual).to.have.property('widgets')
                        .that.is.an('array').that.deep.equals([pname]);
                })

                it('_getAllWidgetConfigs', function () {
                    var p = target.get('page1');
                    var actual = target._getAllWidgetConfigs(p);
                    expect(actual).to.deep.equal([
                        'www@csd=>#sdf',
                        {
                            name: 'basic',
                            options: {
                                _hostNode: 'sxsd',
                                _context: 'mainxx'
                            }
                        }
                    ])
                })

                it('_setCurrName', function () {
                    target._setCurrName('page1');
                    expect(target._currPageName).to.equal('page1');
                })

                it('getCurrName', function () {
                    target._setCurrName('page1');
                    var actual = target.getCurrName();
                    expect(actual).to.equal('page1');
                })

                it('_changeLayout', function () {
                    var callee = app.layout.change = sinon.stub().returns(_.doneDeferred());
                    var actual = target._changeLayout('layout1');
                    expect(callee).to.have.been.called;
                    expect(actual.done).to.be.a('function');
                    expect(actual.state()).to.equal('resolved');

                    // 如果是相同页面，则不进行改变
                    var callee1 = sinon.spy();
                    target._setCurrName('page2')
                    target._changeLayout('layout1');
                    expect(callee1).not.to.have.been.called;
                })

                it('_loadWidgets', function () {
                    var callee1 = app.widget.start = sinon.stub().returns(_.doneDeferred());
                    var callee2 = app.widget.recycle = sinon.spy();

                    target._loadWidgets([]);

                    expect(callee1).to.have.been.called;
                    expect(callee2).to.have.been.called;
                })

                it('resolve', function () {
                    var stub1 = target.get = sinon.stub().returns({});
                    var stub2 = target._getAllWidgetConfigs = sinon.stub().returns({});
                    var actual = target.resolve();
                    expect(stub1).to.have.been.called;
                    expect(stub2).to.have.been.called;
                    expect(actual.state()).to.equal('resolved');
                    actual.done(function (result) {
                        expect(result).to.deep.equal({
                            widgets: {}
                        });
                    });

                    // 如果未找到配置，则尝试构建
                    stub1 = target.get = sinon.stub().returns(null);
                    var stub3 = target._build = sinon.stub().returns({});
                    target.resolve();
                    expect(stub3).to.have.been.called;
                })

                it('change', function () {
                    var pubStub = app.pub = sinon.spy();
                    var resolveStub = target.resolve = sinon.stub().returns(_.doneDeferred({}));
                    var changeLayoutStub = target._changeLayout = sinon.stub().returns(_.doneDeferred());
                    var loadWidgetsStub = target._loadWidgets = sinon.stub().returns(_.doneDeferred());
                    var setCurrNameStub = target._setCurrName = sinon.spy();

                    target.change('name');
                    expect(pubStub).to.have.been.calledWith('pageLoading', 'name');
                    expect(pubStub).to.have.been.calledWith('pageLoaded', 'name');
                    expect(pubStub).to.have.been.callCount(2);
                    expect(resolveStub).to.have.been.called;
                    expect(changeLayoutStub).to.have.been.called;
                    expect(loadWidgetsStub).to.have.been.called;
                    expect(setCurrNameStub).to.have.been.called;
                })
            })

            describe('Sandbox', function () {
                var app;
                var target;
                var noop = function(){};

                beforeEach(function () {
                    app = veronica.createApp();
                    target = new veronica.Sandbox({
                        app: app,
                        name: 'test',
                        _ownerType: 'widget'

                    })
                });

                it('has properties', function(){

                });

                it('log', function(){
                    var logStub = app.logger.log = sinon.spy();
                    var warnStub = app.logger.warn = sinon.spy();
                    var errortub = app.logger.error = sinon.spy();
                    var infoStub = app.logger.info = sinon.spy();
                    var setNameStub = app.logger.setName = sinon.spy();

                    target.log('xxx');
                    expect(logStub).to.have.been.calledWith('xxx');
                    expect(setNameStub).to.have.been.calledWith('widget(test)');
                    expect(setNameStub).to.have.been.calledWith();

                    // 支持复合参数
                    var args = ['xxx', {}];
                    target.log(args);
                    expect(logStub).to.have.been.calledWith('xxx', {});

                    target.log('xxx', 'warn');
                    expect(warnStub).to.have.been.called;

                    target.log('xxx', 'error');
                    expect(errortub).to.have.been.called;

                    target.log('xxx', 'info');
                    expect(infoStub).to.have.been.called;
                });

                it('emit', function(){
                    var stub = app.mediator.emit = sinon.spy();

                    target.emit({
                        _target: 'children'
                    });

                    expect(stub).to.have.been.calledWith({
                        _target: 'children',
                        _senderId: target._id
                    });

                    target.emit('xxx')
                    expect(stub).to.have.been.calledWith('xxx');

                    // 正加载时，会延迟执行
                    var pushStub = app.emitQueue.push = sinon.spy();

                    app.widget._isLoading = true;
                    target.emit('xx');
                    expect(pushStub).to.have.been.called;
                    app.widget._isLoading = false;

                    // 会记日志
                    var logStub = target.log = sinon.spy();
                    target.emit('xx');
                    expect(logStub).to.have.been.called;


                });

                it('on', function(){

                });
            })

            describe('SandboxManager', function () {
                var app;
                var target;
                var noop = function(){};

                beforeEach(function () {
                    app = veronica.createApp();
                    target = new veronica.SandboxManager({
                        app: app,
                        name: 'test',
                        _ownerType: 'widget'

                    })
                });

                it('create', function(){
                   var stub = target.add = spy.spy();
                    var actual = target.create();

                })
            })

            describe('WidgetManager', function(){
                var app;
                var target;
                var noop = function(){};

                beforeEach(function () {
                    app = veronica.createApp();
                    target = new veronica.WidgetManager({
                        app: app
                    })
                });

                it('register')
            })
        })
    });
