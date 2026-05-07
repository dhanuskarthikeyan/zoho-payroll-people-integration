import axios, { AxiosInstance } from "axios";
import { ZohoConfig } from "./config.js";

export interface Employee {
  // Basic Info
  id: string;
  name: string;
  email: string;                    // Work Email
  employee_number?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  gender?: string;
  date_of_joining?: string;
  designation?: string;
  mobile_number?: string;
  department?: string;
  work_location?: string;
  last_working_day?: string;        // Date of Exit
  employment_status?: string;       // Status
  // Personal Info
  personal_email?: string;
  date_of_birth?: string;
  father_name?: string;
  pan_number?: string;
  personal_address_line1?: string;
  personal_address_line2?: string;
  personal_city?: string;
  personal_state_code?: string;
  personal_postal_code?: string;
  // Payment Info (all-or-nothing)
  payment_mode?: string;            // Cheque | Direct Deposit | Bank Transfer
  bank_holder_name?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  account_type?: string;            // Savings | Current
}

export interface SalaryDetails {
  employee_id: string;
  basic_salary?: number;
  gross_salary?: number;
  currency?: string;
}

export interface SyncResult {
  success: boolean;
  employee_id: string;
  message: string;
}

// ── Single Zoho MCP client — one URL, all apps ────────────────────────────────

