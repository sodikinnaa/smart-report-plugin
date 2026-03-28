"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerResources = registerResources;
const client_1 = require("./client");
function registerResources(api) {
    if (typeof api.registerResource !== 'function') {
        return;
    }
    api.registerResource({
        uri: 'smartreport://reports',
        name: 'Recent Reports',
        description: 'Stream of latest submitted reports',
        mimeType: 'application/json',
        read: async () => {
            const data = await (0, client_1.callMcp)(api, 'reports/list', { per_page: 10 });
            return { content: JSON.stringify(data, null, 2) };
        },
    });
    api.registerResource({
        uri: 'smartreport://employees',
        name: 'Employee List',
        description: 'Complete list of active employees with division names',
        mimeType: 'application/json',
        read: async () => {
            const data = await (0, client_1.callMcp)(api, 'employees/list', {});
            return { content: JSON.stringify(data, null, 2) };
        },
    });
    api.registerResource({
        uri: 'smartreport://divisions',
        name: 'Division List',
        description: 'List of all divisions in the company',
        mimeType: 'application/json',
        read: async () => {
            const data = await (0, client_1.callMcp)(api, 'divisions/list', {});
            return { content: JSON.stringify(data, null, 2) };
        },
    });
    api.registerResource({
        uri: 'smartreport://guides',
        name: 'Guides List',
        description: 'List of all available dynamic guides',
        mimeType: 'application/json',
        read: async () => {
            const data = await (0, client_1.callMcp)(api, 'guides/list', {});
            return { content: JSON.stringify(data, null, 2) };
        },
    });
    api.registerResource({
        uri: 'smartreport://dashboard',
        name: 'Daily Dashboard',
        description: 'Real-time KPI dashboard (stats, highlights, alerts)',
        mimeType: 'application/json',
        read: async (params) => {
            const data = await (0, client_1.callMcp)(api, 'smartreport/dashboard', params || {});
            return { content: JSON.stringify(data, null, 2) };
        },
    });
}
