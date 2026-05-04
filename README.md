# Zoho Payroll ↔ People Integration MCP

An MCP server that lets any AI agent (Claude, Cursor, GitHub Copilot, Windsurf) help customers integrate **Zoho Payroll** and **Zoho People** — sync employees, detect gaps, and auto-fix common problems.

---

## How it works

```
First run                     After connect_zoho
──────────────────────        ─────────────────────────────────
Only one tool shown:          Full suite unlocked:
  • connect_zoho                • check_integration_health
                                • list_employees
                                • get_employee_details
                                • sync_employee
                                • sync_all_employees
                                • fix_sync_issues
                                • connection_status
                                • disconnect_zoho
```

The agent asks the user to go to **https://www.zoho.com/mcp**, generate MCP URLs for Payroll and People, then paste them into `connect_zoho`. Credentials are saved locally at `~/.zoho-integration-mcp/config.json`.

---

## Installation

### 1 — Build once

```bash
cd zoho-integration-mcp
npm install
npm run build
```

Note the absolute path to the built file:
```bash
pwd   # e.g. /Users/yourname/zoho-integration-mcp
# Built file: /Users/yourname/zoho-integration-mcp/dist/index.js
```

---

### 2 — Add to your agent

Replace `/ABSOLUTE/PATH/TO/zoho-integration-mcp` with your actual path in every snippet below.

#### Claude Code

Add to `~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "zoho-integration": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/zoho-integration-mcp/dist/index.js"]
    }
  }
}
```

#### Cursor

Add to `~/.cursor/mcp.json` (or `.cursor/mcp.json` in your project):
```json
{
  "mcpServers": {
    "zoho-integration": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/zoho-integration-mcp/dist/index.js"]
    }
  }
}
```

#### GitHub Copilot (VS Code)

Add to `.vscode/mcp.json` in your workspace:
```json
{
  "servers": {
    "zoho-integration": {
      "type": "stdio",
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/zoho-integration-mcp/dist/index.js"]
    }
  }
}
```

#### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:
```json
{
  "mcpServers": {
    "zoho-integration": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/zoho-integration-mcp/dist/index.js"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

---

### 3 — Connect your Zoho accounts (first time only)

1. Go to **https://www.zoho.com/mcp**
2. Sign in and generate an MCP URL for **Zoho Payroll**
3. Generate an MCP URL for **Zoho People**
4. In your AI agent, run:

```
connect_zoho
  payroll_mcp_url: <your Payroll MCP URL>
  people_mcp_url:  <your People MCP URL>
```

The agent will validate both URLs and unlock all integration tools.

---

## Available Tools

| Tool | Description |
|---|---|
| `connect_zoho` | Link Zoho Payroll + People (required first step) |
| `connection_status` | Show linked accounts |
| `disconnect_zoho` | Remove saved credentials |
| `check_integration_health` | Report missing employees, dept/salary mismatches |
| `list_employees` | List from People, Payroll, or both |
| `get_employee_details` | Side-by-side view of one employee across both systems |
| `sync_employee` | Push one employee from People → Payroll |
| `sync_all_employees` | Sync all employees from People → Payroll |
| `fix_sync_issues` | Auto-fix missing employees or dept mismatches |

---

## Example prompts

```
"Why is employee E-042 missing from payroll?"
"Sync all employees from Zoho People into Payroll"
"Show me every employee that's out of sync"
"Fix all department mismatches between People and Payroll"
"What's the salary difference for employee E-099 between the two systems?"
```

---

## Project structure

```
zoho-integration-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── config.ts             # Credential storage (~/.zoho-integration-mcp/)
│   ├── zoho-client.ts        # Proxy clients for Payroll and People MCP URLs
│   └── tools/
│       ├── definitions.ts    # Tool schemas (inputSchema for all tools)
│       └── handlers.ts       # Tool logic
├── agent-configs/
│   ├── claude-code.json
│   ├── cursor.json
│   ├── copilot-vscode.json
│   └── windsurf.json
├── dist/                     # Built output (after npm run build)
├── package.json
└── tsconfig.json
```

---

## Credentials storage

Credentials are stored at `~/.zoho-integration-mcp/config.json`. Run `disconnect_zoho` to remove them, or delete the file manually.
