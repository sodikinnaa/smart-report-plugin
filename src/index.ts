import { PLUGIN_ID, SmartReportApi } from './client';
import { registerCommands } from './commands';
import { registerResources } from './resources';
import { registerTools } from './tools';

type PluginApi = SmartReportApi & {
  registerCli?: Function;
  registerCommand?: Function;
  registerResource?: Function;
  registerTool?: Function;
};

const plugin = {
  id: PLUGIN_ID,
  name: 'Smart Report Integration',
  version: '2100.11.6',

  register(api: PluginApi) {
    registerCommands(api);
    registerResources(api);
    registerTools(api);
  },
};

export const register = (api: PluginApi) => plugin.register(api);
export const activate = (api: PluginApi) => plugin.register(api);
export default plugin;
