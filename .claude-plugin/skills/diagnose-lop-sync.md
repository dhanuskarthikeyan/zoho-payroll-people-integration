---
name: diagnose-lop-sync
description: Diagnose and fix Loss of Pay (LOP) sync failures between Zoho People and Zoho Payroll
---

Diagnose why LOP (Loss of Pay) data is not syncing from Zoho People to Zoho Payroll.

## Step 0 — Get live status first
Call `get_leave_attendance_sync_summary`. This shows the last sync time, status (completed/failed/in-progress), and error count.

Then call `list_leave_attendance_sync_errors` to get specific error records.

If errors exist, match them to the problem table below and fix them in order.

## What is LOP sync?
LOP sync pushes leave-without-pay days from Zoho People into Zoho Payroll so they are deducted from salary. It must run before each payroll pay run.

## How to push LOP data (correct flow)
**Option A — via this plugin:** Call `trigger_leave_attendance_sync` directly.

**Option B — via Zoho People UI:**
1. Go to **Reports → Leave → Loss of Pay Details**
2. Select the pay period date range (must exactly match Payroll pay schedule)
3. Click **"Push to Payroll"**
4. Confirm in Payroll: **Pay Runs → [Period] → [Employee] → Deductions → LOP**

## Common LOP sync failures

### Problem 1 — Pay period mismatch
**Symptom:** Push to Payroll shows an error or LOP doesn't appear in Payroll
**Cause:** The pay period in Zoho People doesn't match the Pay Schedule in Zoho Payroll
**Fix:**
- Call `get_leave_attendance_settings` → check which pay schedule is configured
- In Zoho People: ensure the leave period dates match that pay schedule exactly (same start/end dates)

### Problem 2 — LOP Processing Day after Payday
**Symptom:** LOP sync fails silently or data arrives too late
**Cause:** The LOP Processing Day in Zoho People is set after Payroll's Payday
**Fix:**
- In Zoho People: **Settings → Leave → LOP Settings** → set Processing Day on or before the Payday in Payroll
- Call `get_leave_attendance_settings` to check configured pay schedule payday

### Problem 3 — LOP sync not enabled
**Symptom:** "Push to Payroll" button is missing in Zoho People
**Cause:** LOP sync was never enabled during integration setup
**Fix:**
- In Zoho Payroll: **Settings → Integrations → Zoho People** → enable **LOP Sync** → select the Pay Schedule
- Then call `trigger_leave_attendance_sync` to test

### Problem 4 — Leave & Attendance module conflict
**Symptom:** Cannot connect Zoho People at all, or LOP sync errors out entirely
**Cause:** Leave & Attendance module is enabled in Zoho Payroll (conflicts with People LOP sync)
**Fix:**
- In Zoho Payroll: **Settings → Modules** → disable Leave & Attendance
- If you cannot disable it, contact **support@zohopayroll.com** — they remove it from the backend

### Problem 5 — Non-monthly pay schedule
**Symptom:** LOP sync option is greyed out or not available
**Cause:** LOP sync only works with monthly pay schedules
**Fix:** Confirm the pay schedule is Monthly. Weekly/bi-weekly schedules are not supported.

### Problem 6 — Employee not in Payroll
**Symptom:** LOP error says "employee not found"
**Cause:** The employee exists in Zoho People but hasn't synced to Payroll yet
**Fix:** Run `sync_employee` with that employee's ID first, then retry the LOP sync

## Verification
After fixing:
1. Call `trigger_leave_attendance_sync`
2. Wait 1–2 minutes
3. Call `get_leave_attendance_sync_summary` — confirm status: completed, error_count: 0
4. Confirm LOP values appear in: **Zoho Payroll → Pay Runs → [Current Period] → [Employee] → Deductions → LOP**
