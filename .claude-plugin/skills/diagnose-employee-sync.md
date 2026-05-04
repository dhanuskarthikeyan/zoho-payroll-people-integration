---
name: diagnose-employee-sync
description: Diagnose and fix employee sync failures between Zoho People and Zoho Payroll
---

Diagnose why an employee is not syncing from Zoho People to Zoho Payroll and provide a fix.

Ask the user: "Which employee is not syncing? (provide name or employee ID)"

Then run `get_employee_details` for that employee and systematically check each cause below.

## Mandatory fields checklist — all must be populated in Zoho People

Check every field. A single missing field blocks the entire employee record from syncing.

| Field | Where to fill | Common mistake |
|---|---|---|
| **Employee Number** | People → Employee profile → Basic Info | Left blank during onboarding |
| **Date of Joining** | People → Employee profile → Basic Info | Not set for legacy employees |
| **Work Location** | People → Employee profile → Basic Info | Must match a location enabled in Payroll sync criteria |
| **Work Email** | People → Employee profile → Contact | Personal email used instead |
| **Employee Type** | People → Employee profile → Basic Info | Must match an employee type enabled in Payroll sync criteria |

## Sync criteria mismatch
- Go to Zoho Payroll → **Settings → Integrations → Zoho People**
- Check which **Work Location** and **Employee Type** values are selected for sync
- If the employee's values don't match → either update the employee record in People OR add their values to the sync criteria in Payroll

## Terminated employee not syncing
- Check if **Date of Exit** is filled in Zoho People
- If missing → add Date of Exit → trigger instant sync

## After fixing — how to re-sync
1. In Zoho People: go to **HR → Employees → [Employee] → Payroll tab**
2. Click **Sync Now** to push that employee immediately
3. Or use `sync_employee` tool with the employee ID

## Still not syncing?
Run `check_integration_health` to see the full list of employees missing in Payroll.
If the issue persists after filling all mandatory fields, contact support@zohopayroll.com with the employee ID and error message.
