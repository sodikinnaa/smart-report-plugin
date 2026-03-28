import { callMcp, normalizeToolError, SmartReportApi } from './client';

type ToolApi = SmartReportApi & { registerTool?: Function };

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

export function registerTools(api: ToolApi) {
  registerJsonTool(
    api,
    'get_daily_dashboard',
    'Retrieve real-time KPI dashboard (stats, highlights, alerts). Returns JSON for agent-side reasoning; format output for users.',
    'smartreport/dashboard'
  );

  registerJsonTool(
    api,
    'get_guides_list',
    'Retrieve list of all available dynamic guides. Returns JSON for agent-side reasoning; format output for users.',
    'guides/list'
  );

  registerJsonTool(
    api,
    'get_guide_content',
    'Retrieve full content of a specific guide by ID. Returns JSON for agent-side reasoning; format output for users.',
    'guides/get'
  );

  registerJsonTool(
    api,
    'get_list_reports',
    'Retrieve reports with filters (date, employee, division). Returns JSON for agent-side reasoning; format output for users.',
    'reports/list'
  );

  registerJsonTool(
    api,
    'get_debt_analysis',
    'Analyze pending tasks and employee performance debt. Returns JSON for agent-side reasoning; format output for users.',
    'analyze_performance'
  );
}
