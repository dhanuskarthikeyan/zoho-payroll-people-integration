---
name: diagnose-lop-sync
description: Diagnose and fix Loss of Pay (LOP) sync failures between Zoho People and Zoho Payroll
---

Diagnose why LOP (Loss of Pay) data is not syncing from Zoho People to Zoho Payroll.

## What is LOP sync?
LOP sync pushes leave-without-pay days from Zoho People into Zoho Payroll so they are deducted from salary. It must be manually triggered from Zoho People before each payroll run.

## How to push LOP data (correct flow)
1. In Zoho People: go to **Reports → Leave → Loss of Pay Details**
2. Select the pay period date range
3. Click **"Push to Payroll"**
4. Confirm in Zoho Payroll that the LOP values appear under the employee's pay run

## Common LOP sync failures

### Problem 1 — Pay period mismatch
**Symptom:** Push to Payroll button shows an error or LOP doesn't appear in Payroll  
**Cause:** The pay period in Zoho People doesn't match the Pay Schedule in Zoho Payroll  
**Fix:**
- In Zoho Payroll: **Settings → Integrations → Zoho People** → check the selected Pay Schedule
- In Zoho People: ensure the leave period you are pushing matches that pay schedule exactly (same start/end dates)

### Problem 2 — Processing day after payday
**Symptom:** LOP sync fails silently or data arrives too late  
**Cause:** The LOP Processing Day in Zoho People is set after the Payday in Zoho Payroll  
**Fix:**
- In Zoho People: **Settings → Leave → LOP Settings** → set Processing Day to be **on or before** the Payday in Payroll

### Problem 3 — LOP sync not enabled
**Symptom:** "Push to Payroll" button is missing  
**Cause:** LOP sync was never enabled during integration setup  
**Fix:**
- In Zoho Payroll: **Settings → Integrations → Zoho People** → enable **LOP Sync** → select the Pay Schedule

### Problem 4 — Leave & Attendance module conflict
**Symptom:** Cannot connect Zoho People at all, or LOP sync errors out  
**Cause:** Leave & Attendance module is enabled in Zoho Payroll (conflicts with People sync)  
**Fix:**
- Disable Leave & Attendance in Zoho Payroll
- If you cannot disable it yourself, contact **support@zohopayroll.com**

### Problem 5 — Non-monthly pay schedule
**Symptom:** LOP sync option is greyed out or not available  
**Cause:** LOP sync only works with **monthly** pay schedules  
**Fix:** Confirm the pay schedule is set to Monthly. Weekly/bi-weekly schedules are not supported for LOP sync.

## Verification
After fixing, re-push LOP data and confirm values appear in:
**Zoho Payroll → Pay Runs → [Current Period] → [Employee] → Deductions → LOP**
