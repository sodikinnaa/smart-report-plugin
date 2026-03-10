/**
 * Smart Report MCP Plugin for OpenClaw
 */
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const PLUGIN_ID = 'smart-report-plugin';
const API_BASE = 'https://member.smartreport.my.id/api/mcp';

function resolveToken(api: any): string | undefined {
    return api?.pluginConfig?.apiToken
        || api?.config?.apiToken
        || api?.config?.plugins?.entries?.[PLUGIN_ID]?.config?.apiToken;
}

function saveTokenFallback(token: string, companyInfo?: any) {
    const cfgPath = path.join(process.env.HOME || '/root', '.openclaw', 'openclaw.json');
    if (!fs.existsSync(cfgPath)) return;
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    cfg.plugins = cfg.plugins || {};
    cfg.plugins.entries = cfg.plugins.entries || {};
    cfg.plugins.entries[PLUGIN_ID] = cfg.plugins.entries[PLUGIN_ID] || {};
    cfg.plugins.entries[PLUGIN_ID].enabled = true;
    cfg.plugins.entries[PLUGIN_ID].config = cfg.plugins.entries[PLUGIN_ID].config || {};
    cfg.plugins.entries[PLUGIN_ID].config.apiToken = token;
    if (companyInfo?.name) cfg.plugins.entries[PLUGIN_ID].config.companyName = companyInfo.name;
    if (companyInfo?.domain) cfg.plugins.entries[PLUGIN_ID].config.companyDomain = companyInfo.domain;
    cfg.plugins.allow = Array.isArray(cfg.plugins.allow) ? cfg.plugins.allow : [];
    if (!cfg.plugins.allow.includes(PLUGIN_ID)) cfg.plugins.allow.push(PLUGIN_ID);
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
}

