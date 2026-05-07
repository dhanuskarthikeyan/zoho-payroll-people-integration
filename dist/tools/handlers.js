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
    const people = new zoho_client_js_1.ZohoPeopleClient(config);
    const [payrollEmployees, peopleEmployees] = await Promise.all([
        payroll.listEmployees(),
        people.listEmployees(),
    ]);
    const payrollMap = new Map(payrollEmployees.map((e) => [e.id, e]));
    const peopleMap = new Map(peopleEmployees.map((e) => [e.id, e]));
    const missingInPayroll = peopleEmployees.filter((e) => !payrollMap.has(e.id));
    const missingInPeople = payrollEmployees.filter((e) => !peopleMap.has(e.id));
    const deptMismatches = [];
    for (const pe of peopleEmployees) {
        const pr = payrollMap.get(pe.id);
        if (pr && pe.department && pr.department && pe.department !== pr.department) {
            deptMismatches.push({ employee_id: pe.id, people_dept: pe.department, payroll_dept: pr.department });
        }
    }
    const lines = [
        `Integration Health Report — ${new Date().toLocaleString()}`,
        `─────────────────────────────────────────`,
        `People employees:  ${peopleEmployees.length}`,
        `Payroll employees: ${payrollEmployees.length}`,
        ``,
    ];
    if (missingInPayroll.length) {
        lines.push(`❌ Missing in Payroll (${missingInPayroll.length}):`);
        missingInPayroll.forEach((e) => lines.push(`   • ${e.id} — ${e.name} (${e.email})`));
        lines.push("");
    }
    if (missingInPeople.length) {
        lines.push(`⚠️  In Payroll but not in People (${missingInPeople.length}):`);
        missingInPeople.forEach((e) => lines.push(`   • ${e.id} — ${e.name}`));
        lines.push("");
    }
    if (deptMismatches.length) {
        lines.push(`⚠️  Department mismatches (${deptMismatches.length}):`);
        deptMismatches.forEach((m) => lines.push(`   • ${m.employee_id}: People="${m.people_dept}" vs Payroll="${m.payroll_dept}"`));
        lines.push("");
    }
    if (!missingInPayroll.length && !missingInPeople.length && !deptMismatches.length) {
        lines.push("✅ Everything is in sync!");
    }
    else {
        lines.push(`Run fix_sync_issues with issue_type="all" to auto-fix all problems.`);
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
    const payroll = new zoho_client_js_1.ZohoPayrollClient(config);
    const people = new zoho_client_js_1.ZohoPeopleClient(config);
    const [payrollEmployees, peopleEmployees] = await Promise.all([
        payroll.listEmployees(),
        people.listEmployees(),
    ]);
    const payrollIds = new Set(payrollEmployees.map((e) => e.id));
    const toAdd = peopleEmployees.filter((e) => !payrollIds.has(e.id));
    const toUpdate = peopleEmployees.filter((e) => payrollIds.has(e.id));
    const results = await Promise.allSettled([
        ...toAdd.map((e) => payroll.addEmployee(e)),
        ...toUpdate.map((e) => payroll.updateEmployee(e.id, e)),
    ]);
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    return text(`Sync complete.\n` +
        `  Added:   ${toAdd.length}\n` +
        `  Updated: ${toUpdate.length}\n` +
        `  ✅ Success: ${succeeded}\n` +
        (failed ? `  ❌ Failed:  ${failed}` : ""));
}
// ── fix_sync_issues ───────────────────────────────────────────────────────────
async function handleFixIssues(args) {
    const { issue_type } = args;
    const config = (0, config_js_1.loadConfig)();
    const payroll = new zoho_client_js_1.ZohoPayrollClient(config);
    const people = new zoho_client_js_1.ZohoPeopleClient(config);
    const [payrollEmployees, peopleEmployees] = await Promise.all([
        payroll.listEmployees(),
        people.listEmployees(),
    ]);
    const payrollMap = new Map(payrollEmployees.map((e) => [e.id, e]));
    const lines = [];
    if (issue_type === "missing_employees" || issue_type === "all") {
        const missing = peopleEmployees.filter((e) => !payrollMap.has(e.id));
        lines.push(`Fixing missing employees (${missing.length})...`);
        const results = await Promise.allSettled(missing.map((e) => payroll.addEmployee(e)));
        lines.push(`  ✅ Added ${results.filter((r) => r.status === "fulfilled").length}/${missing.length} to Payroll.`);
    }
    if (issue_type === "department_mismatch" || issue_type === "all") {
        const mismatches = peopleEmployees.filter((e) => {
            const pr = payrollMap.get(e.id);
            return pr && e.department && pr.department && e.department !== pr.department;
        });
        lines.push(`\nFixing department mismatches (${mismatches.length})...`);
        const results = await Promise.allSettled(mismatches.map((e) => payroll.updateEmployee(e.id, { department: e.department })));
        lines.push(`  ✅ Updated ${results.filter((r) => r.status === "fulfilled").length}/${mismatches.length} records.`);
    }
    if (issue_type === "salary_mismatch" || issue_type === "all") {
        lines.push(`\nSalary mismatches require manual review — salary data is sensitive.`);
        lines.push(`  Run check_integration_health to see affected employees.`);
    }
    return text(lines.join("\n"));
}
// ── list_employees ────────────────────────────────────────────────────────────
async function handleListEmployees(args) {
    const { source } = args;
    const config = (0, config_js_1.loadConfig)();
    const [payrollList, peopleList] = await Promise.all([
        (source === "payroll" || source === "both") ? new zoho_client_js_1.ZohoPayrollClient(config).listEmployees() : Promise.resolve([]),
        (source === "people" || source === "both") ? new zoho_client_js_1.ZohoPeopleClient(config).listEmployees() : Promise.resolve([]),
    ]);
    const result = {};
    if (source === "people" || source === "both")
        result.people_employees = { count: peopleList.length, employees: peopleList };
    if (source === "payroll" || source === "both")
        result.payroll_employees = { count: payrollList.length, employees: payrollList };
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
