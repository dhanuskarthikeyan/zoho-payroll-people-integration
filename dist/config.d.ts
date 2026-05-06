export interface ZohoConfig {
    zoho_mcp_url: string;
    enabled_apps: string[];
    connected_at: string;
}
export declare function loadConfig(): ZohoConfig | null;
export declare function saveConfig(config: ZohoConfig): void;
export declare function clearConfig(): void;
export declare function isConnected(): boolean;
