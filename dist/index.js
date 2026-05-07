#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const config_js_1 = require("./config.js");
const definitions_js_1 = require("./tools/definitions.js");
const handlers_js_1 = require("./tools/handlers.js");
const server = new index_js_1.Server({
    name: "zoho-integration-mcp",
    version: "1.0.0",
}, {
    capabilities: { tools: {} },
    instructions: "MANDATORY PRE-EXECUTION CHECKLIST for the zoho-integration plugin.\n" +
        "Before invoking ANY tool from this plugin in a new session, the agent MUST ask the user for and confirm the following three values, even if a saved config already exists:\n" +
        "  1. Zoho MCP URL — from https://www.zoho.com/mcp (single URL covering Payroll + People).\n" +
        "  2. Zoho People organization ID.\n" +
        "  3. Zoho Payroll organization ID.\n" +
        "Do NOT silently reuse cached credentials. Prompt the user explicitly, wait for their response, then call connect_zoho (and configure_people_api_credentials when REST tools are needed) with the supplied values. Only after the user confirms all three may the agent proceed to call other tools.",
});
// ── List tools — gated by connection state ────────────────────────────────────
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return { tools: (0, config_js_1.isConnected)() ? definitions_js_1.POST_CONNECT_TOOLS : definitions_js_1.PRE_CONNECT_TOOLS };
});
// ── Route tool calls ──────────────────────────────────────────────────────────
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    const a = args;
    if (name === "connect_zoho")
        return (0, handlers_js_1.handleConnect)(a);
    if (name === "disconnect_zoho")
        return (0, handlers_js_1.handleDisconnect)();
    if (name === "connection_status")
        return (0, handlers_js_1.handleStatus)();
    // All tools below require an active connection
    if (!(0, config_js_1.isConnected)()) {
        return {
            content: [{
                    type: "text",
                    text: "Not connected. Please run connect_zoho first.\nGet your MCP URLs at https://www.zoho.com/mcp",
                }],
            isError: true,
        };
    }
    try {
        if (name === "check_integration_health")
            return await (0, handlers_js_1.handleHealthCheck)();
        if (name === "sync_employee")
            return await (0, handlers_js_1.handleSyncEmployee)(a);
        if (name === "sync_all_employees")
            return await (0, handlers_js_1.handleSyncAll)();
        if (name === "fix_sync_issues")
            return await (0, handlers_js_1.handleFixIssues)(a);
        if (name === "list_employees")
            return await (0, handlers_js_1.handleListEmployees)(a);
        if (name === "get_employee_details")
            return await (0, handlers_js_1.handleGetEmployee)(a);
        if (name === "configure_people_api_credentials")
            return (0, handlers_js_1.handleConfigureApiCredentials)(a);
        if (name === "get_people_integration_dashboard")
            return await (0, handlers_js_1.handleGetDashboard)();
        if (name === "trigger_people_sync")
            return await (0, handlers_js_1.handleTriggerSync)();
        if (name === "get_people_sync_history")
            return await (0, handlers_js_1.handleGetSyncHistory)();
        if (name === "list_people_sync_errors")
            return await (0, handlers_js_1.handleListSyncErrors)();
        if (name === "get_people_integration_preferences")
            return await (0, handlers_js_1.handleGetPreferences)();
        if (name === "update_people_integration_preferences")
            return await (0, handlers_js_1.handleUpdatePreferences)(args);
        if (name === "get_people_field_mappings")
            return await (0, handlers_js_1.handleGetFieldMappings)(a);
        if (name === "get_people_field_mapping_edit_data")
            return await (0, handlers_js_1.handleGetFieldMappingEditData)(a);
        if (name === "update_people_employee_field_mappings")
            return await (0, handlers_js_1.handleUpdateFieldMappings)(args);
        if (name === "get_leave_attendance_details")
            return await (0, handlers_js_1.handleGetLeaveAttendanceDetails)();
        if (name === "trigger_leave_attendance_sync")
            return await (0, handlers_js_1.handleTriggerLeaveAttendanceSync)();
        if (name === "get_leave_attendance_settings")
            return await (0, handlers_js_1.handleGetLeaveSettings)();
        if (name === "get_leave_attendance_sync_summary")
            return await (0, handlers_js_1.handleGetLeaveAttendanceSyncSummary)();
        if (name === "list_leave_attendance_sync_errors")
            return await (0, handlers_js_1.handleListLeaveAttendanceSyncErrors)();
        if (name === "get_attendance_settings")
            return await (0, handlers_js_1.handleGetAttendanceSettings)();
        if (name === "get_employee_attendance")
            return await (0, handlers_js_1.handleGetEmployeeAttendance)(a);
        if (name === "list_attendance_regularizations")
            return await (0, handlers_js_1.handleListRegularizations)(args);
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
});
// ── Start ─────────────────────────────────────────────────────────────────────
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
}
main().catch((err) => {
    process.stderr.write(`Fatal: ${err}\n`);
    process.exit(1);
});
