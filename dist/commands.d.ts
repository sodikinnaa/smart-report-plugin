import { SmartReportApi } from './client';
type CommandApi = SmartReportApi & {
    registerCli?: Function;
    registerCommand?: Function;
};
export declare function registerCommands(api: CommandApi): void;
export {};
