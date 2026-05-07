---
name: troubleshoot-errors
description: Diagnose and fix API errors, server errors, and sync failures in the Zoho People → Payroll integration. Use when the customer reports an error or something stopped working.
---

When a customer reports an error, follow this guide to diagnose and fix it.

## Step 0 — Get live status first
Always start here before diagnosing:

1. Call `connection_status` — confirm the MCP URL is still valid
2. Call `check_integration_health` — see current employee counts
3. Call `list_people_sync_errors` — get specific errors (requires REST credentials)

## HTTP / API error codes

| Code | Meaning | Fix |
|---|---|---|
| `401 Unauthorized` | Access token expired or invalid | Re-run `configure_people_api_credentials` with a fresh OAuth token |
| `403 Forbidden` | Token missing required OAuth scope | Token needs `ZohoPayroll.employees.CREATE` + `ZohoPayroll.employees.UPDATE` scopes |
| `404 Not Found` | Wrong endpoint or org ID | Verify organization_id with `ZohoPayroll_list_organizations` |
| `429 Too Many Requests` | Rate limit hit | Wait 1 minute, then retry |
| `500 Server Error` | Zoho backend issue | Wait 5 minutes and retry; if persistent, contact support@zohopayroll.com |
| `503 Service Unavailable` | Zoho maintenance | Check https://status.zoho.com — usually resolves in minutes |

## Zoho API response codes (code field in JSON)

| code | Meaning | Fix |
|---|---|---|
| `0` | Success | No action needed |
| `1001` | Invalid organization ID | Run `ZohoPayroll_list_organizations` to get the correct org ID |
| `1002` | Employee already exists | Employee is already in Payroll — use update instead of create |
| `1003` | Required field missing | Check which field is missing from the error message |
| `1004` | Invalid field value | The value format is wrong (e.g. date format, enum value) |
| `2001` | Integration not enabled | Set up People integration in Zoho Payroll → Settings → Integrations |
| `2002` | People org not connected | Re-connect People in Zoho Payroll → Settings → Integrations → Zoho Apps |
| `7049` | Record not found in People | The employee ID doesn't exist in People — check the ID |
| `7050` | People API permission error | The connected Zoho account doesn't have admin access to People |

## Common sync failures

### "No employees syncing from People"
**Diagnosis:**
1. Call `list_people_sync_errors` — check for error code 2001 or 2002
2. Check if People integration is enabled: Zoho Payroll → Settings → Integrations → Zoho People

**Fix:**
- If not enabled: Go to Zoho Payroll → Settings → Integrations → Zoho People → Connect → Enable Employee Sync
- If enabled but not syncing: Check `get_people_integration_preferences` for sync filters blocking employees

### "Employee X is in People but not showing in Payroll"
**Diagnosis:**
1. Call `list_people_sync_errors` — look for errors on that specific employee
2. Common causes: incomplete employee profile in People (missing required fields)

**Required fields for sync:**
- First Name
- Gender
- Department
- Designation
- Work Location
- Date of Joining
- Employee Number
- Work Email
- Employee Status

**Fix:**
- Ask: "Can you check if employee X has all required fields filled in Zoho People? Specifically: `[missing field from error]`?"
- After fixing, call `trigger_people_sync` to retry

### "MCP connection stopped working"
**Diagnosis:**
1. Call `connection_status` — if "Not connected", the config was cleared
2. If connected, the Zoho session may have expired

**Fix:**
- Re-run `connect_zoho` with the same MCP URL from https://www.zoho.com/mcp
- If the URL has changed, get the new one from that page

### "API returns empty data / 0 employees"
**Diagnosis:**
- Payroll org might be on a trial/restricted plan
- Wrong organization_id being used

**Fix:**
1. Call `ZohoPayroll_list_organizations` — verify org ID and plan status
2. Check `org_type` field: must be `"live"` (not `"test"`)
3. Check `isOrgActive` field: must be `true`

### "Server error on every API call"
**Immediate checks:**
1. Check https://status.zoho.com for any ongoing incidents
2. Verify the MCP URL is still valid (it might have rotated — regenerate at https://www.zoho.com/mcp)
3. Check if the Zoho account is still active

**Action:**
Ask the customer: "I'm seeing repeated server errors. Should I:
1. ✅ Retry in 5 minutes (likely a temporary Zoho outage)
2. ✅ Regenerate the MCP URL from https://www.zoho.com/mcp
3. ✅ Contact Zoho Support at support@zohopayroll.com with the error details"

### "Sync errors after field mapping changes"
When new fields are mapped, employees already in Payroll may fail to re-sync if those fields are empty in People.

**Fix:**
1. Call `list_people_sync_errors` — note which employees failed
2. For each failing employee: fill in the newly mapped fields in Zoho People
3. Call `trigger_people_sync` to retry

## When to escalate to Zoho Support

Escalate to **support@zohopayroll.com** when:
- Error persists after 24 hours
- Error code is not in the tables above
- Data corruption is suspected (employees duplicated or deleted)
- Leave & Attendance module cannot be disabled (they remove it from backend)

Tell the customer to include:
- Their Payroll Organization ID
- The exact error message
- The time the error first occurred
- Steps they already tried

## Asking the customer before making changes

Before any write operation (update preferences, map fields, trigger sync), always confirm:

> "I found [X issue]. To fix it, I'll [description of action]. Should I go ahead? (yes/no)"

Never apply fixes silently. The customer may have a reason not to change something.
