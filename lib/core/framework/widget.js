define([
    '../base/index',
    './appComponent'
], function (baseLib, AppComponent) {

    'use strict';

    var _ = baseLib._;
    var $ = baseLib.$;

    // thx: Backbone

    var delegateEventSplitter = /^(\S+)\s*(.*)$/;
    var viewOptions = [
        'model', 'collection',
        'el', 'id', 'attributes',
        'className', 'tagName', 'events',
        '_name', '_widgetName', '_context'
    ];

    var Widget = AppComponent.extend({
        initialize: function (options) {
            options || (options = {});
            this.supr(options);
            /**
             * 唯一标识符
             * @var {string} _id
             * @memberOf Sandbox#
             */
            this._id = _.uniqueId('widget$');
            this._type = 'widget';
            /**
             * 子集
             * @var {SandboxChildren[]} _children
             * @memberOf Sandbox#
             * @private
             */
            this._children = [];
            /**
             * 事件池
             * @type {Array}
             * @private
             */
            this._messages = [];

            this.cid = _.uniqueId('view');
            _.extend(this, _.pick(options, viewOptions));

            this._ensureElement();
            this._initialize.apply(this, arguments);
            this.delegateEvents();
        },
        tagName: 'div',

        $: function (selector) {
            return this.$el.find(selector);
        },
        _initialize: function () { },

        render: function () {
            return this;
        },

        remove: function () {
            this.$el.remove();
            this.stopListening();
            return this;
        },

        setElement: function (element, delegate) {
            if (this.$el) this.undelegateEvents();
            this.$el = element instanceof $ ? element : $(element);
            this.el = this.$el[0];
            if (delegate !== false) this.delegateEvents();
            return this;
        },

        delegateEvents: function (events) {
            if (!(events || (events = _.result(this, 'events')))) return this;
            this.undelegateEvents();
            for (var key in events) {
                var method = events[key];
                if (!_.isFunction(method)) method = this[events[key]];
                if (!method) continue;

                var match = key.match(delegateEventSplitter);
                var eventName = match[1], selector = match[2];
                method = _.bind(method, this);
                eventName += '.delegateEvents' + this.cid;
                if (selector === '') {
                    this.$el.on(eventName, method);
                } else {
                    this.$el.on(eventName, selector, method);
                }
            }
            return this;
        },

        undelegateEvents: function () {
            this.$el.off('.delegateEvents' + this.cid);
            return this;
        },

        _ensureElement: function () {
            if (!this.el) {
                var attrs = _.extend({}, _.result(this, 'attributes'));
                if (this.id) attrs.id = _.result(this, 'id');
                if (this.className) attrs['class'] = _.result(this, 'className');
                var $el = Backbone.$('<' + _.result(this, 'tagName') + '>').attr(attrs);
                this.setElement($el, false);
            } else {
                this.setElement(_.result(this, 'el'), false);
            }
        }
    });

    return Widget;
});
