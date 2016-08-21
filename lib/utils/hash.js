define([
], function () {
    return function () {
        // 添加简单的hash支持

        var hash = function (name, value) {
            function isString(obj) {
                return typeof obj == "string" || Object.prototype.toString.call(obj) === "[object String]";
            }

            if (!isString(name) || name == "") {
                return;
            }
            name = encodeURIComponent(name);
            var clearReg = new RegExp("(;" + name + "=[^;]*)|(\\b" + name + "=[^;]*;)|(\\b" + name + "=[^;]*)", "ig");
            var getReg = new RegExp(";*\\b" + name + "=[^;]*", "i");
            if (typeof value == "undefined") {
                var result = location.hash.match(getReg);
                return result ? decodeURIComponent($.trim(result[0].split("=")[1])) : null;
            }
            else if (value === null) {
                location.hash = location.hash.replace(clearReg, "");
            }
            else {
                value = value + "";
                var temp = location.hash.replace(clearReg, "");
                temp += ";" + name + "=" + encodeURIComponent(value);
                location.hash = temp;
            }
        };

        return hash;

    };
});
