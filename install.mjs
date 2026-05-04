#!/usr/bin/env node
/**
 * Universal installer for zoho-integration-mcp
 * Supports: Claude Desktop, Claude Code CLI, Cursor, GitHub Copilot (VS Code),
 *           Windsurf, Zed, Continue.dev — on macOS, Linux, and Windows
 */

import fs   from "fs";
import path from "path";
import os   from "os";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_DIR = __dirname;
const ENTRY      = path.join(PLUGIN_DIR, "dist", "index.js");
const HOME       = os.homedir();
const PLATFORM   = process.platform; // darwin | linux | win32

// ── Colour helpers ────────────────────────────────────────────────────────────
const c = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

// ── OS-aware path helper ──────────────────────────────────────────────────────
function p(...parts) {
  return path.join(HOME, ...parts);
}

function appData(...parts) {
  if (PLATFORM === "win32") return path.join(process.env.APPDATA ?? p("AppData","Roaming"), ...parts);
  if (PLATFORM === "darwin") return path.join(HOME, "Library", "Application Support", ...parts);
  return path.join(process.env.XDG_CONFIG_HOME ?? p(".config"), ...parts);
}

// ── Agent definitions ─────────────────────────────────────────────────────────
// Each agent has:
//   configPath  – where the JSON config file lives
//   detect      – a file/dir that proves the agent is installed
//   merge       – function(existing, serverEntry) → merged object
//   serverEntry – the value to inject (differs per agent schema)

const SERVER_STDIO = {
  command: "node",
  args: [ENTRY],
};

const agents = [
  {
    name: "Claude Desktop",
    configPath: appData("Claude", "claude_desktop_config.json"),
    detect: appData("Claude"),
    merge(cfg, entry) {
      cfg.mcpServers = cfg.mcpServers ?? {};
      cfg.mcpServers["zoho-integration"] = entry;
      return cfg;
    },
    serverEntry: SERVER_STDIO,
  },
  {
    name: "Claude Code CLI",
    configPath: p(".claude", "mcp.json"),
    detect: p(".claude"),
    merge(cfg, entry) {
      cfg.mcpServers = cfg.mcpServers ?? {};
      cfg.mcpServers["zoho-integration"] = entry;
      return cfg;
    },
    serverEntry: SERVER_STDIO,
  },
  {
    name: "Cursor",
    configPath: PLATFORM === "win32"
      ? path.join(process.env.APPDATA ?? p("AppData","Roaming"), "Cursor", "mcp.json")
      : p(".cursor", "mcp.json"),
    detect: PLATFORM === "win32"
      ? path.join(process.env.LOCALAPPDATA ?? p("AppData","Local"), "Programs", "cursor")
      : p(".cursor"),
    merge(cfg, entry) {
      cfg.mcpServers = cfg.mcpServers ?? {};
      cfg.mcpServers["zoho-integration"] = entry;
      return cfg;
    },
    serverEntry: SERVER_STDIO,
  },
  {
    name: "Windsurf",
    configPath: p(".codeium", "windsurf", "mcp_config.json"),
    detect: p(".codeium", "windsurf"),
    merge(cfg, entry) {
      cfg.mcpServers = cfg.mcpServers ?? {};
      cfg.mcpServers["zoho-integration"] = { ...entry, disabled: false, autoApprove: [] };
      return cfg;
    },
    serverEntry: SERVER_STDIO,
  },
  {
    name: "GitHub Copilot (VS Code workspace)",
    configPath: path.join(process.cwd(), ".vscode", "mcp.json"),
    detect: null, // always write — creates .vscode/mcp.json in cwd
    merge(cfg, entry) {
      cfg.servers = cfg.servers ?? {};
      cfg.servers["zoho-integration"] = { type: "stdio", ...entry };
      return cfg;
    },
    serverEntry: SERVER_STDIO,
  },
  {
    name: "Zed",
    configPath: PLATFORM === "win32"
      ? path.join(process.env.APPDATA ?? p("AppData","Roaming"), "Zed", "settings.json")
      : p(".config", "zed", "settings.json"),
    detect: PLATFORM === "win32"
      ? path.join(process.env.LOCALAPPDATA ?? p("AppData","Local"), "Programs", "Zed")
      : p(".config", "zed"),
    merge(cfg, entry) {
      cfg.context_servers = cfg.context_servers ?? {};
      cfg.context_servers["zoho-integration"] = {
        command: { path: entry.command, args: entry.args },
      };
      return cfg;
    },
    serverEntry: SERVER_STDIO,
  },
  {
    name: "Continue.dev",
    configPath: p(".continue", "config.json"),
    detect: p(".continue"),
    merge(cfg, entry) {
      cfg.experimental = cfg.experimental ?? {};
      cfg.experimental.modelContextProtocolServers =
        cfg.experimental.modelContextProtocolServers ?? [];
      const existing = cfg.experimental.modelContextProtocolServers;
      const idx = existing.findIndex((s) => s.transport?.command === entry.command &&
        JSON.stringify(s.transport?.args) === JSON.stringify(entry.args));
      const record = { transport: { type: "stdio", ...entry } };
      if (idx >= 0) existing[idx] = record; else existing.push(record);
      return cfg;
    },
    serverEntry: SERVER_STDIO,
  },
];

// ── JSON helpers ──────────────────────────────────────────────────────────────
function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); }
  catch { return {}; }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// ── Build check ───────────────────────────────────────────────────────────────
