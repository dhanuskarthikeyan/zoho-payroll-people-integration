"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
exports.clearConfig = clearConfig;
exports.isConnected = isConnected;
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const CONFIG_DIR = path_1.default.join(os_1.default.homedir(), ".zoho-integration-mcp");
const CONFIG_FILE = path_1.default.join(CONFIG_DIR, "config.json");
function loadConfig() {
    if (!fs_1.default.existsSync(CONFIG_FILE))
        return null;
    try {
        const raw = fs_1.default.readFileSync(CONFIG_FILE, "utf-8");
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function saveConfig(config) {
    if (!fs_1.default.existsSync(CONFIG_DIR)) {
        fs_1.default.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs_1.default.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}
function clearConfig() {
    if (fs_1.default.existsSync(CONFIG_FILE)) {
        fs_1.default.unlinkSync(CONFIG_FILE);
    }
}
function isConnected() {
    return loadConfig() !== null;
}
