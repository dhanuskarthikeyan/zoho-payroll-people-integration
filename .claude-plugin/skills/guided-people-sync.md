---
name: guided-people-sync
description: End-to-end guided flow to sync employees from Zoho People to Zoho Payroll and ensure field mappings are correct
---

Guide the customer through a complete, data-driven sync from Zoho People to Zoho Payroll. Use the tools at each step to show live data — don't just give instructions.

## Step 1 — Confirm connection
Call `connection_status`. If not connected, stop and ask the user to run `connect_zoho` first using their URL from https://www.zoho.com/mcp.

## Step 2 — Pull live integration dashboard
Call `get_people_integration_dashboard`.

Show the user a plain-language summary:
- Last sync time (e.g. "Last synced 3 hours ago")
- Whether a sync is currently in progress
- Error count (e.g. "2 employees failed to sync")
- Supported entities (employee, work_location)

If `error_count > 0`, tell the user: "There are X sync errors. Let me check what's blocking them." Then proceed to Step 3.
If `error_count == 0` and they want a fresh sync, jump to Step 5.

## Step 3 — Identify sync errors
Call `list_people_sync_errors`.

For each error, present it clearly:
```
❌ [Employee Name] (ID: xxx)
   Error: [error message]
   Module: [employee / work_location]
   Error code: [ZP_SYNC_001]
```

Group errors by type if multiple employees share the same error. Then diagnose each group:

| Error type | Likely cause | Fix |
|---|---|---|
| Missing mandatory field | Field not filled in People | Use mandatory-fields-checker skill |
| Work location not mapped | Location exists in People but not mapped in Payroll | Use custom-field-mapping skill |
| Employee type mismatch | Type not in sync criteria | Add type in Payroll → Settings → Integrations → Zoho People |
| Field type mismatch | Custom field type differs between systems | Recreate the People field with matching type |

## Step 4 — Check field mappings
Call `get_people_field_mappings` with `entity: "employee"`.

Show the user which fields are currently mapped:
```
✅ first_name       → FirstName
✅ last_name        → LastName
✅ date_of_joining  → DateOfJoining
✅ department       → Department
❌ bank_account_number → NOT MAPPED
```

For any unmapped Payroll field, guide the user to create the matching field in Zoho People first (use the `custom-field-mapping` skill steps), then map it in Payroll Settings.

Also check work_location mappings: call `get_people_field_mappings` with `entity: "work_location"`.

## Step 5 — Review integration preferences
Call `get_people_integration_preferences`.

Check and explain:
- `is_allow_non_users`: whether non-portal users sync (recommend `true` for companies with contractors)
- `employee_types`: which employee types are included — confirm these match what the customer expects
- `work_locations`: which locations are included — flag if a location the user cares about is missing
- `is_salary_sync_supported`: note whether salary sync is available in their plan

If preferences need to change, call `update_people_integration_preferences` with the corrected values. Always confirm with the user before updating.

## Step 6 — Verify employees before sync
Call `check_integration_health` to see the current delta:
- Employees missing in Payroll (will be added by sync)
- Employees in Payroll but not in People (will not be affected)
- Department mismatches (will be corrected by sync)

Show a before/after summary. If any employees have missing mandatory fields, address those first using the `mandatory-fields-checker` and `diagnose-employee-sync` skills.

## Step 7 — Trigger sync
Ask the user: "Ready to sync now? This will push all employees from Zoho People into Zoho Payroll."

On confirmation, call `trigger_people_sync`. Show the response message (e.g. "Zoho People sync has been started.").

Tell the user: "The sync runs in the background. It usually completes in 1–5 minutes depending on the number of employees."

## Step 8 — Confirm sync completed
After the user confirms some time has passed (or ask them to wait a moment), call `get_people_sync_history`.

Show the latest sync entry:
- Status: completed / in_progress / failed
- Started time and completed time
- If completed: call `list_people_sync_errors` again to check if errors reduced

If errors remain, loop back to Step 3 for each remaining error. If resolved, show:

```
✅ Sync complete!
   Employees synced: [from health check delta]
   Errors resolved: [before - after]
   Remaining issues: [count or "none"]
```

## Quick reference — when to use each skill

| Scenario | Use |
|---|---|
| First-time setup | setup-integration skill |
| Connection not working | troubleshoot-connection skill |
| One employee not syncing | diagnose-employee-sync skill |
| LOP data missing from pay run | diagnose-lop-sync skill |
| Custom field not transferring | custom-field-mapping skill |
| Full sync check + run | this skill (guided-people-sync) |
