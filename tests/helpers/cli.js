"use strict";

var path = require("path");
var Module = require("module");

module.exports = function cliTest(test, testFunc) {
    // Alter the require cache to make the cli/targets/static work since it requires "protobufjs"
    // and we don't want to mess with "npm link"
    var savedResolveFilename = Module._resolveFilename;
    Module._resolveFilename = function(request, parent) {
      if (request.startsWith("protobufjs")) {
        return request;
      }
      return savedResolveFilename(request, parent);
    };
    require.cache.protobufjs = require.cache[path.resolve("index.js")];

    try {
        testFunc();
    } finally {
        // Rollback all the require() related mess we made
        delete require.cache.protobufjs;
        Module._resolveFilename = savedResolveFilename;
    }
};
