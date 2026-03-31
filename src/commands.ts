import { callMcp, savePluginConfig, SmartReportApi } from './client';

type CheckResult = { name: string; status: string; detail: string };

type CommandContext = {
  args?: string;
  channel?: string;
  senderId?: string;
  from?: string;
  to?: string;
  messageThreadId?: number;
  accountId?: string;
  gatewayClientScopes?: string[];
};

type CommandApi = SmartReportApi & {
  logger?: {
    info?: (message: string) => void;
    warn?: (message: string) => void;
    error?: (message: string) => void;
    debug?: (message: string) => void;
  };
  registerCli?: Function;
  registerCommand?: Function;
};

async function collectStatusChecks(api: SmartReportApi): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];

  const runCheck = async (name: string, fn: () => Promise<unknown>) => {
    try {
      const result = await fn();
      const detail = Array.isArray(result) ? `OK (items=${result.length})` : 'OK';
      checks.push({ name, status: '✅', detail });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown error';
      checks.push({ name, status: '❌', detail });
    }
  };

  await runCheck('auth/company-info', async () => callMcp(api, 'company/info', {}));
  await runCheck('dashboard', async () => callMcp(api, 'smartreport/dashboard', { mode: 'compact' }));
  await runCheck('employees/list', async () => callMcp(api, 'employees/list', {}));
  await runCheck('reports/list', async () => callMcp(api, 'reports/list', { per_page: 5 }));
  await runCheck('divisions/list', async () => callMcp(api, 'divisions/list', {}));
  await runCheck('guides/list', async () => callMcp(api, 'guides/list', {}));
  await runCheck('analyze_performance', async () => callMcp(api, 'analyze_performance', {}));

  return checks;
}

function renderStatusSummary(checks: CheckResult[]): string {
  const lines = ['📊 Smart Report MCP Status', '----------------------------------------'];

  for (const check of checks) {
    lines.push(`${check.status} ${check.name} -> ${check.detail}`);
  }

  const failed = checks.filter((check) => check.status === '❌').length;
  lines.push('----------------------------------------');
  lines.push(failed === 0 ? '✅ All MCP function checks passed.' : `⚠️ ${failed} check(s) failed.`);

  return lines.join('\n');
}

function renderJsonText(title: string, data: unknown): string {
  return `${title}\n\n${JSON.stringify(data, null, 2)}`;
}

function normalizeCommandArgs(args: string | undefined): Record<string, unknown> {
  const raw = (args ?? '').trim();
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }

    return { input: parsed };
  } catch {
    return { input: raw };
  }
}

function registerChatCommands(api: CommandApi) {
  if (typeof api.registerCommand !== 'function') {
    return;
  }

  const registerSmartCommand = (
    name: string,
    description: string,
    execute: (args?: Record<string, unknown>, ctx?: CommandContext) => Promise<string>
  ) => {
    api.registerCommand?.({
      name,
      description,
      acceptsArgs: true,
      handler: async (ctx: CommandContext = {}) => {
        try {
          const args = normalizeCommandArgs(ctx.args);
          return { text: await execute(args, ctx) };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown Smart Report command error';
          api.logger?.warn?.(`smart-report-plugin command ${name} failed: ${message}`);
          return { text: `❌ ${message}` };
        }
      },
    });
  };

  registerSmartCommand('smart_status', 'Check Smart Report connectivity and core MCP functions.', async () => {
    const checks = await collectStatusChecks(api);
    return renderStatusSummary(checks);
  });

  registerSmartCommand('smart_dashboard', 'Show Smart Report daily dashboard summary.', async (args) => {
    const data = await callMcp(api, 'smartreport/dashboard', Object.keys(args || {}).length > 0 ? (args || {}) : { mode: 'compact' });
    return renderJsonText('📊 Smart Report Dashboard', data);
  });

  registerSmartCommand('smart_employees', 'Show employee list from Smart Report.', async (args) => {
    const data = await callMcp(api, 'employees/list', args || {});
    return renderJsonText('👥 Smart Report Employees', data);
  });

  registerSmartCommand('smart_reports', 'Show report list from Smart Report.', async (args) => {
    const data = await callMcp(api, 'reports/list', Object.keys(args || {}).length > 0 ? (args || {}) : { per_page: 10 });
    return renderJsonText('📝 Smart Report Reports', data);
  });

  registerSmartCommand('smart_divisions', 'Show divisions from Smart Report.', async (args) => {
    const data = await callMcp(api, 'divisions/list', args || {});
    return renderJsonText('🏢 Smart Report Divisions', data);
  });

  registerSmartCommand('smart_guides', 'Show available Smart Report guides.', async (args) => {
    const data = await callMcp(api, 'guides/list', args || {});
    return renderJsonText('📚 Smart Report Guides', data);
  });

  registerSmartCommand('smart_guide', 'Show guide detail by ID from Smart Report.', async (args) => {
    const data = await callMcp(api, 'guides/get', args || {});
    return renderJsonText('📖 Smart Report Guide Detail', data);
  });

  registerSmartCommand('smart_analysis', 'Show performance/debt analysis from Smart Report.', async (args) => {
    const data = await callMcp(api, 'analyze_performance', args || {});
    return renderJsonText('📈 Smart Report Performance Analysis', data);
  });
}

export function registerCommands(api: CommandApi) {
  if (typeof api.registerCli === 'function') {
    api.registerCli(({ program }: any) => {
      program
        .command('smart-auth <token>')
        .description('Set API token for Smart Report integration')
        .action(async (token: string) => {
          process.stdout.write('🔍 Verifying token and fetching company info...');
          try {
            api.pluginConfig = api.pluginConfig || {};
            api.pluginConfig.apiToken = token;
            const companyInfo = await callMcp(api, 'company/info', {});

            await savePluginConfig(api, {
              apiToken: token,
              companyName: companyInfo?.name,
              companyDomain: companyInfo?.domain,
            });

            console.log(`\r✅ Authenticated for: ${companyInfo?.name || 'Unknown'} (${companyInfo?.domain || '-'})`);
            console.log('   Smart Report API token saved successfully.');
          } catch (error) {
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

  try {
    registerChatCommands(api);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    api.logger?.error?.(`smart-report-plugin command registration failed gracefully: ${message}`);
  }
}