function ensureBuilt() {
  if (!fs.existsSync(ENTRY)) {
    console.log(c.yellow("Building plugin first..."));
    execSync("npm run build", { cwd: PLUGIN_DIR, stdio: "inherit" });
  }
}

// ── Install ───────────────────────────────────────────────────────────────────
function install() {
  console.log(c.bold("\n🔌 zoho-integration-mcp — Universal Installer\n"));
  ensureBuilt();

  const results = { installed: [], skipped: [], failed: [] };

  for (const agent of agents) {
    const detected = agent.detect === null || fs.existsSync(agent.detect);

    if (!detected) {
      results.skipped.push(agent.name);
      console.log(`  ${c.dim("○")} ${agent.name} — ${c.dim("not installed, skipping")}`);
      continue;
    }

    try {
      const current = readJson(agent.configPath);
      const updated  = agent.merge(current, agent.serverEntry);
      writeJson(agent.configPath, updated);
      results.installed.push(agent.name);
      console.log(`  ${c.green("✓")} ${agent.name}`);
      console.log(c.dim(`    → ${agent.configPath}`));
    } catch (err) {
      results.failed.push(agent.name);
      console.log(`  ${c.red("✗")} ${agent.name} — ${err.message}`);
    }
  }

  // Summary
  console.log(c.bold("\n─────────────────────────────────────────"));
  console.log(`${c.green("Installed:")} ${results.installed.length}  ${c.dim("Skipped:")} ${results.skipped.length}  ${c.red("Failed:")} ${results.failed.length}`);

  if (results.installed.length > 0) {
    console.log(c.bold("\n✅ Next steps:"));
    console.log("  1. Restart each installed agent (they load config at startup)");
    console.log("  2. In any agent, tell it:");
    console.log(c.cyan('     "Connect my Zoho accounts"'));
    console.log("  3. Go to https://www.zoho.com/mcp — generate MCP URLs for");
    console.log("     Zoho Payroll and Zoho People, then paste them in.");
    console.log("  4. Full integration tools unlock automatically.\n");
  }
}

// ── Uninstall ─────────────────────────────────────────────────────────────────
function uninstall() {
  console.log(c.bold("\n🗑  zoho-integration-mcp — Uninstaller\n"));

  for (const agent of agents) {
    if (!fs.existsSync(agent.configPath)) {
      console.log(`  ${c.dim("○")} ${agent.name} — ${c.dim("config not found, skipping")}`);
      continue;
    }

    try {
      const cfg = readJson(agent.configPath);

      // Remove from mcpServers / servers / context_servers / experimentalMcp
      if (cfg.mcpServers?.["zoho-integration"])       delete cfg.mcpServers["zoho-integration"];
      if (cfg.servers?.["zoho-integration"])           delete cfg.servers["zoho-integration"];
      if (cfg.context_servers?.["zoho-integration"])   delete cfg.context_servers["zoho-integration"];
      if (cfg.experimental?.modelContextProtocolServers) {
        cfg.experimental.modelContextProtocolServers =
          cfg.experimental.modelContextProtocolServers.filter(
            (s) => s.transport?.args?.[0] !== ENTRY
          );
      }

      writeJson(agent.configPath, cfg);
      console.log(`  ${c.green("✓")} ${agent.name} — removed`);
    } catch (err) {
      console.log(`  ${c.red("✗")} ${agent.name} — ${err.message}`);
    }
  }

  // Remove saved Zoho credentials
  const credFile = path.join(HOME, ".zoho-integration-mcp", "config.json");
  if (fs.existsSync(credFile)) {
    fs.unlinkSync(credFile);
    console.log(`\n  ${c.green("✓")} Zoho credentials removed`);
  }

  console.log(c.bold("\nDone. Restart your agents to apply.\n"));
}

// ── Status ────────────────────────────────────────────────────────────────────
function status() {
  console.log(c.bold("\n📋 zoho-integration-mcp — Status\n"));

  for (const agent of agents) {
    const detected = agent.detect === null || fs.existsSync(agent.detect);
    if (!detected) {
      console.log(`  ${c.dim("○")} ${agent.name} — not installed`);
      continue;
    }

    const cfg = readJson(agent.configPath);
    const hasPlugin =
      cfg.mcpServers?.["zoho-integration"] ||
      cfg.servers?.["zoho-integration"] ||
      cfg.context_servers?.["zoho-integration"] ||
      cfg.experimental?.modelContextProtocolServers?.some((s) => s.transport?.args?.[0] === ENTRY);

    if (hasPlugin) {
      console.log(`  ${c.green("✓")} ${agent.name} — ${c.green("plugin registered")}`);
    } else {
      console.log(`  ${c.yellow("○")} ${agent.name} — ${c.yellow("installed but plugin not registered")}`);
    }
  }

  // Check Zoho credentials
  const credFile = path.join(HOME, ".zoho-integration-mcp", "config.json");
  const connected = fs.existsSync(credFile);
  console.log(c.bold("\n─────────────────────────────────────────"));
  console.log(`Zoho accounts: ${connected ? c.green("Connected ✓") : c.yellow("Not connected — run connect_zoho in any agent")}`);
  console.log();
}

// ── CLI entry ─────────────────────────────────────────────────────────────────
const cmd = process.argv[2];
if (cmd === "uninstall") uninstall();
else if (cmd === "status") status();
else install();
