import { SmartReportApi } from './client';
type ToolApi = SmartReportApi & {
    registerTool?: Function;
};
export declare function registerTools(api: ToolApi): void;
export {};
