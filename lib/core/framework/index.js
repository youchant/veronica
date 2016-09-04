define([
    './appComponent',
    './appProvider',
    './appRouter',
    './layoutManager',
    './pageManager',
    './sandboxManager',
    './viewManager',
    './widgetManager'
], function (AppComponent, AppProvider, AppRouter, LayoutManager, PageManager, SandboxManager, ViewManager, WidgetManager) {

    'use strict';

    var frameworkLib = {
        AppComponent: AppComponent,
        AppProvider: AppProvider,
        AppRouter: AppRouter,
        LayoutManager: LayoutManager,
        PageManager: PageManager,
        SandboxManager: SandboxManager,
        ViewManager: ViewManager,
        WidgetManager: WidgetManager
    }

    return frameworkLib;
});
