import { callMcp, normalizeToolError, SmartReportApi } from './client';

type ToolApi = SmartReportApi & { registerTool?: Function };

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

function text(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function registerJsonTool(api: ToolApi, name: string, description: string, method: string) {
  if (typeof api.registerTool !== 'function') {
    return;
  }

  api.registerTool({
    name,
    description,
    execute: async (args: Record<string, unknown> = {}) => {
      try {
        const data = await callMcp(api, method, args);
        return {
          text: JSON.stringify(data, null, 2),
        };
      } catch (error) {
        return normalizeToolError(error);
      }
    },
  });
}

function registerCustomTool(api: ToolApi, name: string, description: string, execute: (args: Record<string, unknown>) => Promise<unknown>) {
  if (typeof api.registerTool !== 'function') {
    return;
  }

  api.registerTool({
    name,
    description,
    execute: async (args: Record<string, unknown> = {}) => {
      try {
        const data = await execute(args);
        return {
          text: JSON.stringify(data, null, 2),
        };
      } catch (error) {
        return normalizeToolError(error);
      }
    },
  });
}

export function registerTools(api: ToolApi) {
  registerJsonTool(
    api,
    'get_daily_dashboard',
    'Retrieve real-time KPI dashboard (stats, highlights, alerts). Use this when the user asks for dashboard, KPI harian, ringkasan performa hari ini, atau kondisi laporan hari ini. Returns JSON for agent reasoning; summarize for users.',
    'smartreport/dashboard'
  );

  registerJsonTool(
    api,
    'get_guides_list',
    'Retrieve list of all available dynamic guides. Use this when the user asks for daftar panduan, SOP, knowledge base, atau guide yang tersedia. Returns JSON for agent reasoning; summarize for users.',
    'guides/list'
  );

  registerJsonTool(
    api,
    'get_guide_content',
    'Retrieve full content of a specific guide by ID. Use this after the user chooses a guide or asks for isi/detail panduan tertentu. Returns JSON for agent reasoning; summarize for users.',
    'guides/get'
  );

  registerJsonTool(
    api,
    'get_list_reports',
    'Retrieve reports with filters (date, employee, division). Use this when the user asks for daftar report, laporan terbaru, filter report, atau raw report data. Returns JSON for agent reasoning; summarize for users.',
    'reports/list'
  );

  registerJsonTool(
    api,
    'get_debt_analysis',
    'Analyze pending tasks and employee performance debt. Use this when the user asks for insight, bottlenecks, employee debt, late reports, or performance analysis. Returns JSON for agent reasoning; summarize for users.',
    'analyze_performance'
  );

  registerCustomTool(
    api,
    'get_reports_summary',
    'Retrieve recent reports and return a compact structured summary for agent use. Prefer this when the user asks for ringkasan laporan, recap report, siapa yang melapor, jumlah task, atau status kehadiran.',
    async (args) => {
      const params = Object.keys(args || {}).length > 0 ? args : { per_page: 10 };
      const data = await callMcp(api, 'reports/list', params);
      const items = asArray(data);

      const reports = items.slice(0, 20).map((report) => {
        const item = asObject(report);
        const user = asObject(item.user);
        const structured = asObject(item.structured_data);
        const tasks = asArray(structured.tasks);

        return {
          id: pickFirst(item, ['id', 'report_id']),
          report_date: pickFirst(item, ['report_date', 'date', 'submission_date']),
          created_at: pickFirst(item, ['created_at', 'submitted_at', 'updated_at']),
          company_id: pickFirst(item, ['company_id']),
          division_id: pickFirst(item, ['division_id']),
          user_id: pickFirst(item, ['user_id']),
          user_name: pickFirst(user, ['name', 'full_name']) ?? pickFirst(item, ['employee_name', 'user_name', 'author']),
          keterangan: pickFirst(structured, ['keterangan', 'note', 'notes']),
          tasks_count: tasks.length,
          tasks_preview: tasks.slice(0, 3).map((task) => {
            const taskItem = asObject(task);
            return {
              task: text(pickFirst(taskItem, ['task', 'title', 'name'])),
              status: text(pickFirst(taskItem, ['status', 'state'])),
            };
          }),
        };
      });

      return {
        total_items: items.length,
        returned_items: reports.length,
        reports,
      };
    }
  );

  registerCustomTool(
    api,
    'get_report_detail',
    'Retrieve recent reports then extract a single report detail by id for agent use. Use this when the user asks for detail report tertentu. Requires {"id": <report_id>} and optionally accepts filters like per_page.',
    async (args) => {
      const targetId = args?.id;
      if (targetId === undefined || targetId === null || String(targetId).trim() === '') {
        throw new Error('Parameter "id" wajib diisi untuk get_report_detail.');
      }

      const { id, ...rest } = args || {};
      const params = Object.keys(rest).length > 0 ? rest : { per_page: 50 };
      const data = await callMcp(api, 'reports/list', params);
      const items = asArray(data);
      const found = items.find((report) => String(asObject(report).id) === String(targetId));

      if (!found) {
        throw new Error(`Report dengan id ${targetId} tidak ditemukan pada hasil reports/list.`);
      }

      const item = asObject(found);
      const user = asObject(item.user);
      const structured = asObject(item.structured_data);
      const tasks = asArray(structured.tasks).map((task) => {
        const taskItem = asObject(task);
        return {
          task: pickFirst(taskItem, ['task', 'title', 'name']),
          status: pickFirst(taskItem, ['status', 'state']),
        };
      });

      return {
        id: pickFirst(item, ['id', 'report_id']),
        company_id: pickFirst(item, ['company_id']),
        division_id: pickFirst(item, ['division_id']),
        user_id: pickFirst(item, ['user_id']),
        user_name: pickFirst(user, ['name', 'full_name']) ?? pickFirst(item, ['employee_name', 'user_name', 'author']),
        report_date: pickFirst(item, ['report_date', 'date', 'submission_date']),
        created_at: pickFirst(item, ['created_at', 'submitted_at', 'updated_at']),
        updated_at: pickFirst(item, ['updated_at']),
        raw_text: pickFirst(item, ['raw_text']),
        keterangan: pickFirst(structured, ['keterangan', 'note', 'notes']),
        tasks,
      };
    }
  );
}
