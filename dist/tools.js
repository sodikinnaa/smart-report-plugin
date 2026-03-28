"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTools = registerTools;
const client_1 = require("./client");
function registerJsonTool(api, name, description, method) {
    if (typeof api.registerTool !== 'function') {
        return;
    }
    api.registerTool({
        name,
        description,
        execute: async (args = {}) => {
            try {
                const data = await (0, client_1.callMcp)(api, method, args);
                return {
                    text: JSON.stringify(data, null, 2),
                };
            }
            catch (error) {
                return (0, client_1.normalizeToolError)(error);
            }
        },
    });
}
function registerTools(api) {
    registerJsonTool(api, 'get_daily_dashboard', 'Retrieve real-time KPI dashboard (stats, highlights, alerts). Returns JSON for agent-side reasoning; format output for users.', 'smartreport/dashboard');
    registerJsonTool(api, 'get_guides_list', 'Retrieve list of all available dynamic guides. Returns JSON for agent-side reasoning; format output for users.', 'guides/list');
    registerJsonTool(api, 'get_guide_content', 'Retrieve full content of a specific guide by ID. Returns JSON for agent-side reasoning; format output for users.', 'guides/get');
    registerJsonTool(api, 'get_list_reports', 'Retrieve reports with filters (date, employee, division). Returns JSON for agent-side reasoning; format output for users.', 'reports/list');
    registerJsonTool(api, 'get_debt_analysis', 'Analyze pending tasks and employee performance debt. Returns JSON for agent-side reasoning; format output for users.', 'analyze_performance');
}
