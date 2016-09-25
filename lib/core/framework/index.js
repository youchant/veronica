define([
    './appComponent',
    './appProvider',
    './appRouter',
    './layoutManager',
    './pageManager',
    './widgetManager',
    './widgetDefManager',
    './widget/index'
], function (AppComponent, AppProvider, AppRouter, LayoutManager, PageManager,
              WidgetManager, WidgetDefManager, Widget) {

    'use strict';

    var frameworkLib = {
        AppComponent: AppComponent,
        AppProvider: AppProvider,
        AppRouter: AppRouter,
        LayoutManager: LayoutManager,
        PageManager: PageManager,
        WidgetManager: WidgetManager,
        WidgetDefManager: WidgetDefManager,
        Widget: Widget
    }

    return frameworkLib;
});
