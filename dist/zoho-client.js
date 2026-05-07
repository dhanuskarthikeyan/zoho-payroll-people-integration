"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZohoLeaveAttendanceClient = exports.ZohoPeopleIntegrationClient = exports.ZohoPeopleClient = exports.ZohoPayrollClient = void 0;
exports.validateMcpUrl = validateMcpUrl;
const axios_1 = __importDefault(require("axios"));
// ── Single Zoho MCP client — one URL, all apps ────────────────────────────────
function buildClient(baseURL) {
    return axios_1.default.create({
        baseURL,
        timeout: 15000,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
    });
}
async function validateMcpUrl(url) {
    try {
        const client = buildClient(url);
        // Call tools/list to discover which apps are enabled
        const res = await client.post("", {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/list",
            params: {},
        });
        const tools = res.data?.result?.tools ?? [];
        const apps = [];
        if (tools.some((t) => t.name.toLowerCase().includes("payroll")))
            apps.push("payroll");
        if (tools.some((t) => t.name.toLowerCase().includes("people")))
            apps.push("people");
        return { ok: true, apps };
    }
    catch (err) {
        if (axios_1.default.isAxiosError(err) && err.response) {
            // 401/403/405 → server alive but auth required — URL is valid
            if ([401, 403, 405].includes(err.response.status))
                return { ok: true, apps: [] };
        }
        return { ok: false, apps: [] };
    }
}
async function callZohoMcp(client, tool, params = {}) {
    const response = await client.post("", {
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name: tool, arguments: params },
    });
    const result = response.data?.result;
    if (result?.isError) {
        throw new Error(result.content?.[0]?.text ?? "Zoho MCP call failed");
    }
    return result?.content?.[0]?.text ?? result;
}
// ── App clients — both backed by the same single URL ─────────────────────────
class ZohoPayrollClient {
    client;
    orgId;
    constructor(config) {
        this.client = buildClient(config.zoho_mcp_url);
        this.orgId = config.organization_id ?? null;
    }
    async getPayrollOrgId() {
        if (this.orgId)
            return this.orgId;
        const raw = await callZohoMcp(this.client, "ZohoPayroll_list_organizations");
        const data = safeJson(raw);
        const orgs = Array.isArray(data.organizations) ? data.organizations : [];
        if (!orgs.length)
            throw new Error("No Zoho Payroll organizations found.");
        this.orgId = String(orgs[0].organization_id ?? orgs[0].id ?? "");
        return this.orgId;
    }
    async getOrgId() {
        return this.getPayrollOrgId();
    }
    async listEmployees() {
        const orgId = await this.getOrgId();
        const raw = await callZohoMcp(this.client, "ZohoPayroll_list_employees", {
            query_params: { organization_id: orgId },
        });
        return parsePayrollEmployeeList(raw);
    }
    async getEmployee(id) {
        const orgId = await this.getOrgId();
        const raw = await callZohoMcp(this.client, "ZohoPayroll_get_employee", {
            query_params: { organization_id: orgId },
            path_variables: { employee_id: id },
        });
        return parsePayrollEmployee(raw);
    }
    async getSalary(id) {
        const orgId = await this.getOrgId();
        const raw = await callZohoMcp(this.client, "ZohoPayroll_get_employee_salary", {
            query_params: { organization_id: orgId },
            path_variables: { employee_id: id },
        });
        return parseSalary(raw);
    }
    async addEmployee(emp) {
        const orgId = await this.getOrgId();
        const raw = await callZohoMcp(this.client, "ZohoPayroll_create_employee", {
            query_params: { organization_id: orgId },
            body: mapToPayrollBody(emp),
        });
        return parseSyncResult(emp.id ?? "", raw);
    }
    async updateEmployee(id, updates) {
        const orgId = await this.getOrgId();
        const raw = await callZohoMcp(this.client, "ZohoPayroll_update_employee", {
            query_params: { organization_id: orgId },
            path_variables: { employee_id: id },
            body: mapToPayrollBody(updates),
        });
        return parseSyncResult(id, raw);
    }
}
exports.ZohoPayrollClient = ZohoPayrollClient;
class ZohoPeopleClient {
    client;
    constructor(config) {
        this.client = buildClient(config.zoho_mcp_url);
    }
    // No MCP tool exists to list all People employees — callers should use
    // trigger_people_sync (REST API) for bulk operations.
    async listEmployees() {
        return [];
    }
    async getEmployee(id) {
        const raw = await callZohoMcp(this.client, "ZohoPeople_fetchEmployeeRecordById", {
            query_params: { recordId: id },
        });
        return parsePeopleEmployee(raw);
    }
    async getSalary(_id) {
        return null;
    }
    async updateEmployee(id, _updates) {
        return { success: false, employee_id: id, message: "People write-back not supported via MCP." };
    }
}
exports.ZohoPeopleClient = ZohoPeopleClient;
// ── People Integration REST client ───────────────────────────────────────────
const PAYROLL_BASE = "https://www.zohoapis.com/payroll/v1";
class ZohoPeopleIntegrationClient {
    orgId;
    token;
    constructor(config) {
        if (!config.organization_id || !config.access_token) {
            throw new Error("REST API credentials not configured. Run configure_people_api_credentials first.");
        }
        this.orgId = config.organization_id;
        this.token = config.access_token;
    }
    get headers() {
        return {
            Authorization: `Zoho-oauthtoken ${this.token}`,
            "Content-Type": "application/json",
        };
    }
    params(extra = {}) {
        return { organization_id: this.orgId, ...extra };
    }
    async getDashboard() {
        const res = await axios_1.default.get(`${PAYROLL_BASE}/integrations/people/dashboard`, {
            headers: this.headers,
            params: this.params(),
            timeout: 15000,
        });
        return res.data;
    }
    async triggerSync() {
        const res = await axios_1.default.post(`${PAYROLL_BASE}/integrations/people/sync`, {}, { headers: this.headers, params: this.params({ sync_type: "manual" }), timeout: 30000 });
        return res.data;
    }
    async getSyncHistory() {
        const res = await axios_1.default.get(`${PAYROLL_BASE}/integrations/sync/history`, {
            headers: this.headers,
            params: this.params({ app_name: "people" }),
            timeout: 15000,
        });
        return res.data;
    }
    async listSyncErrors() {
        const res = await axios_1.default.get(`${PAYROLL_BASE}/integrations/sync/errors`, {
            headers: this.headers,
            params: this.params({ app_name: "people" }),
            timeout: 15000,
        });
        return res.data;
    }
    async getPreferences() {
        const res = await axios_1.default.get(`${PAYROLL_BASE}/integrations/people/preferences`, {
            headers: this.headers,
            params: this.params(),
            timeout: 15000,
        });
        return res.data;
    }
    async updatePreferences(body) {
        const res = await axios_1.default.put(`${PAYROLL_BASE}/integrations/people/preferences`, body, { headers: this.headers, params: this.params(), timeout: 15000 });
        return res.data;
    }
    async getFieldMappings(entity = "employee") {
        const res = await axios_1.default.get(`${PAYROLL_BASE}/integrations/people/fields`, {
            headers: this.headers,
            params: this.params({ entity }),
            timeout: 15000,
        });
        return res.data;
    }
    async getFieldMappingEditData(entity = "employee") {
        const res = await axios_1.default.get(`${PAYROLL_BASE}/integrations/people/field`, {
            headers: this.headers,
            params: this.params({ entity }),
            timeout: 15000,
        });
        return res.data;
    }
    async updateEmployeeFieldMappings(fields) {
        const res = await axios_1.default.put(`${PAYROLL_BASE}/integrations/people/employee/fields`, { fields }, { headers: this.headers, params: this.params(), timeout: 15000 });
        return res.data;
    }
}
exports.ZohoPeopleIntegrationClient = ZohoPeopleIntegrationClient;
// ── Leave & Attendance REST client ────────────────────────────────────────────
class ZohoLeaveAttendanceClient {
    orgId;
    token;
    constructor(config) {
        if (!config.organization_id || !config.access_token) {
            throw new Error("REST API credentials not configured. Run configure_people_api_credentials first.");
        }
        this.orgId = config.organization_id;
        this.token = config.access_token;
    }
    get headers() {
        return {
            Authorization: `Zoho-oauthtoken ${this.token}`,
            "Content-Type": "application/json",
        };
    }
    params(extra = {}) {
        return { organization_id: this.orgId, ...extra };
    }
    async getIntegrationDetails() {
        const res = await axios_1.default.get(`${PAYROLL_BASE}/leaveandattendance`, {
            headers: this.headers, params: this.params(), timeout: 15000,
        });
        return res.data;
    }
    async triggerSync(syncType = "MANUAL_SYNC") {
        const res = await axios_1.default.post(`${PAYROLL_BASE}/leaveandattendance/sync`, {}, { headers: this.headers, params: this.params({ sync_type: syncType }), timeout: 30000 });
        return res.data;
    }
    async getLeaveSettings() {
        const res = await axios_1.default.get(`${PAYROLL_BASE}/leaveandattendance/leave/settings`, {
            headers: this.headers, params: this.params(), timeout: 15000,
        });
        return res.data;
    }
    async getSyncSummary() {
        const res = await axios_1.default.get(`${PAYROLL_BASE}/leaveandattendance/sync/summary`, {
            headers: this.headers, params: this.params(), timeout: 15000,
        });
        return res.data;
    }
    async getSyncErrors() {
        const res = await axios_1.default.get(`${PAYROLL_BASE}/leaveandattendance/sync/errors`, {
            headers: this.headers, params: this.params(), timeout: 15000,
        });
        return res.data;
    }
    async getAttendanceSettings() {
        const res = await axios_1.default.get(`${PAYROLL_BASE}/hrms/attendance/settings`, {
            headers: this.headers, params: this.params(), timeout: 15000,
        });
        return res.data;
    }
    async getAttendanceCycles(year) {
        const res = await axios_1.default.get(`${PAYROLL_BASE}/hrms/attendance/cycles`, {
            headers: this.headers, params: this.params({ year }), timeout: 15000,
        });
        return res.data;
    }
    async getEmployeeAttendance(employeeId, period) {
        const res = await axios_1.default.get(`${PAYROLL_BASE}/employees/${employeeId}/attendance`, {
            headers: this.headers, params: this.params({ period }), timeout: 15000,
        });
        return res.data;
    }
    async listRegularizations(opts = {}) {
        const res = await axios_1.default.get(`${PAYROLL_BASE}/attendance/regularization`, {
            headers: this.headers, params: this.params(opts), timeout: 15000,
        });
        return res.data;
    }
}
exports.ZohoLeaveAttendanceClient = ZohoLeaveAttendanceClient;
// ── Safe parsers ──────────────────────────────────────────────────────────────
function safeJson(raw) {
    if (typeof raw === "string") {
        try {
            return JSON.parse(raw);
        }
        catch {
            return {};
        }
    }
    return raw ?? {};
}
// Maps our Employee model to Payroll create/update body shape
function mapToPayrollBody(emp) {
    const body = {};
    if (emp.first_name)
        body.first_name = emp.first_name;
    if (emp.middle_name)
        body.middle_name = emp.middle_name;
    if (emp.last_name)
        body.last_name = emp.last_name;
    if (emp.gender)
        body.gender = emp.gender;
    if (emp.employee_number)
        body.employee_number = emp.employee_number;
    if (emp.email)
        body.work_mail = emp.email;
    if (emp.mobile_number)
        body.mobile = emp.mobile_number;
    if (emp.date_of_joining)
        body.date_of_joining = emp.date_of_joining;
    if (emp.employment_status)
        body.employee_status = emp.employment_status;
    if (emp.last_working_day)
        body.last_working_day = emp.last_working_day;
    if (emp.department)
        body.department_id = emp.department;
    if (emp.designation)
        body.designation_id = emp.designation;
    if (emp.work_location)
        body.work_location_id = emp.work_location;
    const personal = {};
    if (emp.date_of_birth)
        personal.date_of_birth = emp.date_of_birth;
    if (emp.father_name)
        personal.father_name = emp.father_name;
    if (emp.pan_number)
        personal.pan = emp.pan_number;
    if (emp.personal_email)
        personal.personal_mail = emp.personal_email;
    if (Object.keys(personal).length)
        body.personal_details = personal;
    const addr = {};
    if (emp.personal_address_line1)
        addr.address_line_1 = emp.personal_address_line1;
    if (emp.personal_address_line2)
        addr.address_line_2 = emp.personal_address_line2;
    if (emp.personal_city)
        addr.city = emp.personal_city;
    if (emp.personal_state_code)
        addr.state_code = emp.personal_state_code;
    if (emp.personal_postal_code)
        addr.zip_code = emp.personal_postal_code;
    if (Object.keys(addr).length)
        body.present_residential_address = addr;
    return body;
}
function parsePayrollEmployeeList(raw) {
    const data = safeJson(raw);
    const list = (data.employees ?? data.data ?? []);
    if (!Array.isArray(list))
        return [];
    return list.map(parsePayrollEmployee).filter((e) => e !== null);
}
function parsePayrollEmployee(raw) {
    const d = safeJson(raw);
    const emp = (d.employee ?? d);
    const id = String(emp.employee_id ?? emp.id ?? "");
    if (!id)
        return null;
    return {
        id,
        name: String(emp.full_name ?? `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim()),
        email: String(emp.work_mail ?? emp.email ?? ""),
        employee_number: emp.employee_number ? String(emp.employee_number) : undefined,
        first_name: emp.first_name ? String(emp.first_name) : undefined,
        last_name: emp.last_name ? String(emp.last_name) : undefined,
        gender: emp.gender ? String(emp.gender) : undefined,
        date_of_joining: emp.date_of_joining ? String(emp.date_of_joining) : undefined,
        designation: emp.designation ? String(emp.designation) : undefined,
        department: emp.department ? String(emp.department) : undefined,
        employment_status: emp.employee_status ? String(emp.employee_status) : undefined,
        last_working_day: emp.last_working_day ? String(emp.last_working_day) : undefined,
    };
}
function parsePeopleEmployee(raw) {
    const data = safeJson(raw);
    // People API returns { response: { result: [...] } } or { response: { result: {} } }
    const resp = (data.response ?? data);
    const result = resp.result;
    const rec = (Array.isArray(result) ? result[0] : result);
    if (!rec)
        return null;
    const id = String(rec.EmployeeID ?? rec.employee_id ?? rec.recordId ?? "");
    if (!id)
        return null;
    return {
        id,
        name: String(rec.FullName ?? rec.full_name ?? ""),
        email: String(rec.WorkEmail ?? rec.work_mail ?? ""),
        employee_number: rec.EmployeeNumber ? String(rec.EmployeeNumber) : undefined,
        first_name: rec.FirstName ? String(rec.FirstName) : undefined,
        last_name: rec.LastName ? String(rec.LastName) : undefined,
        department: rec.Department ? String(rec.Department) : undefined,
        designation: rec.Designation ? String(rec.Designation) : undefined,
        date_of_joining: rec.DateOfJoining ? String(rec.DateOfJoining) : undefined,
        date_of_birth: rec.DateOfBirth ? String(rec.DateOfBirth) : undefined,
    };
}
function parseSalary(raw) {
    const data = safeJson(raw);
    const d = (data.salary_details ?? data.employee ?? data);
    if (!d.employee_id && !d.basic_salary)
        return null;
    return {
        employee_id: String(d.employee_id ?? ""),
        basic_salary: d.basic_salary ? Number(d.basic_salary) : undefined,
        gross_salary: d.gross_salary ? Number(d.gross_salary) : undefined,
        currency: d.currency ? String(d.currency) : undefined,
    };
}
function parseSyncResult(employeeId, raw) {
    const d = safeJson(raw);
    const code = Number(d.code ?? 0);
    return {
        success: code === 0 || d.success !== false,
        employee_id: employeeId,
        message: String(d.message ?? d.msg ?? "Done"),
    };
}
