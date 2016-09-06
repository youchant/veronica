define(['chai', 'sinon', 'veronica'], function (chai, sinon, veronica) {

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

            var Location = function(href) {
                this.replace(href);
            };

            _.extend(Location.prototype, {

                parser: document.createElement('a'),

                replace: function(href) {
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

                toString: function() {
                    return this.href;
                }

            });


            beforeEach(function () {
                app = new veronica.createApp();
                location = new Location(testUrl);
                history = _.extend(new veronica.History, { location: location });
                history.interval = 9;


                // mock & stubs
                app.sandbox.startWidgets = sinon.spy();
                app.page.change = sinon.spy();
                target = new veronica.AppRouter({
                    homePage: 'home',
                    testing: 101,
                    app: app,
                    history: history
                });
                history.start({pushState: false});
            })
            afterEach(function(){
                history.stop();
            })

            it('entry', function () {
                var cb1 = target._changePage = sinon.spy();
                location.replace(testUrl + '#?123');
                history.checkUrl();


                // var cb2 = app.page.change = sinon.spy();
                // location.replace(testUrl + '#/');
                // history.checkUrl();
                expect(cb1.calledWith('home', '123')).to.be.true;

                // setTimeout(function(){
                //     console.log(cb1.id);
                //     // expect(cb2.calledWith('home', null)).to.be.true;
                // }, 1000)


            })


        })
    })
});