function buildClient(baseURL: string): AxiosInstance {
  return axios.create({
    baseURL,
    timeout: 15000,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
}

export async function validateMcpUrl(url: string): Promise<{ ok: boolean; apps: string[] }> {
  try {
    const client = buildClient(url);
    // Call tools/list to discover which apps are enabled
    const res = await client.post("", {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    });
    const tools: Array<{ name: string }> = res.data?.result?.tools ?? [];
    const apps: string[] = [];
    if (tools.some((t) => t.name.toLowerCase().includes("payroll"))) apps.push("payroll");
    if (tools.some((t) => t.name.toLowerCase().includes("people")))  apps.push("people");
    return { ok: true, apps };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      // 401/403/405 → server alive but auth required — URL is valid
      if ([401, 403, 405].includes(err.response.status)) return { ok: true, apps: [] };
    }
    return { ok: false, apps: [] };
  }
}

async function callZohoMcp(
  client: AxiosInstance,
  tool: string,
  params: Record<string, unknown> = {}
): Promise<unknown> {
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

export class ZohoPayrollClient {
  private client: AxiosInstance;
  private orgId: string | null;

  constructor(config: ZohoConfig) {
    this.client = buildClient(config.zoho_mcp_url);
    this.orgId  = config.organization_id ?? null;
  }

  private async getOrgId(): Promise<string> {
    if (this.orgId) return this.orgId;
    const raw  = await callZohoMcp(this.client, "ZohoPayroll_list_organizations");
    const data = safeJson(raw);
    const orgs = Array.isArray(data.organizations) ? data.organizations : [];
    if (!orgs.length) throw new Error("No Zoho Payroll organizations found.");
    this.orgId = String(orgs[0].organization_id ?? orgs[0].id ?? "");
    return this.orgId;
  }

  async listEmployees(): Promise<Employee[]> {
    const orgId = await this.getOrgId();
    const raw = await callZohoMcp(this.client, "ZohoPayroll_list_employees", {
      query_params: { organization_id: orgId },
    });
    return parsePayrollEmployeeList(raw);
  }

  async getEmployee(id: string): Promise<Employee | null> {
    const orgId = await this.getOrgId();
    const raw = await callZohoMcp(this.client, "ZohoPayroll_get_employee", {
      query_params:    { organization_id: orgId },
      path_variables:  { employee_id: id },
    });
    return parsePayrollEmployee(raw);
  }

  async getSalary(id: string): Promise<SalaryDetails | null> {
    const orgId = await this.getOrgId();
    const raw = await callZohoMcp(this.client, "ZohoPayroll_get_employee_salary", {
      query_params:   { organization_id: orgId },
      path_variables: { employee_id: id },
    });
    return parseSalary(raw);
  }

  async addEmployee(emp: Partial<Employee>): Promise<SyncResult> {
    const orgId = await this.getOrgId();
    const raw = await callZohoMcp(this.client, "ZohoPayroll_create_employee", {
      query_params: { organization_id: orgId },
      body:         mapToPayrollBody(emp),
    });
    return parseSyncResult(emp.id ?? "", raw);
  }

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<SyncResult> {
    const orgId = await this.getOrgId();
    const raw = await callZohoMcp(this.client, "ZohoPayroll_update_employee", {
      query_params:   { organization_id: orgId },
      path_variables: { employee_id: id },
      body:           mapToPayrollBody(updates),
    });
    return parseSyncResult(id, raw);
  }
}

export class ZohoPeopleClient {
  private client: AxiosInstance;

  constructor(config: ZohoConfig) {
    this.client = buildClient(config.zoho_mcp_url);
  }

  // No MCP tool exists to list all People employees — callers should use
  // trigger_people_sync (REST API) for bulk operations.
  async listEmployees(): Promise<Employee[]> {
    return [];
  }

  async getEmployee(id: string): Promise<Employee | null> {
    const raw = await callZohoMcp(this.client, "ZohoPeople_fetchEmployeeRecordById", {
      query_params: { recordId: id },
    });
    return parsePeopleEmployee(raw);
  }

  async getSalary(_id: string): Promise<SalaryDetails | null> {
    return null;
  }

  async updateEmployee(id: string, _updates: Partial<Employee>): Promise<SyncResult> {
    return { success: false, employee_id: id, message: "People write-back not supported via MCP." };
  }
}

// ── People Integration REST client ───────────────────────────────────────────

const PAYROLL_BASE = "https://www.zohoapis.com/payroll/v1";

export class ZohoPeopleIntegrationClient {
  private orgId: string;
  private token: string;

  constructor(config: ZohoConfig) {
    if (!config.organization_id || !config.access_token) {
      throw new Error(
        "REST API credentials not configured. Run configure_people_api_credentials first."
      );
    }
    this.orgId  = config.organization_id;
    this.token  = config.access_token;
  }

  private get headers() {
    return {
      Authorization: `Zoho-oauthtoken ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  private params(extra: Record<string, string> = {}) {
    return { organization_id: this.orgId, ...extra };
  }

  async getDashboard(): Promise<unknown> {
    const res = await axios.get(`${PAYROLL_BASE}/integrations/people/dashboard`, {
      headers: this.headers,
      params:  this.params(),
      timeout: 15000,
    });
    return res.data;
  }

  async triggerSync(): Promise<unknown> {
    const res = await axios.post(
      `${PAYROLL_BASE}/integrations/people/sync`,
      {},
      { headers: this.headers, params: this.params({ sync_type: "manual" }), timeout: 30000 }
    );
    return res.data;
  }

  async getSyncHistory(): Promise<unknown> {
    const res = await axios.get(`${PAYROLL_BASE}/integrations/sync/history`, {
      headers: this.headers,
      params:  this.params({ app_name: "people" }),
      timeout: 15000,
    });
    return res.data;
  }

  async listSyncErrors(): Promise<unknown> {
    const res = await axios.get(`${PAYROLL_BASE}/integrations/sync/errors`, {
      headers: this.headers,
      params:  this.params({ app_name: "people" }),
      timeout: 15000,
    });
    return res.data;
  }

  async getPreferences(): Promise<unknown> {
    const res = await axios.get(`${PAYROLL_BASE}/integrations/people/preferences`, {
      headers: this.headers,
      params:  this.params(),
      timeout: 15000,
    });
    return res.data;
  }

  async updatePreferences(body: Record<string, unknown>): Promise<unknown> {
    const res = await axios.put(
      `${PAYROLL_BASE}/integrations/people/preferences`,
      body,
      { headers: this.headers, params: this.params(), timeout: 15000 }
    );
    return res.data;
  }

  async getFieldMappings(entity: string = "employee"): Promise<unknown> {
    const res = await axios.get(`${PAYROLL_BASE}/integrations/people/fields`, {
      headers: this.headers,
      params:  this.params({ entity }),
      timeout: 15000,
    });
    return res.data;
  }

  async getFieldMappingEditData(entity: string = "employee"): Promise<unknown> {
    const res = await axios.get(`${PAYROLL_BASE}/integrations/people/field`, {
      headers: this.headers,
      params:  this.params({ entity }),
      timeout: 15000,
    });
    return res.data;
  }

  async updateEmployeeFieldMappings(fields: FieldMappingEntry[]): Promise<unknown> {
    const res = await axios.put(
      `${PAYROLL_BASE}/integrations/people/employee/fields`,
      { fields },
      { headers: this.headers, params: this.params(), timeout: 15000 }
    );
    return res.data;
  }
}

export interface FieldMappingEntry {
  payroll_field_name: string;
  payroll_display_name: string;
  people_field_name: string;
}

// ── Leave & Attendance REST client ────────────────────────────────────────────

export class ZohoLeaveAttendanceClient {
  private orgId: string;
  private token: string;

  constructor(config: ZohoConfig) {
    if (!config.organization_id || !config.access_token) {
      throw new Error(
        "REST API credentials not configured. Run configure_people_api_credentials first."
      );
    }
    this.orgId  = config.organization_id;
    this.token  = config.access_token;
  }

  private get headers() {
    return {
      Authorization: `Zoho-oauthtoken ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  private params(extra: Record<string, string | number> = {}) {
    return { organization_id: this.orgId, ...extra };
  }

  async getIntegrationDetails(): Promise<unknown> {
    const res = await axios.get(`${PAYROLL_BASE}/leaveandattendance`, {
      headers: this.headers, params: this.params(), timeout: 15000,
    });
    return res.data;
  }

  async triggerSync(syncType = "MANUAL_SYNC"): Promise<unknown> {
    const res = await axios.post(`${PAYROLL_BASE}/leaveandattendance/sync`, {},
      { headers: this.headers, params: this.params({ sync_type: syncType }), timeout: 30000 }
    );
    return res.data;
  }

  async getLeaveSettings(): Promise<unknown> {
    const res = await axios.get(`${PAYROLL_BASE}/leaveandattendance/leave/settings`, {
      headers: this.headers, params: this.params(), timeout: 15000,
    });
    return res.data;
  }

  async getSyncSummary(): Promise<unknown> {
    const res = await axios.get(`${PAYROLL_BASE}/leaveandattendance/sync/summary`, {
      headers: this.headers, params: this.params(), timeout: 15000,
    });
    return res.data;
  }

  async getSyncErrors(): Promise<unknown> {
    const res = await axios.get(`${PAYROLL_BASE}/leaveandattendance/sync/errors`, {
      headers: this.headers, params: this.params(), timeout: 15000,
    });
    return res.data;
  }

  async getAttendanceSettings(): Promise<unknown> {
    const res = await axios.get(`${PAYROLL_BASE}/hrms/attendance/settings`, {
      headers: this.headers, params: this.params(), timeout: 15000,
    });
    return res.data;
  }

  async getAttendanceCycles(year: number): Promise<unknown> {
    const res = await axios.get(`${PAYROLL_BASE}/hrms/attendance/cycles`, {
      headers: this.headers, params: this.params({ year }), timeout: 15000,
    });
    return res.data;
  }

  async getEmployeeAttendance(employeeId: string, period: string): Promise<unknown> {
    const res = await axios.get(`${PAYROLL_BASE}/employees/${employeeId}/attendance`, {
      headers: this.headers, params: this.params({ period }), timeout: 15000,
    });
    return res.data;
  }

  async listRegularizations(opts: Record<string, string | number> = {}): Promise<unknown> {
    const res = await axios.get(`${PAYROLL_BASE}/attendance/regularization`, {
      headers: this.headers, params: this.params(opts as Record<string, string>), timeout: 15000,
    });
    return res.data;
  }
}

// ── Safe parsers ──────────────────────────────────────────────────────────────

function safeJson(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return {}; } }
  return (raw as Record<string, unknown>) ?? {};
}

// Maps our Employee model to Payroll create/update body shape
function mapToPayrollBody(emp: Partial<Employee>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (emp.first_name)       body.first_name       = emp.first_name;
  if (emp.middle_name)      body.middle_name       = emp.middle_name;
  if (emp.last_name)        body.last_name         = emp.last_name;
  if (emp.gender)           body.gender            = emp.gender;
  if (emp.employee_number)  body.employee_number   = emp.employee_number;
  if (emp.email)            body.work_mail         = emp.email;
  if (emp.mobile_number)    body.mobile            = emp.mobile_number;
  if (emp.date_of_joining)  body.date_of_joining   = emp.date_of_joining;
  if (emp.employment_status) body.employee_status  = emp.employment_status;
  if (emp.last_working_day) body.last_working_day  = emp.last_working_day;
  if (emp.department)       body.department_id     = emp.department;
  if (emp.designation)      body.designation_id    = emp.designation;
  if (emp.work_location)    body.work_location_id  = emp.work_location;

  const personal: Record<string, unknown> = {};
  if (emp.date_of_birth)   personal.date_of_birth  = emp.date_of_birth;
  if (emp.father_name)     personal.father_name     = emp.father_name;
  if (emp.pan_number)      personal.pan             = emp.pan_number;
  if (emp.personal_email)  personal.personal_mail   = emp.personal_email;
  if (Object.keys(personal).length) body.personal_details = personal;

  const addr: Record<string, unknown> = {};
  if (emp.personal_address_line1) addr.address_line_1 = emp.personal_address_line1;
  if (emp.personal_address_line2) addr.address_line_2 = emp.personal_address_line2;
  if (emp.personal_city)          addr.city           = emp.personal_city;
  if (emp.personal_state_code)    addr.state_code     = emp.personal_state_code;
  if (emp.personal_postal_code)   addr.zip_code       = emp.personal_postal_code;
  if (Object.keys(addr).length)   body.present_residential_address = addr;

  return body;
}

function parsePayrollEmployeeList(raw: unknown): Employee[] {
  const data = safeJson(raw);
  const list = (data.employees ?? data.data ?? []) as unknown[];
  if (!Array.isArray(list)) return [];
  return list.map(parsePayrollEmployee).filter((e): e is Employee => e !== null);
}

function parsePayrollEmployee(raw: unknown): Employee | null {
  const d = safeJson(raw);
  const emp = (d.employee ?? d) as Record<string, unknown>;
  const id  = String(emp.employee_id ?? emp.id ?? "");
  if (!id) return null;
  return {
    id,
    name:              String(emp.full_name ?? `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim()),
    email:             String(emp.work_mail ?? emp.email ?? ""),
    employee_number:   emp.employee_number   ? String(emp.employee_number)  : undefined,
    first_name:        emp.first_name        ? String(emp.first_name)       : undefined,
    last_name:         emp.last_name         ? String(emp.last_name)        : undefined,
    gender:            emp.gender            ? String(emp.gender)           : undefined,
    date_of_joining:   emp.date_of_joining   ? String(emp.date_of_joining)  : undefined,
    designation:       emp.designation       ? String(emp.designation)      : undefined,
    department:        emp.department        ? String(emp.department)       : undefined,
    employment_status: emp.employee_status   ? String(emp.employee_status)  : undefined,
    last_working_day:  emp.last_working_day  ? String(emp.last_working_day) : undefined,
  };
}

function parsePeopleEmployee(raw: unknown): Employee | null {
  const data = safeJson(raw);
  // People API returns { response: { result: [...] } } or { response: { result: {} } }
  const resp    = (data.response ?? data) as Record<string, unknown>;
  const result  = resp.result;
  const rec     = (Array.isArray(result) ? result[0] : result) as Record<string, unknown> | null;
  if (!rec) return null;
  const id = String(rec.EmployeeID ?? rec.employee_id ?? rec.recordId ?? "");
  if (!id) return null;
  return {
    id,
    name:             String(rec.FullName ?? rec.full_name ?? ""),
    email:            String(rec.WorkEmail ?? rec.work_mail ?? ""),
    employee_number:  rec.EmployeeNumber ? String(rec.EmployeeNumber) : undefined,
    first_name:       rec.FirstName      ? String(rec.FirstName)      : undefined,
    last_name:        rec.LastName       ? String(rec.LastName)       : undefined,
    department:       rec.Department     ? String(rec.Department)     : undefined,
    designation:      rec.Designation    ? String(rec.Designation)    : undefined,
    date_of_joining:  rec.DateOfJoining  ? String(rec.DateOfJoining)  : undefined,
    date_of_birth:    rec.DateOfBirth    ? String(rec.DateOfBirth)    : undefined,
  };
}

function parseSalary(raw: unknown): SalaryDetails | null {
  const data = safeJson(raw);
  const d    = (data.salary_details ?? data.employee ?? data) as Record<string, unknown>;
  if (!d.employee_id && !d.basic_salary) return null;
  return {
    employee_id:  String(d.employee_id ?? ""),
    basic_salary: d.basic_salary  ? Number(d.basic_salary)  : undefined,
    gross_salary: d.gross_salary  ? Number(d.gross_salary)  : undefined,
    currency:     d.currency      ? String(d.currency)      : undefined,
  };
}

function parseSyncResult(employeeId: string, raw: unknown): SyncResult {
  const d = safeJson(raw);
  const code = Number(d.code ?? 0);
  return {
    success:     code === 0 || d.success !== false,
    employee_id: employeeId,
    message:     String(d.message ?? d.msg ?? "Done"),
  };
}
