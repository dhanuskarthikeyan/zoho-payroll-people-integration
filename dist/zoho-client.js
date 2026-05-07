"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZohoPeopleIntegrationClient = exports.ZohoPeopleClient = exports.ZohoPayrollClient = void 0;
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
    constructor(config) {
        this.client = buildClient(config.zoho_mcp_url);
    }
    async listEmployees() {
        const raw = await callZohoMcp(this.client, "payroll_list_employees");
        return parseEmployeeList(raw);
    }
    async getEmployee(id) {
        const raw = await callZohoMcp(this.client, "payroll_get_employee", { employee_id: id });
        return parseEmployee(raw);
    }
    async getSalary(id) {
        const raw = await callZohoMcp(this.client, "payroll_get_salary_details", { employee_id: id });
        return parseSalary(raw);
    }
    async addEmployee(emp) {
        const raw = await callZohoMcp(this.client, "payroll_add_employee", emp);
        return parseSyncResult(emp.id ?? "", raw);
    }
    async updateEmployee(id, updates) {
        const raw = await callZohoMcp(this.client, "payroll_update_employee", { employee_id: id, ...updates });
        return parseSyncResult(id, raw);
    }
}
exports.ZohoPayrollClient = ZohoPayrollClient;
class ZohoPeopleClient {
    client;
    constructor(config) {
        this.client = buildClient(config.zoho_mcp_url);
    }
    async listEmployees() {
        const raw = await callZohoMcp(this.client, "people_list_employees");
        return parseEmployeeList(raw);
    }
    async getEmployee(id) {
        const raw = await callZohoMcp(this.client, "people_get_employee", { employee_id: id });
        return parseEmployee(raw);
    }
    async getSalary(id) {
        const raw = await callZohoMcp(this.client, "people_get_compensation", { employee_id: id });
        return parseSalary(raw);
    }
    async updateEmployee(id, updates) {
        const raw = await callZohoMcp(this.client, "people_update_employee", { employee_id: id, ...updates });
        return parseSyncResult(id, raw);
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
function parseEmployeeList(raw) {
    const data = safeJson(raw);
    const list = (data.employees ?? data.data ?? data);
    if (!Array.isArray(list))
        return [];
    return list.map(parseEmployee).filter((e) => e !== null);
}
function parseEmployee(raw) {
    const d = safeJson(raw);
    if (!d.id && !d.employee_id)
        return null;
    return {
        id: String(d.id ?? d.employee_id ?? ""),
        name: String(d.name ?? d.full_name ?? ""),
        email: String(d.email ?? ""),
        department: d.department ? String(d.department) : undefined,
        designation: d.designation ?? d.job_title ? String(d.designation ?? d.job_title) : undefined,
        date_of_joining: d.date_of_joining ? String(d.date_of_joining) : undefined,
        employment_status: d.employment_status ? String(d.employment_status) : undefined,
    };
}
function parseSalary(raw) {
    const d = safeJson(raw);
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
    return {
        success: d.success !== false,
        employee_id: employeeId,
        message: String(d.message ?? d.msg ?? "Done"),
    };
}
