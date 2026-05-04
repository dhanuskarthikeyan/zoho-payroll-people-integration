import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const CONNECT_TOOL: Tool = {
  name: "connect_zoho",
  description:
    "Connect to Zoho via the single Zoho MCP URL. " +
    "Steps: go to https://www.zoho.com/mcp → sign in → copy your MCP URL → " +
    "enable Zoho Payroll and Zoho People in the Apps/Tools section → paste the URL here. " +
    "This must be done before any other tool is available.",
  inputSchema: {
    type: "object",
    required: ["zoho_mcp_url"],
    properties: {
      zoho_mcp_url: {
        type: "string",
        description:
          "Your Zoho MCP URL from https://www.zoho.com/mcp (single URL covering all enabled apps)",
      },
    },
  },
};

export const DISCONNECT_TOOL: Tool = {
  name: "disconnect_zoho",
  description: "Remove saved Zoho MCP credentials from this machine.",
  inputSchema: { type: "object", properties: {} },
};

export const STATUS_TOOL: Tool = {
  name: "connection_status",
  description: "Show whether Zoho Payroll and Zoho People are connected.",
  inputSchema: { type: "object", properties: {} },
};

export const HEALTH_TOOL: Tool = {
  name: "check_integration_health",
  description:
    "Compare Zoho Payroll and Zoho People and report: missing employees, salary mismatches, department mismatches.",
  inputSchema: { type: "object", properties: {} },
};

export const SYNC_EMPLOYEE_TOOL: Tool = {
  name: "sync_employee",
  description:
    "Copy an employee record from Zoho People into Zoho Payroll (or update it if already present).",
  inputSchema: {
    type: "object",
    required: ["employee_id"],
    properties: {
      employee_id: {
        type: "string",
        description: "Employee ID from Zoho People",
      },
    },
  },
};

export const SYNC_ALL_TOOL: Tool = {
  name: "sync_all_employees",
  description: "Sync every employee from Zoho People into Zoho Payroll in one pass.",
  inputSchema: { type: "object", properties: {} },
};

export const FIX_ISSUES_TOOL: Tool = {
  name: "fix_sync_issues",
  description:
    "Auto-fix common integration problems between Zoho Payroll and Zoho People.",
  inputSchema: {
    type: "object",
    required: ["issue_type"],
    properties: {
      issue_type: {
        type: "string",
        enum: ["missing_employees", "salary_mismatch", "department_mismatch", "all"],
        description:
          "Which issue to fix. Use 'all' to fix everything in one shot.",
      },
    },
  },
};

export const LIST_EMPLOYEES_TOOL: Tool = {
  name: "list_employees",
  description: "List all employees from Zoho People, Zoho Payroll, or both.",
  inputSchema: {
    type: "object",
    required: ["source"],
    properties: {
      source: {
        type: "string",
        enum: ["people", "payroll", "both"],
        description: "Which system to query.",
      },
    },
  },
};

export const GET_EMPLOYEE_TOOL: Tool = {
  name: "get_employee_details",
  description: "Get full details for one employee from both Zoho People and Zoho Payroll side-by-side.",
  inputSchema: {
    type: "object",
    required: ["employee_id"],
    properties: {
      employee_id: { type: "string", description: "Employee ID" },
    },
  },
};

// Tools shown BEFORE connection
export const PRE_CONNECT_TOOLS: Tool[] = [CONNECT_TOOL];

// Full tool suite shown AFTER connection
export const POST_CONNECT_TOOLS: Tool[] = [
  STATUS_TOOL,
  DISCONNECT_TOOL,
  HEALTH_TOOL,
  LIST_EMPLOYEES_TOOL,
  GET_EMPLOYEE_TOOL,
  SYNC_EMPLOYEE_TOOL,
  SYNC_ALL_TOOL,
  FIX_ISSUES_TOOL,
];
