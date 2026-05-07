import fs from "fs";
import os from "os";
import path from "path";

const CONFIG_DIR = path.join(os.homedir(), ".zoho-integration-mcp");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export interface ZohoConfig {
  zoho_mcp_url: string;          // Single Zoho MCP URL from zoho.com/mcp
  enabled_apps: string[];        // e.g. ["payroll", "people"]
  connected_at: string;
  people_org_id?: string;        // Zoho People organization ID
  payroll_org_id?: string;       // Zoho Payroll organization ID
  organization_id?: string;      // [legacy] Zoho Payroll organization ID — kept for backward compat
  access_token?: string;         // OAuth access token (for REST API)
}

export function loadConfig(): ZohoConfig | null {
  if (!fs.existsSync(CONFIG_FILE)) return null;
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(raw) as ZohoConfig;
  } catch {
    return null;
  }
}

export function saveConfig(config: ZohoConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function clearConfig(): void {
  if (fs.existsSync(CONFIG_FILE)) {
    fs.unlinkSync(CONFIG_FILE);
  }
}

export function isConnected(): boolean {
  return loadConfig() !== null;
}
