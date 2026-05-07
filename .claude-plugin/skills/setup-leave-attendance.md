---
name: setup-leave-attendance
description: Set up, diagnose, and manage the Leave & Attendance integration between Zoho People/HRMS and Zoho Payroll
---

Guide the user through setting up or troubleshooting the Leave & Attendance integration so LOP (Loss of Pay) and attendance data flows correctly into Zoho Payroll pay runs.

## Step 0 — Check current integration state
Call `get_leave_attendance_details`. This shows whether Leave & Attendance is configured, which source (Zoho People, Zoho HRMS, or other) is connected, and whether sync is active.

If not yet configured, start at Step 1. If already configured but broken, jump to Diagnose section.

## Step 1 — Prerequisites (confirm before setup)
Ask the user to confirm all of these:
- [ ] Zoho Payroll has a **monthly pay schedule** set up (LOP sync only works with monthly schedules)
- [ ] The user has **Super Admin** access in both Zoho People and Zoho Payroll
- [ ] **Leave & Attendance module** is NOT enabled in Zoho Payroll Settings (it conflicts — must be disabled first)

If Leave & Attendance module is active:
- Go to: **Zoho Payroll → Settings → Modules** → disable Leave & Attendance
- If you cannot disable it yourself, email support@zohopayroll.com

## Step 2 — Check leave sync settings
Call `get_leave_attendance_settings`. Show the user:
- Which pay schedule is configured for LOP sync
- Whether LOP sync is enabled (`is_lop_sync_enabled`)
- Whether payable days sync is enabled
- Whether overtime sync is enabled

If LOP sync is not enabled:
- Go to: **Zoho Payroll → Settings → Integrations → Zoho People**
- Enable **LOP Sync** → select the matching monthly Pay Schedule
- Enable **Payable Days Sync** if the customer wants payable days from People to feed into Payroll

## Step 3 — Check attendance settings (if attendance is used)
Call `get_attendance_settings`. Show the configured attendance source, shift settings, and whether attendance regularization is active.

If the customer wants to track attendance through Zoho People:
- Go to: **Zoho Payroll → Settings → Integrations → Zoho People**
- Enable Attendance sync → select the attendance source

## Step 4 — Trigger initial sync
Call `trigger_leave_attendance_sync`. This starts a manual sync pulling LOP and attendance data from Zoho People into Payroll.

After triggering:
- Wait 1–2 minutes
- Call `get_leave_attendance_sync_summary` to confirm the sync completed
- Call `list_leave_attendance_sync_errors` to check for any errors

## Diagnose — sync errors

Call `list_leave_attendance_sync_errors`. For each error:

| Error type | Cause | Fix |
|---|---|---|
| Pay period mismatch | People leave period ≠ Payroll pay schedule dates | Ensure People leave period matches Payroll pay schedule exactly |
| Employee not found in Payroll | Employee exists in People but not synced to Payroll | Run `sync_employee` first, then retry |
| LOP Processing Day after Payday | People LOP processing day is set too late | In People: **Settings → Leave → LOP Settings** → set processing day on/before Payroll payday |
| Attendance not regularized | Employee has unresolved attendance exceptions | Call `list_attendance_regularizations` with status: "pending" and resolve them |
| Non-monthly pay schedule | LOP sync only supports monthly | Change pay schedule to Monthly |

## How to push LOP data (each pay period)
LOP sync must be triggered manually from Zoho People before each pay run:

1. In Zoho People: **Reports → Leave → Loss of Pay Details**
2. Select the pay period date range (must match Payroll pay schedule exactly)
3. Click **"Push to Payroll"**
4. Confirm in Payroll: **Pay Runs → [Current Period] → [Employee] → Deductions → LOP**

Or call `trigger_leave_attendance_sync` from this plugin to trigger it directly.

## Check an employee's attendance
If an employee's attendance or LOP is wrong in a pay run:
- Call `get_employee_attendance` with their `employee_id` and `period` (e.g. `2024-04`)
- This shows their calendar view and attendance summary for that period
- Look for unresolved exceptions or missing days

## Attendance regularization
If employees have attendance exceptions (missed punch-ins, late arrivals etc.) that need approval before sync:
- Call `list_attendance_regularizations` with `status: "pending"` to see all open requests
- Employees or managers can approve/reject through the Zoho People app
- After approval, call `trigger_leave_attendance_sync` to pull approved data into Payroll

## Verification checklist after setup
✅ `get_leave_attendance_details` shows integration active  
✅ `get_leave_attendance_settings` shows LOP sync enabled with correct pay schedule  
✅ `get_leave_attendance_sync_summary` shows latest sync: completed  
✅ `list_leave_attendance_sync_errors` shows 0 errors  
✅ LOP values appear in **Payroll → Pay Runs → [Employee] → Deductions → LOP**  
