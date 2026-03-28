import axios from 'axios';

export const PLUGIN_ID = 'smart-report-plugin';
export const API_BASE = 'https://member.smartreport.my.id/api/mcp';

export type SmartReportApi = {
  pluginConfig?: Record<string, unknown>;
  config?: any;
  saveConfig?: (config: Record<string, unknown>) => Promise<void> | void;
};

export function resolveToken(api: SmartReportApi): string | undefined {
  const pluginToken = api?.pluginConfig?.apiToken;
  if (typeof pluginToken === 'string' && pluginToken.trim()) return pluginToken;

  const configToken = api?.config?.apiToken;
  if (typeof configToken === 'string' && configToken.trim()) return configToken;

  const nestedToken = api?.config?.plugins?.entries?.[PLUGIN_ID]?.config?.apiToken;
  if (typeof nestedToken === 'string' && nestedToken.trim()) return nestedToken;

  return undefined;
}

export async function savePluginConfig(
  api: SmartReportApi,
  config: { apiToken: string; companyName?: string; companyDomain?: string }
): Promise<void> {
  if (typeof api.saveConfig === 'function') {
    await api.saveConfig(config);
    return;
  }

  api.pluginConfig = {
    ...(api.pluginConfig || {}),
    ...config,
  };
}

export async function callMcp(api: SmartReportApi, method: string, params: Record<string, unknown> = {}) {
  const token = resolveToken(api);

  if (!token) {
    throw new Error('API token not found. Jalankan "openclaw smart-auth <token>" terlebih dahulu.');
  }

  const response = await axios.post(
    API_BASE,
    {
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now(),
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 8000,
    }
  );

  if (response.data?.error?.message) {
    throw new Error(String(response.data.error.message));
  }

  return response.data?.result;
}

export function normalizeToolError(error: unknown): { error: string } {
  if (error instanceof Error) {
    return { error: error.message };
  }

  return { error: 'Unknown Smart Report plugin error' };
}
