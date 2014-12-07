define([
    'table-to-json',
    'kendo-ui'
], function (undefined) {
    return function (app) {

        app.listUtil = app.listUtil || {};

        // 启用列表选择(简单方式)
        app.listUtil.enableSelectable = function (context, selector, eventName) {
            var $el = context.$el.find(selector);
            eventName || (eventName = 'selected.list');
            $el.on('click', 'tbody tr', function (e) {
                var $tr = $(e.target).closest('tr');
                if ($tr.hasClass('selected')) return;
                $tr.parent().find('.selected').removeClass('selected');
                $tr.addClass('selected');
                context.trigger(eventName, $tr.data());
            })
        }

        // 启用列表选择(使用kendoui)
        app.listUtil.enableSelectable = function (context, selector, eventName) {
            var $el = context.$el.find(selector);
            new kendo.ui.Selectable($el, {
                aria: true,
                multiple: true,
                filter: ">*",
                change: function () {
                    context.trigger(eventName || (eventName = 'selected.list'));
                }
            });
        }

        // 获取选中项，返回 jQuery 对象
        app.listUtil.getSelected = function ($list) {
            var $s = $list.find('tbody tr.selected');
            if ($s.length === 0) {
                return null;
            } else {
                return $s;
            }
        };

        app.listUtil.getSelectedItem = function (list) {
            var source = list.dataSource;
            var items = _.map(list.select(), function (el) {
                if (list.dataItem) {
                    return list.dataItem($(el));
                } else {
                    var uid = $(el).data().uid;
                    if (source.getByUid) {
                        return source.getByUid(uid);
                    } else {
                        return _.find(source, function (item) {
                            return item.uid === uid;
                        });
                    }
                }
            });
            return items.length === 0 ? null : (items.length === 1 ? items[0] : items);
        };

        app.listUtil.getSelectedId = function (list) {
            var dataItem = app.listUtil.getSelectedItem(list);
            if (_.isArray(dataItem)) {
                return _.map(dataItem, function (item) {
                    return item.id;
                })
            }
            return dataItem === null ? dataItem : dataItem.id;
        };

        // 确定已选择
        app.listUtil.confirmSelected = function ($list, callback) {
            var item = app.listUtil.getSelected($list);
            if (item == null) {
                app.notify.warn('请选择一条数据！');
                // alert('请选择一条数据！');
            } else {
                callback.call(this, item);
            }
        }

        app.listUtil.toJSON = function ($list) {
            if ($list.is('table')) {
                var options = $list.data();
                return $list.tableToJSON(options);
            } else {
                return $.map($list.children(), function (item) {
                    return $(item).data();
                });
            }
        }
    };
});
