---
name: integration-health-check
description: Run a full integration health check between Zoho Payroll and Zoho People and explain results
---

Run a full health check of the Zoho Payroll ↔ Zoho People integration and explain what each issue means and how to fix it.

## Step 1 — Run the health check
Call `check_integration_health` to get the current state.

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

## Step 3 — After fixing issues
- Run `sync_all_employees` to push all fixes to Payroll
- Run `check_integration_health` again to confirm everything is resolved

## Healthy integration — what to look for
✅ People employees = Payroll employees (same count)  
✅ No department mismatches  
✅ All employees have mandatory fields filled  
✅ LOP sync ran before the latest pay run  
