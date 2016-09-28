define([
    './appPart',
    './appProvider',
    './appRouter',
    './layoutManager',
    './pageManager',
    './componentManager',
    './componentDefManager',
    './component/index'
], function (AppPart, AppProvider, AppRouter, LayoutManager, PageManager,
              ComponentManager, ComponentDefManager, Component) {

    'use strict';

    var frameworkLib = {
        AppPart: AppPart,
        AppProvider: AppProvider,
        AppRouter: AppRouter,
        LayoutManager: LayoutManager,
        PageManager: PageManager,
        ComponentManager: ComponentManager,
        ComponentDefManager: ComponentDefManager,
        Component: Component
    }

    return frameworkLib;
});
