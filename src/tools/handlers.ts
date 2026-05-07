import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { loadConfig, saveConfig, clearConfig, ZohoConfig } from "../config.js";
import { validateMcpUrl, ZohoPayrollClient, ZohoPeopleClient, Employee, ZohoPeopleIntegrationClient, ZohoLeaveAttendanceClient, FieldMappingEntry } from "../zoho-client.js";

function text(content: string): CallToolResult {
  return { content: [{ type: "text", text: content }] };
}

function json(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

// ── connect_zoho ──────────────────────────────────────────────────────────────

export async function handleConnect(args: Record<string, string>): Promise<CallToolResult> {
  const { zoho_mcp_url, people_org_id, payroll_org_id } = args;

  if (!zoho_mcp_url?.startsWith("http")) {
    return text(
      "Invalid URL. Please provide a full https:// URL.\n\n" +
      "How to get it:\n" +
      "  1. Go to https://www.zoho.com/mcp\n" +
      "  2. Sign in with your Zoho account\n" +
      "  3. Enable Zoho Payroll and Zoho People in the Apps/Tools section\n" +
      "  4. Copy the single MCP URL shown on the page"
    );
  }

  if (!people_org_id || !payroll_org_id) {
    return text(
      "Missing required organization IDs.\n\n" +
      "Before connecting, please provide:\n" +
      "  • people_org_id  — your Zoho People organization ID\n" +
      "  • payroll_org_id — your Zoho Payroll organization ID\n\n" +
      "Ask the user for these values — do not guess or reuse cached IDs."
    );
  }

  const { ok, apps } = await validateMcpUrl(zoho_mcp_url);

  if (!ok) {
    return text(
      "Cannot reach that Zoho MCP URL.\n\n" +
      "Please check:\n" +
      "  • You copied the full URL from https://www.zoho.com/mcp\n" +
      "  • You are signed in to Zoho\n" +
      "  • Zoho Payroll and Zoho People are enabled in the MCP Apps section"
    );
  }

  const missingApps: string[] = [];
  if (!apps.includes("payroll")) missingApps.push("Zoho Payroll");
  if (!apps.includes("people"))  missingApps.push("Zoho People");

  if (missingApps.length > 0) {
    return text(
      `URL is valid but these apps are not enabled in your Zoho MCP:\n` +
      missingApps.map((a) => `  • ${a}`).join("\n") + "\n\n" +
      "To fix:\n" +
      "  1. Go to https://www.zoho.com/mcp\n" +
      `  2. Enable ${missingApps.join(" and ")} in the Apps/Tools section\n` +
      "  3. Copy the updated MCP URL and try connect_zoho again"
    );
  }

  const config: ZohoConfig = {
    zoho_mcp_url,
    enabled_apps: apps,
    connected_at: new Date().toISOString(),
    people_org_id,
    payroll_org_id,
    organization_id: payroll_org_id, // legacy alias used by REST clients
  };
  saveConfig(config);

  // Auto-discover Payroll organization ID
  let orgLine = "";
  try {
    const payroll = new ZohoPayrollClient(config);
    const orgId   = await payroll.getPayrollOrgId();
    const updated: ZohoConfig = { ...config, organization_id: orgId };
    saveConfig(updated);
    orgLine = `✓ Payroll Org ID — ${orgId} (auto-discovered)\n`;
  } catch {
    orgLine = "⚠️  Could not auto-discover Payroll Org ID — run check_integration_health to retry\n";
  }

  return text(
    "Connected!\n\n" +
    "✓ Zoho MCP URL — saved\n" +
    "✓ Zoho Payroll — enabled\n" +
    "✓ Zoho People  — enabled\n" +
    orgLine + "\n" +
    "All integration tools are now available. Next steps:\n" +
    "  • check_integration_health       — verify sync status\n" +
    "  • get_people_field_mappings      — see which fields are mapped\n" +
    "  • trigger_people_sync            — push People employees to Payroll\n" +
    "  • list_people_sync_errors        — see any sync failures"
  );
}

// ── disconnect_zoho ───────────────────────────────────────────────────────────

export function handleDisconnect(): CallToolResult {
  clearConfig();
  return text("Disconnected. Your Zoho MCP credentials have been removed from this machine.");
}

// ── connection_status ─────────────────────────────────────────────────────────

export function handleStatus(): CallToolResult {
  const config = loadConfig();
  if (!config) {
    return text(
      "Not connected.\n\n" +
      "Run connect_zoho with your Zoho MCP URL from https://www.zoho.com/mcp\n" +
      "Make sure Zoho Payroll and Zoho People are enabled in the Apps section."
    );
  }
  return text(
    `Connected since: ${new Date(config.connected_at).toLocaleString()}\n` +
    `Zoho MCP URL:    ${maskUrl(config.zoho_mcp_url)}\n` +
    `Enabled apps:    ${config.enabled_apps.join(", ")}`
  );
}

// ── check_integration_health ──────────────────────────────────────────────────

export async function handleHealthCheck(): Promise<CallToolResult> {
  const config  = loadConfig()!;
  const payroll = new ZohoPayrollClient(config);

  // Payroll list is always available via MCP
  const payrollEmployees = await payroll.listEmployees();

  const lines: string[] = [
    `Integration Health Report — ${new Date().toLocaleString()}`,
    `─────────────────────────────────────────`,
    `Payroll employees: ${payrollEmployees.length}`,
    ``,
  ];

  if (payrollEmployees.length === 0) {
    lines.push("⚠️  No employees found in Payroll yet.");
    lines.push("   Run trigger_people_sync to push employees from Zoho People → Payroll.");
  } else {
    lines.push(`✅ ${payrollEmployees.length} employee(s) in Payroll.`);
    payrollEmployees.slice(0, 10).forEach((e) =>
      lines.push(`   • ${e.id} — ${e.name} (${e.email})`)
    );
    if (payrollEmployees.length > 10) lines.push(`   … and ${payrollEmployees.length - 10} more`);
    lines.push("");
    lines.push("For People → Payroll sync status, use get_people_integration_dashboard.");
    lines.push("For sync errors, use list_people_sync_errors.");
  }

  return text(lines.join("\n"));
}

// ── sync_employee ─────────────────────────────────────────────────────────────

export async function handleSyncEmployee(args: Record<string, string>): Promise<CallToolResult> {
  const { employee_id } = args;
  const config = loadConfig()!;
  const payroll = new ZohoPayrollClient(config);
  const people  = new ZohoPeopleClient(config);

  const employee = await people.getEmployee(employee_id);
  if (!employee) return text(`Employee ${employee_id} not found in Zoho People.`);

  const existing = await payroll.getEmployee(employee_id);
  const result   = existing
    ? await payroll.updateEmployee(employee_id, employee)
    : await payroll.addEmployee(employee);

  return text(
    result.success
      ? `✅ Employee ${employee_id} (${employee.name}) ${existing ? "updated" : "added"} in Zoho Payroll.`
      : `❌ Failed: ${result.message}`
  );
}

// ── sync_all_employees ────────────────────────────────────────────────────────

export async function handleSyncAll(): Promise<CallToolResult> {
  const config = loadConfig()!;

  // Use the People Integration REST API which handles the full sync on Zoho's backend
  if (config.organization_id && config.access_token) {
    const client = new ZohoPeopleIntegrationClient(config);
    const data   = await client.triggerSync();
    return json(data);
  }

  // Fallback: direct MCP — create employees one by one from Payroll perspective
  // (People has no list-all-employees MCP tool; direct sync requires REST API credentials)
  return text(
    "To run a full People → Payroll sync, configure REST API credentials first:\n\n" +
    "  configure_people_api_credentials with:\n" +
    "    organization_id  (from Zoho Payroll → Settings → Organization)\n" +
    "    access_token     (OAuth token with ZohoPayroll.employees.CREATE scope)\n\n" +
    "Then run sync_all_employees again."
  );
}

// ── fix_sync_issues ───────────────────────────────────────────────────────────

export async function handleFixIssues(args: Record<string, string>): Promise<CallToolResult> {
  const { issue_type } = args;
  const config  = loadConfig()!;

  const lines: string[] = [];

  if (issue_type === "missing_employees" || issue_type === "all") {
    // Trigger People → Payroll sync to import missing employees
    if (config.organization_id && config.access_token) {
      const client = new ZohoPeopleIntegrationClient(config);
      lines.push("Triggering People → Payroll employee sync...");
      try {
        await client.triggerSync();
        lines.push("  ✅ Sync triggered. Employees missing in Payroll will be imported.");
        lines.push("  Run list_people_sync_errors after 1–2 min to verify.");
      } catch (e) {
        lines.push(`  ❌ Sync failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      lines.push("To auto-fix missing employees, run configure_people_api_credentials first.");
    }
  }

  if (issue_type === "department_mismatch" || issue_type === "all") {
    lines.push("\nDepartment mismatches are resolved when employees re-sync from People.");
    lines.push("  Run trigger_people_sync to push updated data from People → Payroll.");
  }

  if (issue_type === "salary_mismatch" || issue_type === "all") {
    lines.push("\nSalary mismatches require manual review — salary data is sensitive.");
    lines.push("  Review in Zoho Payroll → Employees → [Employee] → Salary.");
  }

  return text(lines.join("\n") || "No fixes applied. Specify issue_type: missing_employees, department_mismatch, salary_mismatch, or all.");
}

// ── list_employees ────────────────────────────────────────────────────────────

export async function handleListEmployees(args: Record<string, string>): Promise<CallToolResult> {
  const { source } = args;
  const config = loadConfig()!;

  const result: Record<string, unknown> = {};

  if (source === "payroll" || source === "both") {
    const payrollList = await new ZohoPayrollClient(config).listEmployees();
    result.payroll_employees = { count: payrollList.length, employees: payrollList };
  }

  if (source === "people" || source === "both") {
    // Zoho People MCP has no list-all-employees tool.
    // Use get_people_integration_dashboard + list_people_sync_errors for People sync status.
    result.people_employees = {
      count: null,
      note: "Listing all People employees is not available via MCP. Use get_people_integration_dashboard to see sync counts, or trigger_people_sync to sync them to Payroll.",
    };
  }

  return json(result);
}

// ── get_employee_details ──────────────────────────────────────────────────────

export async function handleGetEmployee(args: Record<string, string>): Promise<CallToolResult> {
  const { employee_id } = args;
  const config = loadConfig()!;

  const [peopleEmp, payrollEmp, peopleSalary, payrollSalary] = await Promise.all([
    new ZohoPeopleClient(config).getEmployee(employee_id),
    new ZohoPayrollClient(config).getEmployee(employee_id),
    new ZohoPeopleClient(config).getSalary(employee_id),
    new ZohoPayrollClient(config).getSalary(employee_id),
  ]);

  return json({
    employee_id,
    people:  { profile: peopleEmp,  salary: peopleSalary  },
    payroll: { profile: payrollEmp, salary: payrollSalary },
    in_sync: JSON.stringify(peopleEmp) === JSON.stringify(payrollEmp),
  });
}

// ── configure_people_api_credentials ─────────────────────────────────────────

export function handleConfigureApiCredentials(args: Record<string, string>): CallToolResult {
  const { organization_id, access_token } = args;
  const config = loadConfig();
  if (!config) {
    return text("Not connected. Run connect_zoho first.");
  }
  const updated: ZohoConfig = { ...config, organization_id, access_token };
  saveConfig(updated);
  return text(
    "People Integration API credentials saved.\n\n" +
    `✓ Organization ID: ${organization_id}\n` +
    "✓ Access token:    saved (masked)\n\n" +
    "You can now use:\n" +
    "  • get_people_integration_dashboard\n" +
    "  • trigger_people_sync\n" +
    "  • get_people_sync_history\n" +
    "  • list_people_sync_errors\n" +
    "  • get_people_integration_preferences\n" +
    "  • update_people_integration_preferences\n" +
    "  • get_people_field_mappings"
  );
}

// ── get_people_integration_dashboard ─────────────────────────────────────────

export async function handleGetDashboard(): Promise<CallToolResult> {
  const config = loadConfig()!;
  const client = new ZohoPeopleIntegrationClient(config);
  const data = await client.getDashboard();
  return json(data);
}

// ── trigger_people_sync ───────────────────────────────────────────────────────

export async function handleTriggerSync(): Promise<CallToolResult> {
  const config = loadConfig()!;
  const client = new ZohoPeopleIntegrationClient(config);
  const data = await client.triggerSync();
  return json(data);
}

// ── get_people_sync_history ───────────────────────────────────────────────────

export async function handleGetSyncHistory(): Promise<CallToolResult> {
  const config = loadConfig()!;
  const client = new ZohoPeopleIntegrationClient(config);
  const data = await client.getSyncHistory();
  return json(data);
}

// ── list_people_sync_errors ───────────────────────────────────────────────────

export async function handleListSyncErrors(): Promise<CallToolResult> {
  const config = loadConfig()!;
  const client = new ZohoPeopleIntegrationClient(config);
  const data = await client.listSyncErrors();
  return json(data);
}

// ── get_people_integration_preferences ───────────────────────────────────────

export async function handleGetPreferences(): Promise<CallToolResult> {
  const config = loadConfig()!;
  const client = new ZohoPeopleIntegrationClient(config);
  const data = await client.getPreferences();
  return json(data);
}

// ── update_people_integration_preferences ────────────────────────────────────

export async function handleUpdatePreferences(args: Record<string, unknown>): Promise<CallToolResult> {
  const config = loadConfig()!;
  const client = new ZohoPeopleIntegrationClient(config);
  const body: Record<string, unknown> = {
    is_allow_non_users:    args.is_allow_non_users,
    is_allow_portal_access: args.is_allow_portal_access,
  };
  if (args.employee_types)   body.employee_types   = args.employee_types;
  if (args.contractor_types) body.contractor_types = args.contractor_types;
  if (args.work_locations)   body.work_locations   = args.work_locations;
  const data = await client.updatePreferences(body);
  return json(data);
}

// ── get_people_field_mappings ─────────────────────────────────────────────────

export async function handleGetFieldMappings(args: Record<string, string>): Promise<CallToolResult> {
  const config = loadConfig()!;
  const client = new ZohoPeopleIntegrationClient(config);
  const entity = args.entity ?? "employee";
  const data = await client.getFieldMappings(entity);
  return json(data);
}

// ── get_people_field_mapping_edit_data ────────────────────────────────────────

export async function handleGetFieldMappingEditData(args: Record<string, string>): Promise<CallToolResult> {
  const config = loadConfig()!;
  const client = new ZohoPeopleIntegrationClient(config);
  const entity = args.entity ?? "employee";
  const data = await client.getFieldMappingEditData(entity);
  return json(data);
}

// ── update_people_employee_field_mappings ─────────────────────────────────────

export async function handleUpdateFieldMappings(args: Record<string, unknown>): Promise<CallToolResult> {
  const config = loadConfig()!;
  const client = new ZohoPeopleIntegrationClient(config);
  const fields = args.fields as FieldMappingEntry[];
  if (!Array.isArray(fields) || fields.length === 0) {
    return text("fields array is required and must not be empty.");
  }
  const data = await client.updateEmployeeFieldMappings(fields);
  return json(data);
}

// ── Leave & Attendance handlers ───────────────────────────────────────────────

export async function handleGetLeaveAttendanceDetails(): Promise<CallToolResult> {
  return json(await new ZohoLeaveAttendanceClient(loadConfig()!).getIntegrationDetails());
}

export async function handleTriggerLeaveAttendanceSync(): Promise<CallToolResult> {
  return json(await new ZohoLeaveAttendanceClient(loadConfig()!).triggerSync());
}

export async function handleGetLeaveSettings(): Promise<CallToolResult> {
  return json(await new ZohoLeaveAttendanceClient(loadConfig()!).getLeaveSettings());
}

export async function handleGetLeaveAttendanceSyncSummary(): Promise<CallToolResult> {
  return json(await new ZohoLeaveAttendanceClient(loadConfig()!).getSyncSummary());
}

export async function handleListLeaveAttendanceSyncErrors(): Promise<CallToolResult> {
  return json(await new ZohoLeaveAttendanceClient(loadConfig()!).getSyncErrors());
}

export async function handleGetAttendanceSettings(): Promise<CallToolResult> {
  return json(await new ZohoLeaveAttendanceClient(loadConfig()!).getAttendanceSettings());
}

export async function handleGetEmployeeAttendance(args: Record<string, string>): Promise<CallToolResult> {
  const { employee_id, period } = args;
  if (!employee_id || !period) return text("employee_id and period are required.");
  return json(await new ZohoLeaveAttendanceClient(loadConfig()!).getEmployeeAttendance(employee_id, period));
}

export async function handleListRegularizations(args: Record<string, unknown>): Promise<CallToolResult> {
  const opts: Record<string, string | number> = {};
  if (args.employee_id) opts.employee_id = String(args.employee_id);
  if (args.from_date)   opts.from_date   = String(args.from_date);
  if (args.to_date)     opts.to_date     = String(args.to_date);
  if (args.status)      opts.status      = String(args.status);
  if (args.page)        opts.page        = Number(args.page);
  return json(await new ZohoLeaveAttendanceClient(loadConfig()!).listRegularizations(opts));
}

// ── helpers ───────────────────────────────────────────────────────────────────

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}/***`;
  } catch {
    return url.slice(0, 30) + "***";
  }
}
