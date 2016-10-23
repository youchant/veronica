define([
    'jquery',
    './lodashExt/index',
    './class',
    './Observable',
    './logger',
    './history'
], function ($, _, createClass, Observable, Logger, History) {

    'use strict';

    /**
     * veronica 核心对象
     * @namespace veronica
     */
    var baseLib = {
        _: _,
        /**
         * DOM/Ajax/Promise 工具套件
         * @memberOf veronica
         */
        $: $,
        createClass: createClass,
        Observable: Observable,
        Logger: Logger,
        History: History,
        /**
         * 浏览器历史实例
         * @type {veronica.History}
         * @memberOf veronica
         */
        history: new History
    };

    return baseLib;
});
