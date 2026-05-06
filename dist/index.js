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
