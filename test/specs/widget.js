define([
    'chai', 'sinon', 'sinon-chai', 'veronica'
], function (chai, sinon, sinonChai, veronica) {

 describe('App - WidgetManager', function(){
     var app;
     var target;

     beforeEach(function(){
         app = new veronica.createApp();
         target = new WidgetManager({
             app: app
         });
     })
     it('has props', function(){
         expect(target._declarationPool).to.eql({});
         expect(target._runningPool).to.eql({});
         expect(target._currBatchName).to.be.null;
         expect(target._currBatchConfigList).to.eql([]);
         expect(target._lastBatchConfigList).to.eql([]);
         expect(target._isLoading).to.be.false;
     })

     it('isLoading', function(){
         expect(target.isLoading()).to.be.false;
     })

     it('register', function(){
         target.register('test', {
             test: 'xxx'
         });

         expect(target.hasLocal('test'))
     })
 })
});
