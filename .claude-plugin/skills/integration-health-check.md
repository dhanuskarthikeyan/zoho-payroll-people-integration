---
name: integration-health-check
description: Run a full integration health check between Zoho Payroll and Zoho People and explain results
---

Run a full health check of the Zoho Payroll ↔ Zoho People integration and explain what each issue means and how to fix it.

## Step 1 — Get dashboard overview
Call `get_people_integration_dashboard` first. This gives a quick snapshot:
- Last sync time — flag if it was more than 24 hours ago
- Whether a sync is currently running
- Error count — if > 0, mention it upfront: "There are X employees with sync errors."

Then call `get_people_sync_history` and show the last 3 sync runs (status, start time, duration). This helps identify if syncs are failing entirely or just for specific employees.

## Step 2 — Run the detailed health check
Call `check_integration_health` to compare both systems record by record.

## Step 2 — Interpret and explain results

### If "Missing in Payroll" employees are found
These employees exist in Zoho People but have never synced to Zoho Payroll.

**Most common causes:**
- Missing mandatory fields (Employee Number, Work Location, Work Email, Date of Joining, Employee Type)
- Employee's Work Location or Employee Type doesn't match the sync criteria set in Payroll

**Fix options:**
- Run `fix_sync_issues` with `issue_type: "missing_employees"` to auto-sync them
- Or run `/diagnose-employee-sync` skill for each employee to find the exact missing field

### If "In Payroll but not in People" employees are found
These employees were added directly in Zoho Payroll (before or outside the integration).

**What this means:** Once the integration is active, Payroll locks employee management. These records may become orphaned.

**Fix:** Add these employees to Zoho People with all required fields → they will sync back on next run.

### If "Department mismatches" are found
An employee's department in Zoho People differs from what Zoho Payroll shows.

**Cause:** Department was updated in one system but not re-synced.

**Fix:**
- Run `fix_sync_issues` with `issue_type: "department_mismatch"` to auto-correct
- Remember: Payroll gets the value FROM People — always update the master record in People

### If "Salary mismatches" are found
Salary data between the two systems differs.

**Important:** Salary is sensitive — never auto-update without review.

**Fix:** Manually compare in both systems and update in Zoho Payroll's pay components. Salary does not sync bidirectionally.

## Step 3 — Check for specific sync errors
Call `list_people_sync_errors`. For each error, show the employee name, error message, and error code, then map it to a fix:

| Error code | Meaning | Fix |
|---|---|---|
| ZP_SYNC_001 or similar | Missing mandatory field | Use `mandatory-fields-checker` skill for that employee |
| Work location not mapped | Location exists in People but not in Payroll sync criteria | Add location in Payroll → Settings → Integrations → Zoho People |
| Field type mismatch | Custom field types differ | Recreate the People field with the correct type |
| Duplicate employee | Employee already exists with different ID | Merge records in Payroll |

## Step 4 — After fixing issues
- Call `trigger_people_sync` to push all fixes to Payroll immediately
- Wait 1–2 minutes, then call `get_people_sync_history` to confirm latest sync completed
- Call `list_people_sync_errors` again to verify error count dropped
- Run `check_integration_health` for a final comparison

## Healthy integration — what to look for
✅ Dashboard shows 0 errors  
✅ Latest sync history entry shows status: completed  
✅ People employees = Payroll employees (same count)  
✅ No department mismatches  
✅ All employees have mandatory fields filled  
✅ LOP sync ran before the latest pay run  
