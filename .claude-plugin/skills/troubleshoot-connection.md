---
name: troubleshoot-connection
description: Fix connection issues when Zoho Payroll and Zoho People cannot be linked
---

Troubleshoot why Zoho Payroll and Zoho People cannot be connected or why the connection broke.

Ask: "What error or symptom are you seeing when trying to connect?"

## Symptom 1 — "Connect" button is missing or greyed out in Zoho Payroll

**Cause A:** Leave & Attendance module is enabled in Zoho Payroll (conflicts with People)  
**Fix:** 
- In Zoho Payroll: **Settings → Modules** → disable Leave & Attendance
- If you cannot disable it, email **support@zohopayroll.com** — they need to remove it from the backend

**Cause B:** Zoho Payroll organization setup is incomplete  
**Fix:** Complete all setup steps — org profile, pay schedule, tax settings — before attempting to connect

**Cause C:** User doesn't have Super Admin access in Zoho People  
**Fix:** The connecting user must be **Super Admin in Zoho People** AND exist as a user in Zoho Payroll

## Symptom 2 — Organization not showing in the dropdown

**Cause:** The Zoho account used to connect is not a member of the target Zoho People organization  
**Fix:** Log in with the account that is Super Admin in that specific People organization

## Symptom 3 — "Already connected to another organization"

**Cause:** Zoho Payroll org is already linked to a different Zoho People org  
**Fix:**
- You cannot change the connected org without disconnecting first
- To disconnect: **Zoho Payroll → Settings → Integrations → Zoho People → Disconnect**
- ⚠️ Disconnecting will stop all sync — re-setup is required after reconnecting

## Symptom 4 — MCP URL not working (for this plugin)

**Cause A:** Zoho Payroll or Zoho People app is not enabled in your Zoho MCP settings  
**Fix:**
1. Go to **https://www.zoho.com/mcp**
2. Find your MCP configuration
3. Enable **Zoho Payroll** and **Zoho People** in the Apps/Tools section
4. Copy the updated URL and run `connect_zoho` again

**Cause B:** MCP session expired  
**Fix:** Go to https://www.zoho.com/mcp → regenerate the URL → run `connect_zoho` with the new URL

## Symptom 5 — Sync stops working after initial setup

**Cause:** Zoho session or MCP token expired  
**Fix:** Run `connection_status` to check if still connected, then `connect_zoho` again with a refreshed URL from https://www.zoho.com/mcp

## Escalation
If none of the above fixes work:
- Email: **support@zohopayroll.com**
- Include: your Zoho org ID, the error message, and the steps you already tried
