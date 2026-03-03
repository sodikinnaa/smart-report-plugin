/**
 * Smart Report MCP Plugin for OpenClaw
 */
import axios from 'axios';
const PLUGIN_ID = 'smart-report-plugin';
const API_BASE = 'https://smartreport.siapdigital.my.id/api/mcp';
async function callMcp(api, method, params = {}) {
    const config = api.config;
    const token = config?.apiToken;
    if (!token) {
        throw new Error('API Token not found. Please run "openclaw smart-auth <token>" first.');
    }
    const response = await axios.post(API_BASE, {
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
const plugin = {
    id: PLUGIN_ID,
    name: "Smart Report Integration",
    version: "2.1.4",
    register(api) {
        // 1. CLI Commands
        api.registerCli(({ program }) => {
            program
                .command('smart-auth <token>')
                .description('Set API Token for Smart Report integration')
                .action(async (token) => {
                await api.saveConfig({ apiToken: token });
                console.log('✅ Smart Report API Token saved successfully.');
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
            description: 'Complete list of active employees with division names',
            mimeType: 'application/json',
            read: async () => {
                const data = await callMcp(api, 'employees/list', {});
                return { content: JSON.stringify(data, null, 2) };
            }
        });
        api.registerResource({
            uri: 'smartreport://divisions',
            name: 'Division List',
            description: 'List of all divisions in the company',
            mimeType: 'application/json',
            read: async () => {
                const data = await callMcp(api, 'divisions/list', {});
                return { content: JSON.stringify(data, null, 2) };
            }
        });
        api.registerResource({
            uri: 'smartreport://guides',
            name: 'Guides List',
            description: 'List of all available dynamic guides',
            mimeType: 'application/json',
            read: async () => {
                const data = await callMcp(api, 'guides/list', {});
                return { content: JSON.stringify(data, null, 2) };
            }
        });
        api.registerResource({
            uri: 'smartreport://dashboard',
            name: 'Daily Dashboard',
            description: 'Real-time KPI dashboard (stats, highlights, alerts)',
            mimeType: 'application/json',
            read: async (params) => {
                const data = await callMcp(api, 'smartreport/dashboard', params || {});
                return { content: JSON.stringify(data, null, 2) };
            }
        });
        // 3. Agent Tools
        api.registerTool({
            name: 'get_daily_dashboard',
            description: 'Retrieve real-time KPI dashboard (stats, highlights, alerts).',
            execute: async (args) => {
                try {
                    const data = await callMcp(api, 'smartreport/dashboard', args);
                    return { text: JSON.stringify(data, null, 2) };
                }
                catch (err) {
                    return { error: err.message };
                }
            }
        });
        api.registerTool({
            name: 'get_guides_list',
            description: 'Retrieve list of all available dynamic guides.',
            execute: async () => {
                try {
                    const data = await callMcp(api, 'guides/list', {});
                    return { text: JSON.stringify(data, null, 2) };
                }
                catch (err) {
                    return { error: err.message };
                }
            }
        });
        api.registerTool({
            name: 'get_guide_content',
            description: 'Retrieve full content of a specific guide by ID.',
            execute: async (args) => {
                try {
                    const data = await callMcp(api, 'guides/get', args);
                    return { text: JSON.stringify(data, null, 2) };
                }
                catch (err) {
                    return { error: err.message };
                }
            }
        });
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
};
export default plugin;
export const register = plugin.register;
export const activate = plugin.register;
