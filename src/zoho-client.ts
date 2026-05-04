import axios, { AxiosInstance } from "axios";
import { ZohoConfig } from "./config.js";

export interface Employee {
  id: string;
  name: string;
  email: string;
  department?: string;
  designation?: string;
  date_of_joining?: string;
  employment_status?: string;
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

  constructor(config: ZohoConfig) {
    this.client = buildClient(config.zoho_mcp_url);
  }

  async listEmployees(): Promise<Employee[]> {
    const raw = await callZohoMcp(this.client, "payroll_list_employees");
    return parseEmployeeList(raw);
  }

  async getEmployee(id: string): Promise<Employee | null> {
    const raw = await callZohoMcp(this.client, "payroll_get_employee", { employee_id: id });
    return parseEmployee(raw);
  }

  async getSalary(id: string): Promise<SalaryDetails | null> {
    const raw = await callZohoMcp(this.client, "payroll_get_salary_details", { employee_id: id });
    return parseSalary(raw);
  }

  async addEmployee(emp: Partial<Employee>): Promise<SyncResult> {
    const raw = await callZohoMcp(this.client, "payroll_add_employee", emp);
    return parseSyncResult(emp.id ?? "", raw);
  }

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<SyncResult> {
    const raw = await callZohoMcp(this.client, "payroll_update_employee", { employee_id: id, ...updates });
    return parseSyncResult(id, raw);
  }
}

export class ZohoPeopleClient {
  private client: AxiosInstance;

  constructor(config: ZohoConfig) {
    this.client = buildClient(config.zoho_mcp_url);
  }

  async listEmployees(): Promise<Employee[]> {
    const raw = await callZohoMcp(this.client, "people_list_employees");
    return parseEmployeeList(raw);
  }

  async getEmployee(id: string): Promise<Employee | null> {
    const raw = await callZohoMcp(this.client, "people_get_employee", { employee_id: id });
    return parseEmployee(raw);
  }

  async getSalary(id: string): Promise<SalaryDetails | null> {
    const raw = await callZohoMcp(this.client, "people_get_compensation", { employee_id: id });
    return parseSalary(raw);
  }

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<SyncResult> {
    const raw = await callZohoMcp(this.client, "people_update_employee", { employee_id: id, ...updates });
    return parseSyncResult(id, raw);
  }
}

// ── Safe parsers ──────────────────────────────────────────────────────────────

function safeJson(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return {}; } }
  return (raw as Record<string, unknown>) ?? {};
}

function parseEmployeeList(raw: unknown): Employee[] {
  const data = safeJson(raw);
  const list = (data.employees ?? data.data ?? data) as unknown[];
  if (!Array.isArray(list)) return [];
  return list.map(parseEmployee).filter((e): e is Employee => e !== null);
}

function parseEmployee(raw: unknown): Employee | null {
  const d = safeJson(raw);
  if (!d.id && !d.employee_id) return null;
  return {
    id:                String(d.id ?? d.employee_id ?? ""),
    name:              String(d.name ?? d.full_name ?? ""),
    email:             String(d.email ?? ""),
    department:        d.department        ? String(d.department)                   : undefined,
    designation:       d.designation ?? d.job_title ? String(d.designation ?? d.job_title) : undefined,
    date_of_joining:   d.date_of_joining   ? String(d.date_of_joining)              : undefined,
    employment_status: d.employment_status ? String(d.employment_status)            : undefined,
  };
}

function parseSalary(raw: unknown): SalaryDetails | null {
  const d = safeJson(raw);
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
  return {
    success:     d.success !== false,
    employee_id: employeeId,
    message:     String(d.message ?? d.msg ?? "Done"),
  };
}
