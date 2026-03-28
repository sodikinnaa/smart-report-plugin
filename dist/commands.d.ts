import { SmartReportApi } from './client';
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
export declare function registerCommands(api: CommandApi): void;
export {};
