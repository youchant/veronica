define([
    './appComponent',
    './appProvider',
    './appRouter',
    './layoutManager',
    './pageManager',
    './widgetManager'
], function (AppComponent, AppProvider, AppRouter, LayoutManager, PageManager,
              WidgetManager) {

    'use strict';

    var frameworkLib = {
        AppComponent: AppComponent,
        AppProvider: AppProvider,
        AppRouter: AppRouter,
        LayoutManager: LayoutManager,
        PageManager: PageManager,
        WidgetManager: WidgetManager
    }

    return frameworkLib;
});
