---
name: setup-wizard
description: Walk a new customer through the complete Zoho People → Payroll integration setup from scratch, including getting the MCP URL, discovering org IDs, and verifying the first sync
---

Guide the customer through the complete integration setup step by step. Do each step, wait for confirmation, then move to the next.

## Step 1 — Check if already connected
Call `connection_status`.

If already connected → skip to Step 4.
If not connected → continue to Step 2.

## Step 2 — Get the Zoho MCP URL

Tell the customer:

> To connect Claude to your Zoho Payroll and Zoho People accounts, you need a single MCP URL from Zoho.
>
> **Here's how to get it:**
> 1. Open **https://www.zoho.com/mcp** (sign in with your Zoho account)
> 2. In the **Apps/Tools** section, enable:
>    - ✅ **Zoho Payroll**
>    - ✅ **Zoho People**
> 3. Copy the MCP URL shown on the page — it looks like:
>    `https://payroll-<orgid>.zohomcp.in/mcp/<token>/message`
>
> Paste the URL here and I'll connect.

Wait for the user to paste the URL, then call `connect_zoho` with it.

**If connect_zoho succeeds:** It will auto-discover the Payroll organization ID. Tell the customer:
```
✅ Connected! Payroll Org ID discovered automatically.
```

**If connect_zoho fails with "apps not enabled":** Guide the user back to https://www.zoho.com/mcp to enable the missing apps.

**If the URL is wrong format:** Ask them to copy it again from the page.

## Step 3 — Verify what's available
Call `check_integration_health` to see the current Payroll employee count.

If 0 employees → expected for a fresh setup, proceed to Step 4.
If employees already exist → tell the user sync is working and skip to Step 6.

## Step 4 — Set up the People Integration in Payroll UI (first-time only)

Before syncing, the customer must enable the integration in Zoho Payroll:

> **One-time setup in Zoho Payroll UI:**
> 1. Go to **Zoho Payroll → Settings → Integrations → Zoho Apps → Zoho People**
> 2. Click **Connect** (or **Enable**)
> 3. Authorize the connection
> 4. Under **Sync Settings**, enable:
>    - ✅ **Employee Sync** (required)
>    - ✅ **LOP Sync** (if you use leave-without-pay deductions)
> 5. Save

Ask: "Have you completed the Zoho People setup in Payroll Settings? (yes/no)"

## Step 5 — Check field mappings
Call `get_people_field_mappings` with `entity: "employee"`.

Show the user which fields are mapped and which are not. For any unmapped fields, ask:

> "Do you want me to map the remaining fields? I can do it via API.
> Note: Payment/bank fields are all-or-nothing — only map them if you manage bank details in Zoho People."

If the user says yes, follow the `custom-field-mapping` skill to map them.

## Step 6 — Trigger the first sync
Tell the user:

> "Ready to sync employees from Zoho People to Payroll. This will import all active employees."

If REST API credentials are configured (from `configure_people_api_credentials`):
→ Call `trigger_people_sync`

If not configured:
→ Ask: "Do you have an OAuth access token for the Zoho Payroll API? If yes, I can trigger the sync automatically. If no, go to **Zoho Payroll → Settings → Integrations → Zoho People → Sync Now** to trigger it manually."

After triggering:
- Wait 1–2 minutes
- Call `list_people_sync_errors`
- If errors found → follow `diagnose-sync-errors` guidance below

## Step 7 — Verify sync success
Call `check_integration_health`. Confirm:
- Employee count > 0
- No errors in `list_people_sync_errors`

Tell the customer:

```
✅ Setup complete!
  • X employees synced from Zoho People → Payroll
  • Field mappings configured
  • Integration is active

What's next:
  • For LOP deductions: ask me about "set up leave attendance"
  • For field mapping: ask me about "fix field mapping"
  • For future syncs: call trigger_people_sync any time
```

## Getting org IDs (if asked)

**Payroll Org ID** — auto-discovered when you run `connect_zoho`. Also visible at:
- Zoho Payroll → Settings → Organization → Organization ID

**People Org ID** — visible at:
- Zoho People → Settings → Organization → Org Details
- Or in the URL when logged in: `people.zoho.com/zohocolors/zp/p/<ORG-ID>/...`

Both org IDs are needed for API calls. The plugin auto-discovers the Payroll org ID; the People org ID is only needed for advanced API debugging.
