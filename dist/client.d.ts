export declare const PLUGIN_ID = "smart-report-plugin";
export declare const API_BASE = "https://member.smartreport.my.id/api/mcp";
export type SmartReportApi = {
    pluginConfig?: Record<string, unknown>;
    config?: any;
    saveConfig?: (config: Record<string, unknown>) => Promise<void> | void;
};
export declare function resolveToken(api: SmartReportApi): string | undefined;
export declare function savePluginConfig(api: SmartReportApi, config: {
    apiToken: string;
    companyName?: string;
    companyDomain?: string;
}): Promise<void>;
export declare function callMcp(api: SmartReportApi, method: string, params?: Record<string, unknown>): Promise<any>;
export declare function normalizeToolError(error: unknown): {
    error: string;
};
