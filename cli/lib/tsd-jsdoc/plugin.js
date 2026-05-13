"use strict";

var typeParserPatched = false;

function normalizeType(type) {
    return type.replace(/\r?\n|\r/g, "\n");
}

function patchTypeScriptTypes(dictionary) {
    var type = require("jsdoc/tag/type");
    var parse = type.parse,
        typeTag = dictionary.lookUp("type");

    if (typeTag && !typeTag.protobufjsPatched) {
        typeTag.onTagText = function onTypeTagText(text) {
            var openIdx = text.indexOf("{"),
                closeIdx = text.indexOf("}");

            if (openIdx !== 0 || closeIdx <= openIdx + 1)
                text = "{" + text + "}";

            return text;
        };
        typeTag.protobufjsPatched = true;
    }

    if (typeParserPatched)
        return;
    typeParserPatched = true;

    type.parse = function parseTypeScriptType(tagValue, canHaveName, canHaveType) {
        try {
            return parse(tagValue, canHaveName, canHaveType);
        } catch (e) {
            if (!canHaveType)
                throw e;

            var text = String(tagValue || "");
            var open = text.indexOf("{");
            if (open < 0)
                throw e;

            var depth = 0;
            var close = -1;
            for (var i = open; i < text.length; ++i) {
                var ch = text.charAt(i);
                if (ch === "{")
                    ++depth;
                else if (ch === "}" && --depth === 0) {
                    close = i;
                    break;
                }
            }
            if (close < 0)
                throw e;

            var expression = normalizeType(text.substring(open + 1, close)).trim();
            if (!/[&;]|\?:|=>|\bkeyof\b|\btypeof\b|^\s*\{/.test(expression))
                throw e;

            var name = canHaveName ? text.substring(close + 1).trim() : "";
            return {
                type: [ expression ],
                typeExpression: expression,
                name: name
            };
        }
    };
}

exports.defineTags = function(dictionary) {
    patchTypeScriptTypes(dictionary);

    dictionary.defineTag("template", {
        mustHaveValue: true,
        canHaveType: false,
        canHaveName: false,
        onTagged: function(doclet, tag) {
            (doclet.templates || (doclet.templates = [])).push(tag.text);
        }
    });

    dictionary.defineTag("tstype", {
        mustHaveValue: true,
        canHaveType: false,
        canHaveName: false,
        onTagged: function(doclet, tag) {
            doclet.tsType = normalizeType(tag.text);
        }
    });
};
