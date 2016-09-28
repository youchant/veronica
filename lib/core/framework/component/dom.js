define([
    '../../base/index'
],function (baseLib) {

    var $ = baseLib.$;
    var _ = baseLib._;
    var delegateEventSplitter = /^(\S+)\s*(.*)$/;
    var COMPONENT_CLASS = 'ver-widget';
    var COMPONENT_REF_NAME = '__widgetRef__';

    // thx: Backbone

    return function (base) {

        /** @lends veronica.View# */
        var methods = {
            tagName: 'div',
            $: function (selector) {
                return this.$el.find(selector);
            },

            removeElement: function () {
                this.$el.remove();
                return this;
            },

            setElement: function (element, delegate) {
                if (this.$el) this.undelegateDOMEvents();
                this.$el = element instanceof $ ? element : $(element);
                this.el = this.$el[0];

                // hook element
                this.$el
                    .addClass(COMPONENT_CLASS)
                    .data(COMPONENT_REF_NAME, this._id);

                // TODO: 这里涉及到继承时的类名设置
                if (this.options._xtypes) {
                    this.$el.addClass(this.options._xtypes.join(' '));
                }

                if (delegate !== false) this.delegateDOMEvents();
                return this;
            },

            delegateDOMEvents: function (events) {
                if (!(events || (events = _.result(this, 'events')))) return this;
                this.undelegateDOMEvents();
                for (var key in events) {
                    var method = events[key];
                    if (!_.isFunction(method)) method = this[events[key]];
                    if (!method) continue;

                    var match = key.match(delegateEventSplitter);
                    var eventName = match[1], selector = match[2];
                    method = _.bind(method, this);
                    eventName += '.delegateEvents' + this._id;
                    if (selector === '') {
                        this.$el.on(eventName, method);
                    } else {
                        this.$el.on(eventName, selector, method);
                    }
                }
                return this;
            },

            undelegateDOMEvents: function () {
                this.$el.off('.delegateEvents' + this._id);
                return this;
            },

            _ensureElement: function () {
                if (!this.el) {
                    var attrs = _.extend({}, _.result(this, 'attributes'));
                    if (this.id) attrs.id = _.result(this, 'id');
                    if (this.className) attrs['class'] = _.result(this, 'className');
                    var $el = $('<' + _.result(this, 'tagName') + '>').attr(attrs);
                    this.setElement($el, false);
                } else {
                    this.setElement(_.result(this, 'el'), false);
                }
            }
        };

        base._extend({
            methods: methods
        });

    };
});
