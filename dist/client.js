"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_BASE = exports.PLUGIN_ID = void 0;
exports.resolveToken = resolveToken;
exports.savePluginConfig = savePluginConfig;
exports.callMcp = callMcp;
exports.normalizeToolError = normalizeToolError;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
exports.PLUGIN_ID = 'smart-report-plugin';
exports.API_BASE = 'https://member.smartreport.my.id/api/mcp';
function resolveToken(api) {
    const pluginToken = api?.pluginConfig?.apiToken;
    if (typeof pluginToken === 'string' && pluginToken.trim())
        return pluginToken;
    const configToken = api?.config?.apiToken;
    if (typeof configToken === 'string' && configToken.trim())
        return configToken;
    const nestedToken = api?.config?.plugins?.entries?.[exports.PLUGIN_ID]?.config?.apiToken;
    if (typeof nestedToken === 'string' && nestedToken.trim())
        return nestedToken;
    return undefined;
}
function getCandidateConfigPaths() {
    const home = os_1.default.homedir();
    return [
        path_1.default.join(home, '.openclaw', 'openclaw.json'),
        path_1.default.join(home, '.openclaw', 'config.json'),
        '/root/.openclaw/openclaw.json',
        '/root/.openclaw/config.json',
        '/etc/openclaw/openclaw.json',
        '/etc/openclaw/config.json',
    ];
}
function persistPluginConfigToFile(config) {
    const configPath = getCandidateConfigPaths().find((candidate) => fs_1.default.existsSync(candidate));
    if (!configPath) {
        return;
    }
    const raw = fs_1.default.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    parsed.plugins = parsed.plugins || {};
    parsed.plugins.entries = parsed.plugins.entries || {};
    const previousEntry = parsed.plugins.entries[exports.PLUGIN_ID] && typeof parsed.plugins.entries[exports.PLUGIN_ID] === 'object'
        ? parsed.plugins.entries[exports.PLUGIN_ID]
        : {};
    const previousConfig = previousEntry.config && typeof previousEntry.config === 'object'
        ? previousEntry.config
        : {};
    parsed.plugins.entries[exports.PLUGIN_ID] = {
        ...previousEntry,
        enabled: true,
        config: {
            ...previousConfig,
            ...config,
        },
    };
    fs_1.default.writeFileSync(configPath, JSON.stringify(parsed, null, 2));
}
async function savePluginConfig(api, config) {
    if (typeof api.saveConfig === 'function') {
        await api.saveConfig(config);
        return;
    }
    api.pluginConfig = {
        ...(api.pluginConfig || {}),
        ...config,
    };
    persistPluginConfigToFile(config);
}
async function callMcp(api, method, params = {}) {
    const token = resolveToken(api);
    if (!token) {
        throw new Error('API token not found. Jalankan "openclaw smart-auth <token>" terlebih dahulu.');
    }
    const response = await axios_1.default.post(exports.API_BASE, {
        jsonrpc: '2.0',
        method,
        params,
        id: Date.now(),
    }, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        timeout: 8000,
    });
    if (response.data?.error?.message) {
        throw new Error(String(response.data.error.message));
    }
    return response.data?.result;
}
function normalizeToolError(error) {
    if (error instanceof Error) {
        return { error: error.message };
    }
    return { error: 'Unknown Smart Report plugin error' };
}
