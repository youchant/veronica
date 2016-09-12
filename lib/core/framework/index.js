define([
    './appComponent',
    './appProvider',
    './appRouter',
    './layoutManager',
    './pageManager',
    './widgetManager',
    './widgetDefManager'
], function (AppComponent, AppProvider, AppRouter, LayoutManager, PageManager,
              WidgetManager, WidgetDefManager) {

    'use strict';

    var frameworkLib = {
        AppComponent: AppComponent,
        AppProvider: AppProvider,
        AppRouter: AppRouter,
        LayoutManager: LayoutManager,
        PageManager: PageManager,
        WidgetManager: WidgetManager,
        WidgetDefManager: WidgetDefManager
    }

    return frameworkLib;
});
