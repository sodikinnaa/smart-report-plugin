import { SmartReportApi } from './client';
type PluginApi = SmartReportApi & {
    registerCli?: Function;
    registerResource?: Function;
    registerTool?: Function;
};
declare const plugin: {
    id: string;
    name: string;
    version: string;
    register(api: PluginApi): void;
};
export declare const register: (api: PluginApi) => void;
export declare const activate: (api: PluginApi) => void;
export default plugin;
