"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = registerCommands;
const client_1 = require("./client");
function registerCommands(api) {
    if (typeof api.registerCli !== 'function') {
        return;
    }
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
            console.log('\n📊 Smart Report MCP Status');
            console.log('----------------------------------------');
            for (const check of checks) {
                console.log(`${check.status} ${check.name} -> ${check.detail}`);
            }
            const failed = checks.filter((check) => check.status === '❌').length;
            console.log('----------------------------------------');
            if (failed === 0) {
                console.log('✅ All MCP function checks passed.');
            }
            else {
                console.log(`⚠️ ${failed} check(s) failed.`);
                process.exit(1);
            }
        });
    }, { commands: ['smart-auth', 'smart-status'] });
}
