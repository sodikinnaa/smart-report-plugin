"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = register;
/**
 * Smart Report MCP Plugin for OpenClaw
 */
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const PLUGIN_ID = 'smart-report-plugin';
const API_BASE = 'https://smartreport.siapdigital.my.id/api/mcp';
function saveConfig(token) {
    const configPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
    if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(raw);
        if (!config.plugins)
            config.plugins = {};
        if (!config.plugins.entries)
            config.plugins.entries = {};
        if (!config.plugins.entries[PLUGIN_ID])
            config.plugins.entries[PLUGIN_ID] = {};
        if (!config.plugins.entries[PLUGIN_ID].config)
            config.plugins.entries[PLUGIN_ID].config = {};
        config.plugins.entries[PLUGIN_ID].config.apiToken = token;
        config.plugins.entries[PLUGIN_ID].enabled = true;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
}
async function callMcp(api, method, params = {}) {
    const config = api.config.plugins?.entries?.[PLUGIN_ID]?.config;
    const token = config?.apiToken;
    if (!token) {
        throw new Error('API Token not found. Please run "openclaw smart-auth <token>" first.');
    }
    const response = await axios_1.default.post(API_BASE, {
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: Date.now()
    }, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });
    if (response.data.error) {
        throw new Error(response.data.error.message);
    }
    return response.data.result;
}
function register(api) {
    // 1. CLI Commands
    api.registerCli(({ program }) => {
        program
            .command('smart-auth <token>')
            .description('Set API Token for Smart Report integration')
            .action((token) => {
            try {
                saveConfig(token);
                console.log('✅ Smart Report API Token saved successfully.');
                process.exit(0);
            }
            catch (err) {
                console.error('❌ Failed to save config:', err.message);
                process.exit(1);
            }
        });
    }, { commands: ['smart-auth'] });
    // 2. Resources
    api.registerResource({
        uri: 'smartreport://reports',
        name: 'Recent Reports',
        description: 'Stream of latest submitted reports',
        mimeType: 'application/json',
        read: async () => {
            const data = await callMcp(api, 'reports/list', { per_page: 10 });
            return { content: JSON.stringify(data, null, 2) };
        }
    });
    api.registerResource({
        uri: 'smartreport://employees',
        name: 'Employee List',
        description: 'Complete list of active employees',
        mimeType: 'application/json',
        read: async () => {
            const data = await callMcp(api, 'employees/list', {});
            return { content: JSON.stringify(data, null, 2) };
        }
    });
    api.registerResource({
        uri: 'smartreport://debt-aging',
        name: 'Debt Aging Analysis',
        description: 'Analysis of pending tasks and overdue reports',
        mimeType: 'application/json',
        read: async () => {
            const data = await callMcp(api, 'attendance/list_absent', { include_reason: true });
            return { content: JSON.stringify(data, null, 2) };
        }
    });
    // 3. Agent Tools
    api.registerTool({
        name: 'get_list_reports',
        description: 'Retrieve reports with filters (date, employee, division).',
        execute: async (args) => {
            try {
                const data = await callMcp(api, 'reports/list', args);
                return { text: JSON.stringify(data, null, 2) };
            }
            catch (err) {
                return { error: err.message };
            }
        }
    });
    api.registerTool({
        name: 'get_debt_analysis',
        description: 'Analyze pending tasks and employee performance debt.',
        execute: async (args) => {
            try {
                const data = await callMcp(api, 'analyze_performance', args);
                return { text: JSON.stringify(data, null, 2) };
            }
            catch (err) {
                return { error: err.message };
            }
        }
    });
}
