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
} from "./tools/handlers.js";

const server = new Server(
  {
    name: "zoho-integration-mcp",
    version: "1.0.0",
  },
  {
    capabilities: { tools: {} },
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
    if (name === "check_integration_health") return await handleHealthCheck();
    if (name === "sync_employee")            return await handleSyncEmployee(a);
    if (name === "sync_all_employees")       return await handleSyncAll();
    if (name === "fix_sync_issues")          return await handleFixIssues(a);
    if (name === "list_employees")           return await handleListEmployees(a);
    if (name === "get_employee_details")     return await handleGetEmployee(a);

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
