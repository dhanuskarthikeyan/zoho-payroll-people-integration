"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleConnect = handleConnect;
exports.handleDisconnect = handleDisconnect;
exports.handleStatus = handleStatus;
exports.handleHealthCheck = handleHealthCheck;
exports.handleSyncEmployee = handleSyncEmployee;
exports.handleSyncAll = handleSyncAll;
exports.handleFixIssues = handleFixIssues;
exports.handleListEmployees = handleListEmployees;
exports.handleGetEmployee = handleGetEmployee;
exports.handleConfigureApiCredentials = handleConfigureApiCredentials;
exports.handleGetDashboard = handleGetDashboard;
exports.handleTriggerSync = handleTriggerSync;
exports.handleGetSyncHistory = handleGetSyncHistory;
exports.handleListSyncErrors = handleListSyncErrors;
exports.handleGetPreferences = handleGetPreferences;
exports.handleUpdatePreferences = handleUpdatePreferences;
exports.handleGetFieldMappings = handleGetFieldMappings;
exports.handleGetFieldMappingEditData = handleGetFieldMappingEditData;
exports.handleUpdateFieldMappings = handleUpdateFieldMappings;
exports.handleGetLeaveAttendanceDetails = handleGetLeaveAttendanceDetails;
exports.handleTriggerLeaveAttendanceSync = handleTriggerLeaveAttendanceSync;
exports.handleGetLeaveSettings = handleGetLeaveSettings;
exports.handleGetLeaveAttendanceSyncSummary = handleGetLeaveAttendanceSyncSummary;
exports.handleListLeaveAttendanceSyncErrors = handleListLeaveAttendanceSyncErrors;
exports.handleGetAttendanceSettings = handleGetAttendanceSettings;
exports.handleGetEmployeeAttendance = handleGetEmployeeAttendance;
exports.handleListRegularizations = handleListRegularizations;
const config_js_1 = require("../config.js");
const zoho_client_js_1 = require("../zoho-client.js");
function text(content) {
    return { content: [{ type: "text", text: content }] };
}
function json(data) {
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}
// ── connect_zoho ──────────────────────────────────────────────────────────────
async function handleConnect(args) {
    const { zoho_mcp_url } = args;
    if (!zoho_mcp_url?.startsWith("http")) {
        return text("Invalid URL. Please provide a full https:// URL.\n\n" +
            "How to get it:\n" +
            "  1. Go to https://www.zoho.com/mcp\n" +
            "  2. Sign in with your Zoho account\n" +
            "  3. Enable Zoho Payroll and Zoho People in the Apps/Tools section\n" +
            "  4. Copy the single MCP URL shown on the page");
    }
    const { ok, apps } = await (0, zoho_client_js_1.validateMcpUrl)(zoho_mcp_url);
    if (!ok) {
        return text("Cannot reach that Zoho MCP URL.\n\n" +
            "Please check:\n" +
            "  • You copied the full URL from https://www.zoho.com/mcp\n" +
            "  • You are signed in to Zoho\n" +
            "  • Zoho Payroll and Zoho People are enabled in the MCP Apps section");
    }
    const missingApps = [];
    if (!apps.includes("payroll"))
        missingApps.push("Zoho Payroll");
    if (!apps.includes("people"))
        missingApps.push("Zoho People");
    if (missingApps.length > 0) {
        return text(`URL is valid but these apps are not enabled in your Zoho MCP:\n` +
            missingApps.map((a) => `  • ${a}`).join("\n") + "\n\n" +
            "To fix:\n" +
            "  1. Go to https://www.zoho.com/mcp\n" +
            `  2. Enable ${missingApps.join(" and ")} in the Apps/Tools section\n` +
            "  3. Copy the updated MCP URL and try connect_zoho again");
    }
    const config = {
        zoho_mcp_url,
        enabled_apps: apps,
        connected_at: new Date().toISOString(),
    };
    (0, config_js_1.saveConfig)(config);
    return text("Connected!\n\n" +
        "✓ Zoho MCP URL — saved\n" +
        "✓ Zoho Payroll — enabled\n" +
        "✓ Zoho People  — enabled\n\n" +
        "All integration tools are now available. Try:\n" +
        "  • check_integration_health   — find sync gaps\n" +
        "  • list_employees             — see both systems\n" +
        "  • sync_all_employees         — one-shot full sync\n" +
        "  • fix_sync_issues            — auto-fix problems");
}
// ── disconnect_zoho ───────────────────────────────────────────────────────────
function handleDisconnect() {
    (0, config_js_1.clearConfig)();
    return text("Disconnected. Your Zoho MCP credentials have been removed from this machine.");
}
// ── connection_status ─────────────────────────────────────────────────────────
function handleStatus() {
    const config = (0, config_js_1.loadConfig)();
    if (!config) {
        return text("Not connected.\n\n" +
            "Run connect_zoho with your Zoho MCP URL from https://www.zoho.com/mcp\n" +
            "Make sure Zoho Payroll and Zoho People are enabled in the Apps section.");
    }
    return text(`Connected since: ${new Date(config.connected_at).toLocaleString()}\n` +
        `Zoho MCP URL:    ${maskUrl(config.zoho_mcp_url)}\n` +
        `Enabled apps:    ${config.enabled_apps.join(", ")}`);
}
// ── check_integration_health ──────────────────────────────────────────────────
async function handleHealthCheck() {
    const config = (0, config_js_1.loadConfig)();
    const payroll = new zoho_client_js_1.ZohoPayrollClient(config);
    // Payroll list is always available via MCP
    const payrollEmployees = await payroll.listEmployees();
    const lines = [
        `Integration Health Report — ${new Date().toLocaleString()}`,
        `─────────────────────────────────────────`,
        `Payroll employees: ${payrollEmployees.length}`,
        ``,
    ];
    if (payrollEmployees.length === 0) {
        lines.push("⚠️  No employees found in Payroll yet.");
        lines.push("   Run trigger_people_sync to push employees from Zoho People → Payroll.");
    }
    else {
        lines.push(`✅ ${payrollEmployees.length} employee(s) in Payroll.`);
        payrollEmployees.slice(0, 10).forEach((e) => lines.push(`   • ${e.id} — ${e.name} (${e.email})`));
        if (payrollEmployees.length > 10)
            lines.push(`   … and ${payrollEmployees.length - 10} more`);
        lines.push("");
        lines.push("For People → Payroll sync status, use get_people_integration_dashboard.");
        lines.push("For sync errors, use list_people_sync_errors.");
    }
    return text(lines.join("\n"));
}
// ── sync_employee ─────────────────────────────────────────────────────────────
async function handleSyncEmployee(args) {
    const { employee_id } = args;
    const config = (0, config_js_1.loadConfig)();
    const payroll = new zoho_client_js_1.ZohoPayrollClient(config);
    const people = new zoho_client_js_1.ZohoPeopleClient(config);
    const employee = await people.getEmployee(employee_id);
    if (!employee)
        return text(`Employee ${employee_id} not found in Zoho People.`);
    const existing = await payroll.getEmployee(employee_id);
    const result = existing
        ? await payroll.updateEmployee(employee_id, employee)
        : await payroll.addEmployee(employee);
    return text(result.success
        ? `✅ Employee ${employee_id} (${employee.name}) ${existing ? "updated" : "added"} in Zoho Payroll.`
        : `❌ Failed: ${result.message}`);
}
// ── sync_all_employees ────────────────────────────────────────────────────────
async function handleSyncAll() {
    const config = (0, config_js_1.loadConfig)();
    // Use the People Integration REST API which handles the full sync on Zoho's backend
    if (config.organization_id && config.access_token) {
        const client = new zoho_client_js_1.ZohoPeopleIntegrationClient(config);
        const data = await client.triggerSync();
        return json(data);
    }
    // Fallback: direct MCP — create employees one by one from Payroll perspective
    // (People has no list-all-employees MCP tool; direct sync requires REST API credentials)
    return text("To run a full People → Payroll sync, configure REST API credentials first:\n\n" +
        "  configure_people_api_credentials with:\n" +
        "    organization_id  (from Zoho Payroll → Settings → Organization)\n" +
        "    access_token     (OAuth token with ZohoPayroll.employees.CREATE scope)\n\n" +
        "Then run sync_all_employees again.");
}
// ── fix_sync_issues ───────────────────────────────────────────────────────────
async function handleFixIssues(args) {
    const { issue_type } = args;
    const config = (0, config_js_1.loadConfig)();
    const lines = [];
    if (issue_type === "missing_employees" || issue_type === "all") {
        // Trigger People → Payroll sync to import missing employees
        if (config.organization_id && config.access_token) {
            const client = new zoho_client_js_1.ZohoPeopleIntegrationClient(config);
            lines.push("Triggering People → Payroll employee sync...");
            try {
                await client.triggerSync();
                lines.push("  ✅ Sync triggered. Employees missing in Payroll will be imported.");
                lines.push("  Run list_people_sync_errors after 1–2 min to verify.");
            }
            catch (e) {
                lines.push(`  ❌ Sync failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
        else {
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
async function handleListEmployees(args) {
    const { source } = args;
    const config = (0, config_js_1.loadConfig)();
    const result = {};
    if (source === "payroll" || source === "both") {
        const payrollList = await new zoho_client_js_1.ZohoPayrollClient(config).listEmployees();
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
async function handleGetEmployee(args) {
    const { employee_id } = args;
    const config = (0, config_js_1.loadConfig)();
    const [peopleEmp, payrollEmp, peopleSalary, payrollSalary] = await Promise.all([
        new zoho_client_js_1.ZohoPeopleClient(config).getEmployee(employee_id),
        new zoho_client_js_1.ZohoPayrollClient(config).getEmployee(employee_id),
        new zoho_client_js_1.ZohoPeopleClient(config).getSalary(employee_id),
        new zoho_client_js_1.ZohoPayrollClient(config).getSalary(employee_id),
    ]);
    return json({
        employee_id,
        people: { profile: peopleEmp, salary: peopleSalary },
        payroll: { profile: payrollEmp, salary: payrollSalary },
        in_sync: JSON.stringify(peopleEmp) === JSON.stringify(payrollEmp),
    });
}
// ── configure_people_api_credentials ─────────────────────────────────────────
function handleConfigureApiCredentials(args) {
    const { organization_id, access_token } = args;
    const config = (0, config_js_1.loadConfig)();
    if (!config) {
        return text("Not connected. Run connect_zoho first.");
    }
    const updated = { ...config, organization_id, access_token };
    (0, config_js_1.saveConfig)(updated);
    return text("People Integration API credentials saved.\n\n" +
        `✓ Organization ID: ${organization_id}\n` +
        "✓ Access token:    saved (masked)\n\n" +
        "You can now use:\n" +
        "  • get_people_integration_dashboard\n" +
        "  • trigger_people_sync\n" +
        "  • get_people_sync_history\n" +
        "  • list_people_sync_errors\n" +
        "  • get_people_integration_preferences\n" +
        "  • update_people_integration_preferences\n" +
        "  • get_people_field_mappings");
}
// ── get_people_integration_dashboard ─────────────────────────────────────────
async function handleGetDashboard() {
    const config = (0, config_js_1.loadConfig)();
    const client = new zoho_client_js_1.ZohoPeopleIntegrationClient(config);
    const data = await client.getDashboard();
    return json(data);
}
// ── trigger_people_sync ───────────────────────────────────────────────────────
async function handleTriggerSync() {
    const config = (0, config_js_1.loadConfig)();
    const client = new zoho_client_js_1.ZohoPeopleIntegrationClient(config);
    const data = await client.triggerSync();
    return json(data);
}
// ── get_people_sync_history ───────────────────────────────────────────────────
async function handleGetSyncHistory() {
    const config = (0, config_js_1.loadConfig)();
    const client = new zoho_client_js_1.ZohoPeopleIntegrationClient(config);
    const data = await client.getSyncHistory();
    return json(data);
}
// ── list_people_sync_errors ───────────────────────────────────────────────────
async function handleListSyncErrors() {
    const config = (0, config_js_1.loadConfig)();
    const client = new zoho_client_js_1.ZohoPeopleIntegrationClient(config);
    const data = await client.listSyncErrors();
    return json(data);
}
// ── get_people_integration_preferences ───────────────────────────────────────
async function handleGetPreferences() {
    const config = (0, config_js_1.loadConfig)();
    const client = new zoho_client_js_1.ZohoPeopleIntegrationClient(config);
    const data = await client.getPreferences();
    return json(data);
}
// ── update_people_integration_preferences ────────────────────────────────────
async function handleUpdatePreferences(args) {
    const config = (0, config_js_1.loadConfig)();
    const client = new zoho_client_js_1.ZohoPeopleIntegrationClient(config);
    const body = {
        is_allow_non_users: args.is_allow_non_users,
        is_allow_portal_access: args.is_allow_portal_access,
    };
    if (args.employee_types)
        body.employee_types = args.employee_types;
    if (args.contractor_types)
        body.contractor_types = args.contractor_types;
    if (args.work_locations)
        body.work_locations = args.work_locations;
    const data = await client.updatePreferences(body);
    return json(data);
}
// ── get_people_field_mappings ─────────────────────────────────────────────────
async function handleGetFieldMappings(args) {
    const config = (0, config_js_1.loadConfig)();
    const client = new zoho_client_js_1.ZohoPeopleIntegrationClient(config);
    const entity = args.entity ?? "employee";
    const data = await client.getFieldMappings(entity);
    return json(data);
}
// ── get_people_field_mapping_edit_data ────────────────────────────────────────
async function handleGetFieldMappingEditData(args) {
    const config = (0, config_js_1.loadConfig)();
    const client = new zoho_client_js_1.ZohoPeopleIntegrationClient(config);
    const entity = args.entity ?? "employee";
    const data = await client.getFieldMappingEditData(entity);
    return json(data);
}
// ── update_people_employee_field_mappings ─────────────────────────────────────
async function handleUpdateFieldMappings(args) {
    const config = (0, config_js_1.loadConfig)();
    const client = new zoho_client_js_1.ZohoPeopleIntegrationClient(config);
    const fields = args.fields;
    if (!Array.isArray(fields) || fields.length === 0) {
        return text("fields array is required and must not be empty.");
    }
    const data = await client.updateEmployeeFieldMappings(fields);
    return json(data);
}
// ── Leave & Attendance handlers ───────────────────────────────────────────────
async function handleGetLeaveAttendanceDetails() {
    return json(await new zoho_client_js_1.ZohoLeaveAttendanceClient((0, config_js_1.loadConfig)()).getIntegrationDetails());
}
async function handleTriggerLeaveAttendanceSync() {
    return json(await new zoho_client_js_1.ZohoLeaveAttendanceClient((0, config_js_1.loadConfig)()).triggerSync());
}
async function handleGetLeaveSettings() {
    return json(await new zoho_client_js_1.ZohoLeaveAttendanceClient((0, config_js_1.loadConfig)()).getLeaveSettings());
}
async function handleGetLeaveAttendanceSyncSummary() {
    return json(await new zoho_client_js_1.ZohoLeaveAttendanceClient((0, config_js_1.loadConfig)()).getSyncSummary());
}
async function handleListLeaveAttendanceSyncErrors() {
    return json(await new zoho_client_js_1.ZohoLeaveAttendanceClient((0, config_js_1.loadConfig)()).getSyncErrors());
}
async function handleGetAttendanceSettings() {
    return json(await new zoho_client_js_1.ZohoLeaveAttendanceClient((0, config_js_1.loadConfig)()).getAttendanceSettings());
}
async function handleGetEmployeeAttendance(args) {
    const { employee_id, period } = args;
    if (!employee_id || !period)
        return text("employee_id and period are required.");
    return json(await new zoho_client_js_1.ZohoLeaveAttendanceClient((0, config_js_1.loadConfig)()).getEmployeeAttendance(employee_id, period));
}
async function handleListRegularizations(args) {
    const opts = {};
    if (args.employee_id)
        opts.employee_id = String(args.employee_id);
    if (args.from_date)
        opts.from_date = String(args.from_date);
    if (args.to_date)
        opts.to_date = String(args.to_date);
    if (args.status)
        opts.status = String(args.status);
    if (args.page)
        opts.page = Number(args.page);
    return json(await new zoho_client_js_1.ZohoLeaveAttendanceClient((0, config_js_1.loadConfig)()).listRegularizations(opts));
}
// ── helpers ───────────────────────────────────────────────────────────────────
function maskUrl(url) {
    try {
        const u = new URL(url);
        return `${u.protocol}//${u.host}/***`;
    }
    catch {
        return url.slice(0, 30) + "***";
    }
}
