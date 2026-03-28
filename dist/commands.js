"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = registerCommands;
const client_1 = require("./client");
async function collectStatusChecks(api) {
    const checks = [];
    const runCheck = async (name, fn) => {
        try {
            const result = await fn();
            const detail = Array.isArray(result) ? `OK (items=${result.length})` : 'OK';
            checks.push({ name, status: '✅', detail });
        }
        catch (error) {
            const detail = error instanceof Error ? error.message : 'Unknown error';
            checks.push({ name, status: '❌', detail });
        }
    };
    await runCheck('auth/company-info', async () => (0, client_1.callMcp)(api, 'company/info', {}));
    await runCheck('dashboard', async () => (0, client_1.callMcp)(api, 'smartreport/dashboard', { mode: 'compact' }));
    await runCheck('employees/list', async () => (0, client_1.callMcp)(api, 'employees/list', {}));
    await runCheck('reports/list', async () => (0, client_1.callMcp)(api, 'reports/list', { per_page: 5 }));
    await runCheck('divisions/list', async () => (0, client_1.callMcp)(api, 'divisions/list', {}));
    await runCheck('guides/list', async () => (0, client_1.callMcp)(api, 'guides/list', {}));
    await runCheck('analyze_performance', async () => (0, client_1.callMcp)(api, 'analyze_performance', {}));
    return checks;
}
function renderStatusSummary(checks) {
    const lines = ['📊 Smart Report MCP Status', '----------------------------------------'];
    for (const check of checks) {
        lines.push(`${check.status} ${check.name} -> ${check.detail}`);
    }
    const failed = checks.filter((check) => check.status === '❌').length;
    lines.push('----------------------------------------');
    lines.push(failed === 0 ? '✅ All MCP function checks passed.' : `⚠️ ${failed} check(s) failed.`);
    return lines.join('\n');
}
function renderJsonText(title, data) {
    return `${title}\n\n${JSON.stringify(data, null, 2)}`;
}
function registerChatCommands(api) {
    if (typeof api.registerCommand !== 'function') {
        return;
    }
    const registerSmartCommand = (name, description, execute) => {
        api.registerCommand?.({
            name,
            description,
            execute: async (args = {}) => {
                try {
                    return { text: await execute(args) };
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : 'Unknown Smart Report command error';
                    return { text: `❌ ${message}` };
                }
            },
        });
    };
    registerSmartCommand('smart-status', 'Check Smart Report connectivity and core MCP functions.', async () => {
        const checks = await collectStatusChecks(api);
        return renderStatusSummary(checks);
    });
    registerSmartCommand('smart-dashboard', 'Show Smart Report daily dashboard summary.', async (args) => {
        const data = await (0, client_1.callMcp)(api, 'smartreport/dashboard', args || { mode: 'compact' });
        return renderJsonText('📊 Smart Report Dashboard', data);
    });
    registerSmartCommand('smart-employees', 'Show employee list from Smart Report.', async (args) => {
        const data = await (0, client_1.callMcp)(api, 'employees/list', args || {});
        return renderJsonText('👥 Smart Report Employees', data);
    });
    registerSmartCommand('smart-reports', 'Show report list from Smart Report.', async (args) => {
        const data = await (0, client_1.callMcp)(api, 'reports/list', args || { per_page: 10 });
        return renderJsonText('📝 Smart Report Reports', data);
    });
    registerSmartCommand('smart-divisions', 'Show divisions from Smart Report.', async (args) => {
        const data = await (0, client_1.callMcp)(api, 'divisions/list', args || {});
        return renderJsonText('🏢 Smart Report Divisions', data);
    });
    registerSmartCommand('smart-guides', 'Show available Smart Report guides.', async (args) => {
        const data = await (0, client_1.callMcp)(api, 'guides/list', args || {});
        return renderJsonText('📚 Smart Report Guides', data);
    });
    registerSmartCommand('smart-guide', 'Show guide detail by ID from Smart Report.', async (args) => {
        const data = await (0, client_1.callMcp)(api, 'guides/get', args || {});
        return renderJsonText('📖 Smart Report Guide Detail', data);
    });
    registerSmartCommand('smart-analysis', 'Show performance/debt analysis from Smart Report.', async (args) => {
        const data = await (0, client_1.callMcp)(api, 'analyze_performance', args || {});
        return renderJsonText('📈 Smart Report Performance Analysis', data);
    });
}
function registerCommands(api) {
    if (typeof api.registerCli === 'function') {
        api.registerCli(({ program }) => {
            program
                .command('smart-auth <token>')
                .description('Set API token for Smart Report integration')
                .action(async (token) => {
                process.stdout.write('🔍 Verifying token and fetching company info...');
                try {
                    api.pluginConfig = api.pluginConfig || {};
                    api.pluginConfig.apiToken = token;
                    const companyInfo = await (0, client_1.callMcp)(api, 'company/info', {});
                    await (0, client_1.savePluginConfig)(api, {
                        apiToken: token,
                        companyName: companyInfo?.name,
                        companyDomain: companyInfo?.domain,
                    });
                    console.log(`\r✅ Authenticated for: ${companyInfo?.name || 'Unknown'} (${companyInfo?.domain || '-'})`);
                    console.log('   Smart Report API token saved successfully.');
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : 'Unknown authentication error';
                    console.error(`\r❌ Authentication failed: ${message}`);
                    process.exit(1);
                }
            });
            program
                .command('smart-status')
                .description('Check Smart Report MCP connectivity and core functions status')
                .action(async () => {
                const checks = await collectStatusChecks(api);
                const output = renderStatusSummary(checks);
                console.log(`\n${output}`);
                const failed = checks.filter((check) => check.status === '❌').length;
                if (failed > 0) {
                    process.exit(1);
                }
            });
        }, { commands: ['smart-auth', 'smart-status'] });
    }
    registerChatCommands(api);
}