async function callMcp(api: any, method: string, params: any = {}) {
    const token = resolveToken(api);

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

const plugin: any = {
    id: PLUGIN_ID,
    name: "Smart Report Integration",
    version: "2100.11.5",
    
    register(api: any) {
        // 1. CLI Commands
        api.registerCli(({ program }: any) => {
            program
                .command('smart-auth <token>')
                .description('Set API Token for Smart Report integration')
                .action(async (token: string) => {
                    process.stdout.write('🔍 Verifying token and fetching company info...');
                    try {
                        // Temporarily set token to verify
                        api.pluginConfig = api.pluginConfig || {};
                        api.pluginConfig.apiToken = token;
                        const companyInfo = await callMcp(api, 'company/info', {});

                        if (typeof api.saveConfig === 'function') {
                            await api.saveConfig({
                                apiToken: token,
                                companyName: companyInfo.name,
                                companyDomain: companyInfo.domain
                            });
                        } else {
                            saveTokenFallback(token, companyInfo);
                        }

                        console.log(`\r✅ Authenticated for: ${companyInfo.name} (${companyInfo.domain})`);
                        console.log('   Smart Report API Token saved successfully.');
                    } catch (err: any) {
                        console.error(`\r❌ Authentication failed: ${err.message}`);
                        process.exit(1);
                    }
                });

            program
                .command('smart-status')
                .description('Check Smart Report MCP connectivity and core functions status')
                .action(async () => {
                    const checks: Array<{ name: string; status: string; detail: string }> = [];

                    const runCheck = async (name: string, fn: () => Promise<any>) => {
                        try {
                            const result = await fn();
                            const detail = Array.isArray(result)
                                ? `OK (items=${result.length})`
                                : 'OK';
                            checks.push({ name, status: '✅', detail });
                        } catch (err: any) {
                            checks.push({ name, status: '❌', detail: err?.message || 'Unknown error' });
                        }
                    };

                    await runCheck('auth/company-info', async () => callMcp(api, 'company/info', {}));
                    await runCheck('dashboard', async () => callMcp(api, 'smartreport/dashboard', { mode: 'compact' }));
                    await runCheck('employees/list', async () => callMcp(api, 'employees/list', {}));
                    await runCheck('reports/list', async () => callMcp(api, 'reports/list', { per_page: 5 }));
                    await runCheck('divisions/list', async () => callMcp(api, 'divisions/list', {}));
                    await runCheck('guides/list', async () => callMcp(api, 'guides/list', {}));
                    await runCheck('analyze_performance', async () => callMcp(api, 'analyze_performance', {}));

                    console.log('\n📊 Smart Report MCP Status');
                    console.log('----------------------------------------');
                    for (const c of checks) {
                        console.log(`${c.status} ${c.name} -> ${c.detail}`);
                    }

                    const failed = checks.filter(c => c.status === '❌').length;
                    console.log('----------------------------------------');
                    if (failed === 0) {
                        console.log('✅ All MCP function checks passed.');
                    } else {
                        console.log(`⚠️ ${failed} check(s) failed.`);
                        process.exit(1);
                    }
                });
        }, { commands: ['smart-auth', 'smart-status'] });

        // 2. Resources
        if (typeof api.registerResource === 'function') api.registerResource({
            uri: 'smartreport://reports',
            name: 'Recent Reports',
            description: 'Stream of latest submitted reports',
            mimeType: 'application/json',
            read: async () => {
                const data = await callMcp(api, 'reports/list', { per_page: 10 });
                return { content: JSON.stringify(data, null, 2) };
            }
        });

        if (typeof api.registerResource === 'function') api.registerResource({
            uri: 'smartreport://employees',
            name: 'Employee List',
            description: 'Complete list of active employees with division names',
            mimeType: 'application/json',
            read: async () => {
                const data = await callMcp(api, 'employees/list', {});
                return { content: JSON.stringify(data, null, 2) };
            }
        });

        if (typeof api.registerResource === 'function') api.registerResource({
            uri: 'smartreport://divisions',
            name: 'Division List',
            description: 'List of all divisions in the company',
            mimeType: 'application/json',
            read: async () => {
                const data = await callMcp(api, 'divisions/list', {});
                return { content: JSON.stringify(data, null, 2) };
            }
        });

        if (typeof api.registerResource === 'function') api.registerResource({
            uri: 'smartreport://guides',
            name: 'Guides List',
            description: 'List of all available dynamic guides',
            mimeType: 'application/json',
            read: async () => {
                const data = await callMcp(api, 'guides/list', {});
                return { content: JSON.stringify(data, null, 2) };
            }
        });

        if (typeof api.registerResource === 'function') api.registerResource({
            uri: 'smartreport://dashboard',
            name: 'Daily Dashboard',
            description: 'Real-time KPI dashboard (stats, highlights, alerts)',
            mimeType: 'application/json',
            read: async (params: any) => {
                const data = await callMcp(api, 'smartreport/dashboard', params || {});
                return { content: JSON.stringify(data, null, 2) };
            }
        });

        // 3. Agent Tools
        api.registerTool({
            name: 'get_daily_dashboard',
            description: 'Retrieve real-time KPI dashboard (stats, highlights, alerts).',
            execute: async (args: any) => {
                try {
                    const data = await callMcp(api, 'smartreport/dashboard', args);
                    return { text: JSON.stringify(data, null, 2) };
                } catch (err: any) {
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
                } catch (err: any) {
                    return { error: err.message };
                }
            }
        });

        api.registerTool({
            name: 'get_guide_content',
            description: 'Retrieve full content of a specific guide by ID.',
            execute: async (args: any) => {
                try {
                    const data = await callMcp(api, 'guides/get', args);
                    return { text: JSON.stringify(data, null, 2) };
                } catch (err: any) {
                    return { error: err.message };
                }
            }
        });

        api.registerTool({
            name: 'get_list_reports',
            description: 'Retrieve reports with filters (date, employee, division).',
            execute: async (args: any) => {
                try {
                    const data = await callMcp(api, 'reports/list', args);
                    return { text: JSON.stringify(data, null, 2) };
                } catch (err: any) {
                    return { error: err.message };
                }
            }
        });

        api.registerTool({
            name: 'get_debt_analysis',
            description: 'Analyze pending tasks and employee performance debt.',
            execute: async (args: any) => {
                try {
                    const data = await callMcp(api, 'analyze_performance', args);
                    return { text: JSON.stringify(data, null, 2) };
                } catch (err: any) {
                    return { error: err.message };
                }
            }
        });
    }
};

export const register = (api: any) => plugin.register(api);
export const activate = (api: any) => plugin.register(api);
export default plugin;
