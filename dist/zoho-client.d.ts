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
