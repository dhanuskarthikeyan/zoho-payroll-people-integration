#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { isConnected } from "./config.js";
import { PRE_CONNECT_TOOLS, POST_CONNECT_TOOLS } from "./tools/definitions.js";
import {
  handleConnect,
  handleDisconnect,
  handleStatus,
  handleHealthCheck,
  handleSyncEmployee,
  handleSyncAll,
  handleFixIssues,
  handleListEmployees,
  handleGetEmployee,
  handleConfigureApiCredentials,
  handleGetDashboard,
  handleTriggerSync,
  handleGetSyncHistory,
  handleListSyncErrors,
  handleGetPreferences,
  handleUpdatePreferences,
  handleGetFieldMappings,
  handleGetFieldMappingEditData,
  handleUpdateFieldMappings,
  handleGetLeaveAttendanceDetails,
  handleTriggerLeaveAttendanceSync,
  handleGetLeaveSettings,
  handleGetLeaveAttendanceSyncSummary,
  handleListLeaveAttendanceSyncErrors,
  handleGetAttendanceSettings,
  handleGetEmployeeAttendance,
  handleListRegularizations,
} from "./tools/handlers.js";

const server = new Server(
  {
    name: "zoho-integration-mcp",
    version: "1.0.0",
  },
  {
    capabilities: { tools: {} },
    instructions:
      "MANDATORY PRE-EXECUTION CHECKLIST for the zoho-integration plugin.\n" +
      "Before invoking ANY tool from this plugin in a new session, the agent MUST ask the user for and confirm the following three values, even if a saved config already exists:\n" +
      "  1. Zoho MCP URL — from https://www.zoho.com/mcp (single URL covering Payroll + People).\n" +
      "  2. Zoho People organization ID.\n" +
      "  3. Zoho Payroll organization ID.\n" +
      "Do NOT silently reuse cached credentials. Prompt the user explicitly, wait for their response, then call connect_zoho (and configure_people_api_credentials when REST tools are needed) with the supplied values. Only after the user confirms all three may the agent proceed to call other tools.",
  }
);

// ── List tools — gated by connection state ────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: isConnected() ? POST_CONNECT_TOOLS : PRE_CONNECT_TOOLS };
});

// ── Route tool calls ──────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  const a = args as Record<string, string>;

  if (name === "connect_zoho")           return handleConnect(a);
  if (name === "disconnect_zoho")        return handleDisconnect();
  if (name === "connection_status")      return handleStatus();

  // All tools below require an active connection
  if (!isConnected()) {
    return {
      content: [{
        type: "text",
        text: "Not connected. Please run connect_zoho first.\nGet your MCP URLs at https://www.zoho.com/mcp",
      }],
      isError: true,
    };
  }

  try {
    if (name === "check_integration_health")          return await handleHealthCheck();
    if (name === "sync_employee")                     return await handleSyncEmployee(a);
    if (name === "sync_all_employees")                return await handleSyncAll();
    if (name === "fix_sync_issues")                   return await handleFixIssues(a);
    if (name === "list_employees")                    return await handleListEmployees(a);
    if (name === "get_employee_details")              return await handleGetEmployee(a);
    if (name === "configure_people_api_credentials")  return handleConfigureApiCredentials(a);
    if (name === "get_people_integration_dashboard")  return await handleGetDashboard();
    if (name === "trigger_people_sync")               return await handleTriggerSync();
    if (name === "get_people_sync_history")           return await handleGetSyncHistory();
    if (name === "list_people_sync_errors")           return await handleListSyncErrors();
    if (name === "get_people_integration_preferences") return await handleGetPreferences();
    if (name === "update_people_integration_preferences") return await handleUpdatePreferences(args as Record<string, unknown>);
    if (name === "get_people_field_mappings")              return await handleGetFieldMappings(a);
    if (name === "get_people_field_mapping_edit_data")       return await handleGetFieldMappingEditData(a);
    if (name === "update_people_employee_field_mappings")    return await handleUpdateFieldMappings(args as Record<string, unknown>);
    if (name === "get_leave_attendance_details")             return await handleGetLeaveAttendanceDetails();
    if (name === "trigger_leave_attendance_sync")            return await handleTriggerLeaveAttendanceSync();
    if (name === "get_leave_attendance_settings")            return await handleGetLeaveSettings();
    if (name === "get_leave_attendance_sync_summary")        return await handleGetLeaveAttendanceSyncSummary();
    if (name === "list_leave_attendance_sync_errors")        return await handleListLeaveAttendanceSyncErrors();
    if (name === "get_attendance_settings")                  return await handleGetAttendanceSettings();
    if (name === "get_employee_attendance")                  return await handleGetEmployeeAttendance(a);
    if (name === "list_attendance_regularizations")          return await handleListRegularizations(args as Record<string, unknown>);

    return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
