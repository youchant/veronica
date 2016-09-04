define([
    'lodash',
    './base/index',
    './framework/index'
], function (_, base, framework) {

    'use strict';

    var extend = _.extend;

    var coreLib = {};

    extend(coreLib, base);
    extend(coreLib, framework);

    return coreLib;

});
