"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = exports.register = void 0;
const client_1 = require("./client");
const commands_1 = require("./commands");
const resources_1 = require("./resources");
const tools_1 = require("./tools");
const plugin = {
    id: client_1.PLUGIN_ID,
    name: 'Smart Report Integration',
    version: '2100.11.6',
    register(api) {
        (0, commands_1.registerCommands)(api);
        (0, resources_1.registerResources)(api);
        (0, tools_1.registerTools)(api);
    },
};
const register = (api) => plugin.register(api);
exports.register = register;
const activate = (api) => plugin.register(api);
exports.activate = activate;
exports.default = plugin;
