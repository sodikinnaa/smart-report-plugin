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

function renderJsonFallback(title: string, data: unknown): string {
  return `${title}\n\n${JSON.stringify(data, null, 2)}`;
}

function asArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as any[];
    if (Array.isArray(obj.items)) return obj.items as any[];
    if (Array.isArray(obj.results)) return obj.results as any[];
  }
  return [];
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function pickFirst(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return undefined;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (Array.isArray(value)) return value.length === 0 ? '-' : value.map((item) => formatValue(item)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatDashboardText(data: unknown): string {
  const root = asObject(data);
  const summary = asObject(pickFirst(root, ['summary', 'stats', 'data']) ?? root);
  const highlights = asArray(pickFirst(root, ['highlights', 'insights', 'messages']));
  const alerts = asArray(pickFirst(root, ['alerts', 'warnings', 'issues']));
  const divisions = asArray(pickFirst(root, ['divisions', 'division_stats', 'divisionStats']));

  const company = formatValue(pickFirst(root, ['companyName', 'company', 'company_name', 'brand']));
  const date = formatValue(pickFirst(root, ['date', 'today', 'generated_at', 'generatedAt']));
  const mode = formatValue(pickFirst(root, ['mode']));
  const totalEmployees = formatValue(pickFirst(summary, ['total_employees', 'totalEmployees', 'employee_count', 'employees']));
  const submitted = formatValue(pickFirst(summary, ['submitted', 'submitted_reports', 'reported', 'done', 'completed']));
  const pending = formatValue(pickFirst(summary, ['pending', 'not_submitted', 'remaining', 'unreported']));
  const completion = formatValue(pickFirst(summary, ['completion_rate', 'completionRate', 'progress', 'percentage']));

  const lines = ['📊 Smart Report Dashboard'];
  lines.push(`Perusahaan: ${company}`);
  if (date !== '-') lines.push(`Tanggal: ${date}`);
  if (mode !== '-') lines.push(`Mode: ${mode}`);
  lines.push('');
  lines.push('Ringkasan:');
  lines.push(`- Total karyawan: ${totalEmployees}`);
  lines.push(`- Sudah lapor: ${submitted}`);
  lines.push(`- Belum lapor: ${pending}`);
  lines.push(`- Completion: ${completion}`);

  if (divisions.length > 0) {
    lines.push('');
    lines.push('Per divisi:');
    for (const division of divisions.slice(0, 10)) {
      const item = asObject(division);
      const name = formatValue(pickFirst(item, ['name', 'division', 'division_name']));
      const count = formatValue(pickFirst(item, ['count', 'total', 'reports', 'submitted']));
      lines.push(`- ${name}: ${count}`);
    }
  }

  if (highlights.length > 0) {
    lines.push('');
    lines.push('Highlights:');
    for (const item of highlights.slice(0, 5)) {
      lines.push(`- ${formatValue(item)}`);
    }
  }

  if (alerts.length > 0) {
    lines.push('');
    lines.push('Alerts:');
    for (const item of alerts.slice(0, 5)) {
      lines.push(`- ${formatValue(item)}`);
    }
  }

  if (lines.length <= 6) {
    return renderJsonFallback('📊 Smart Report Dashboard', data);
  }

  return lines.join('\n');
}

function formatEmployeesText(data: unknown): string {
  const items = asArray(data);
  if (items.length === 0) {
    return renderJsonFallback('👥 Smart Report Employees', data);
  }

  const lines = [`👥 Daftar Karyawan (${items.length})`];
  for (const employee of items.slice(0, 30)) {
    const item = asObject(employee);
    const name = formatValue(pickFirst(item, ['name', 'full_name', 'employee_name']));
    const division = formatValue(pickFirst(item, ['division', 'division_name', 'department']));
    const email = formatValue(pickFirst(item, ['email', 'email_address']));
    lines.push(`- ${name} — ${division}${email !== '-' ? ` (${email})` : ''}`);
  }

  if (items.length > 30) {
    lines.push(`- ... dan ${items.length - 30} data lainnya`);
  }

  return lines.join('\n');
}

function formatReportsText(data: unknown): string {
  const items = asArray(data);
  if (items.length === 0) {
    return renderJsonFallback('📝 Smart Report Reports', data);
  }

  const lines = [`📝 Daftar Report (${items.length})`];
  for (const report of items.slice(0, 20)) {
    const item = asObject(report);
    const title = formatValue(pickFirst(item, ['title', 'name', 'subject']));
    const date = formatValue(pickFirst(item, ['date', 'created_at', 'submitted_at']));
    const employee = formatValue(pickFirst(item, ['employee', 'employee_name', 'user_name', 'author']));
    const status = formatValue(pickFirst(item, ['status', 'state']));
    lines.push(`- ${date} | ${title} | ${employee} | status: ${status}`);
  }

  if (items.length > 20) {
    lines.push(`- ... dan ${items.length - 20} report lainnya`);
  }

  return lines.join('\n');
}

function formatDivisionsText(data: unknown): string {
  const items = asArray(data);
  if (items.length === 0) {
    return renderJsonFallback('🏢 Smart Report Divisions', data);
  }

  const lines = [`🏢 Daftar Divisi (${items.length})`];
  for (const division of items.slice(0, 30)) {
    const item = asObject(division);
    const name = formatValue(pickFirst(item, ['name', 'division_name']));
    const count = formatValue(pickFirst(item, ['employee_count', 'total_employees', 'members']));
    lines.push(`- ${name}${count !== '-' ? ` — ${count} anggota` : ''}`);
  }
  return lines.join('\n');
}

function formatGuidesText(data: unknown): string {
  const items = asArray(data);
  if (items.length === 0) {
    return renderJsonFallback('📚 Smart Report Guides', data);
  }

  const lines = [`📚 Daftar Guides (${items.length})`];
  for (const guide of items.slice(0, 30)) {
    const item = asObject(guide);
    const id = formatValue(pickFirst(item, ['id', 'guide_id']));
    const title = formatValue(pickFirst(item, ['title', 'name']));
    const category = formatValue(pickFirst(item, ['category', 'group']));
    lines.push(`- [${id}] ${title}${category !== '-' ? ` — ${category}` : ''}`);
  }
  return lines.join('\n');
}

function formatGuideDetailText(data: unknown): string {
  const item = asObject(data);
  if (Object.keys(item).length === 0) {
    return renderJsonFallback('📖 Smart Report Guide Detail', data);
  }

  const id = formatValue(pickFirst(item, ['id', 'guide_id']));
  const title = formatValue(pickFirst(item, ['title', 'name']));
  const category = formatValue(pickFirst(item, ['category', 'group']));
  const content = formatValue(pickFirst(item, ['content', 'description', 'body', 'text']));

  const lines = ['📖 Detail Guide'];
  lines.push(`- ID: ${id}`);
  lines.push(`- Judul: ${title}`);
  if (category !== '-') lines.push(`- Kategori: ${category}`);
  lines.push('');
  lines.push('Isi:');
  lines.push(content);
  return lines.join('\n');
}

function formatAnalysisText(data: unknown): string {
  const root = asObject(data);
  const summary = asObject(pickFirst(root, ['summary', 'stats', 'overview']) ?? root);
  const employees = asArray(pickFirst(root, ['employees', 'data', 'items']));
  const debts = asArray(pickFirst(root, ['debts', 'pending', 'issues']));

  const lines = ['📈 Analisis Performa Smart Report'];

  if (Object.keys(summary).length > 0) {
    lines.push('Ringkasan:');
    for (const [key, value] of Object.entries(summary).slice(0, 8)) {
      lines.push(`- ${key}: ${formatValue(value)}`);
    }
  }

  if (employees.length > 0) {
    lines.push('');
    lines.push('Karyawan yang perlu perhatian:');
    for (const employee of employees.slice(0, 10)) {
      const item = asObject(employee);
      const name = formatValue(pickFirst(item, ['name', 'employee_name', 'full_name']));
      const note = formatValue(pickFirst(item, ['status', 'note', 'summary', 'debt', 'pending']));
      lines.push(`- ${name}: ${note}`);
    }
  }

  if (debts.length > 0) {
    lines.push('');
    lines.push('Temuan / utang kerja:');
    for (const debt of debts.slice(0, 10)) {
      lines.push(`- ${formatValue(debt)}`);
    }
  }

  if (lines.length <= 1) {
    return renderJsonFallback('📈 Smart Report Performance Analysis', data);
  }

  return lines.join('\n');
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
    return formatDashboardText(data);
  });

  registerSmartCommand('smart_employees', 'Show employee list from Smart Report.', async (args) => {
    const data = await callMcp(api, 'employees/list', args || {});
    return formatEmployeesText(data);
  });

  registerSmartCommand('smart_reports', 'Show report list from Smart Report.', async (args) => {
    const data = await callMcp(api, 'reports/list', Object.keys(args || {}).length > 0 ? (args || {}) : { per_page: 10 });
    return formatReportsText(data);
  });

  registerSmartCommand('smart_divisions', 'Show divisions from Smart Report.', async (args) => {
    const data = await callMcp(api, 'divisions/list', args || {});
    return formatDivisionsText(data);
  });

  registerSmartCommand('smart_guides', 'Show available Smart Report guides.', async (args) => {
    const data = await callMcp(api, 'guides/list', args || {});
    return formatGuidesText(data);
  });

  registerSmartCommand('smart_guide', 'Show guide detail by ID from Smart Report.', async (args) => {
    const data = await callMcp(api, 'guides/get', args || {});
    return formatGuideDetailText(data);
  });

  registerSmartCommand('smart_analysis', 'Show performance/debt analysis from Smart Report.', async (args) => {
    const data = await callMcp(api, 'analyze_performance', args || {});
    return formatAnalysisText(data);
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
