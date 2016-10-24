define([
    './appPart',
    './appProvider',
    './appRouter',
    './layoutManager',
    './pageManager',
    './componentManager',
    './componentDefManager'
], function (AppPart, AppProvider, AppRouter, LayoutManager, PageManager,
              ComponentManager, ComponentDefManager) {

    'use strict';

    var frameworkLib = {
        AppPart: AppPart,
        AppProvider: AppProvider,
        AppRouter: AppRouter,
        LayoutManager: LayoutManager,
        PageManager: PageManager,
        ComponentManager: ComponentManager,
        ComponentDefManager: ComponentDefManager
    };

    return frameworkLib;
});

