import { ZohoConfig } from "./config.js";
export interface Employee {
    id: string;
    name: string;
    email: string;
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
    last_working_day?: string;
    employment_status?: string;
    personal_email?: string;
    date_of_birth?: string;
    father_name?: string;
    pan_number?: string;
    personal_address_line1?: string;
    personal_address_line2?: string;
    personal_city?: string;
    personal_state_code?: string;
    personal_postal_code?: string;
    payment_mode?: string;
    bank_holder_name?: string;
    bank_name?: string;
    account_number?: string;
    ifsc_code?: string;
    account_type?: string;
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
export declare function validateMcpUrl(url: string): Promise<{
    ok: boolean;
    apps: string[];
}>;
export declare class ZohoPayrollClient {
    private client;
    constructor(config: ZohoConfig);
    listEmployees(): Promise<Employee[]>;
    getEmployee(id: string): Promise<Employee | null>;
    getSalary(id: string): Promise<SalaryDetails | null>;
    addEmployee(emp: Partial<Employee>): Promise<SyncResult>;
    updateEmployee(id: string, updates: Partial<Employee>): Promise<SyncResult>;
}
export declare class ZohoPeopleClient {
    private client;
    constructor(config: ZohoConfig);
    listEmployees(): Promise<Employee[]>;
    getEmployee(id: string): Promise<Employee | null>;
    getSalary(id: string): Promise<SalaryDetails | null>;
    updateEmployee(id: string, updates: Partial<Employee>): Promise<SyncResult>;
}
export declare class ZohoPeopleIntegrationClient {
    private orgId;
    private token;
    constructor(config: ZohoConfig);
    private get headers();
    private params;
    getDashboard(): Promise<unknown>;
    triggerSync(): Promise<unknown>;
    getSyncHistory(): Promise<unknown>;
    listSyncErrors(): Promise<unknown>;
    getPreferences(): Promise<unknown>;
    updatePreferences(body: Record<string, unknown>): Promise<unknown>;
    getFieldMappings(entity?: string): Promise<unknown>;
    getFieldMappingEditData(entity?: string): Promise<unknown>;
    updateEmployeeFieldMappings(fields: FieldMappingEntry[]): Promise<unknown>;
}
export interface FieldMappingEntry {
    payroll_field_name: string;
    payroll_display_name: string;
    people_field_name: string;
}
