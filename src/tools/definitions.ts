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

export const CONFIGURE_API_CREDENTIALS_TOOL: Tool = {
  name: "configure_people_api_credentials",
  description:
    "Store your Zoho Payroll organization ID and OAuth access token to enable the " +
    "People Integration management tools (dashboard, sync history, preferences, field mappings). " +
    "Get your access token at https://api-console.zoho.com with scope ZohoPayroll.settings.READ,UPDATE,CREATE.",
  inputSchema: {
    type: "object",
    required: ["organization_id", "access_token"],
    properties: {
      organization_id: {
        type: "string",
        description: "Your Zoho Payroll organization ID (e.g. 10234695)",
      },
      access_token: {
        type: "string",
        description: "OAuth access token with ZohoPayroll.settings scopes",
      },
    },
  },
};

export const GET_DASHBOARD_TOOL: Tool = {
  name: "get_people_integration_dashboard",
  description:
    "Retrieve the Zoho People integration dashboard: credential info, last sync time, supported entities, overall sync status, and error count.",
  inputSchema: { type: "object", properties: {} },
};

export const TRIGGER_SYNC_TOOL: Tool = {
  name: "trigger_people_sync",
  description: "Trigger a manual sync between Zoho People and Zoho Payroll immediately.",
  inputSchema: { type: "object", properties: {} },
};

export const GET_SYNC_HISTORY_TOOL: Tool = {
  name: "get_people_sync_history",
  description: "Retrieve the sync history (started/completed times, status) and total error count for the Zoho People integration.",
  inputSchema: { type: "object", properties: {} },
};

export const LIST_SYNC_ERRORS_TOOL: Tool = {
  name: "list_people_sync_errors",
  description: "List all current sync errors for the Zoho People integration with entity names, error codes, and messages.",
  inputSchema: { type: "object", properties: {} },
};

export const GET_PREFERENCES_TOOL: Tool = {
  name: "get_people_integration_preferences",
  description:
    "Retrieve People integration preferences: portal access, non-user sync, employee types, contractor types, work locations, and org structure criteria.",
  inputSchema: { type: "object", properties: {} },
};

export const UPDATE_PREFERENCES_TOOL: Tool = {
  name: "update_people_integration_preferences",
  description: "Update Zoho People integration preferences such as portal access, non-user sync, employee types, and organization structure criteria.",
  inputSchema: {
    type: "object",
    required: ["is_allow_non_users", "is_allow_portal_access"],
    properties: {
      is_allow_non_users: {
        type: "boolean",
        description: "Allow non-users from Zoho People to be synced.",
      },
      is_allow_portal_access: {
        type: "boolean",
        description: "Allow portal access for synced employees.",
      },
      employee_types: {
        type: "array",
        items: { type: "string" },
        description: "Employee type IDs to include in sync.",
      },
      contractor_types: {
        type: "array",
        items: { type: "string" },
        description: "Contractor type IDs to include in sync.",
      },
      work_locations: {
        type: "array",
        items: { type: "string" },
        description: "Work location IDs to include in sync.",
      },
    },
  },
};

export const GET_FIELD_MAPPINGS_TOOL: Tool = {
  name: "get_people_field_mappings",
  description:
    "Retrieve the current field mappings between Zoho People and Zoho Payroll. " +
    "Shows which Payroll fields are mapped to People fields and which are unmapped. " +
    "Covers Basic Info, Personal Info, and Payment Info sections.",
  inputSchema: {
    type: "object",
    properties: {
      entity: {
        type: "string",
        enum: ["employee", "work_location"],
        description: "Entity to retrieve mappings for. Defaults to employee.",
      },
    },
  },
};

export const GET_FIELD_MAPPING_EDIT_DATA_TOOL: Tool = {
  name: "get_people_field_mapping_edit_data",
  description:
    "Retrieve the full field mapping edit page data: current mappings, all available Payroll fields (standard + custom), " +
    "and all available Zoho People fields. Use this to discover which People fields exist to fill an unmapped Payroll field.",
  inputSchema: {
    type: "object",
    properties: {
      entity: {
        type: "string",
        enum: ["employee", "work_location"],
        description: "Entity to retrieve mapping data for. Defaults to employee.",
      },
    },
  },
};

export const UPDATE_FIELD_MAPPINGS_TOOL: Tool = {
  name: "update_people_employee_field_mappings",
  description:
    "Update field mappings between Zoho People and Zoho Payroll for employees. " +
    "Use get_people_field_mapping_edit_data first to discover available People field names. " +
    "Provide ALL fields you want mapped — this replaces existing mappings for those fields.",
  inputSchema: {
    type: "object",
    required: ["fields"],
    properties: {
      fields: {
        type: "array",
        description: "List of field mappings to update.",
        items: {
          type: "object",
          required: ["payroll_field_name", "payroll_display_name", "people_field_name"],
          properties: {
            payroll_field_name: {
              type: "string",
              description: "API name of the Zoho Payroll field (e.g. first_name, pan_number, account_number).",
            },
            payroll_display_name: {
              type: "string",
              description: "Display name of the Payroll field (e.g. First Name, PAN Number).",
            },
            people_field_name: {
              type: "string",
              description: "API name of the matching Zoho People field (e.g. FirstName, PANNumber).",
            },
          },
        },
      },
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
  // People Integration management tools (require configure_people_api_credentials)
  CONFIGURE_API_CREDENTIALS_TOOL,
  GET_DASHBOARD_TOOL,
  TRIGGER_SYNC_TOOL,
  GET_SYNC_HISTORY_TOOL,
  LIST_SYNC_ERRORS_TOOL,
  GET_PREFERENCES_TOOL,
  UPDATE_PREFERENCES_TOOL,
  GET_FIELD_MAPPINGS_TOOL,
  GET_FIELD_MAPPING_EDIT_DATA_TOOL,
  UPDATE_FIELD_MAPPINGS_TOOL,
];
