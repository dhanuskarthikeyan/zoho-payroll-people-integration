---
name: setup-integration
description: Step-by-step guide to set up the Zoho Payroll and Zoho People integration for the first time
---

Guide the user through the complete first-time setup of the Zoho Payroll ↔ Zoho People integration.

Follow these exact steps in order and confirm each one before proceeding:

## Prerequisites checklist (confirm all before starting)
- [ ] Zoho Payroll organization setup is complete (org profile, tax info, pay schedule, statutory components like PF/ESI/PT)
- [ ] User has Super Admin access in Zoho People
- [ ] Same user also exists as a user in Zoho Payroll
- [ ] Region is India, Saudi Arabia, or UAE (integration is only available in these regions)

## Step 1 — Connect from Zoho Payroll
1. In Zoho Payroll: go to **Settings → Integrations → Zoho Apps**
2. Click **Connect** next to Zoho People
3. Select the Zoho People organization from the dropdown
4. Set sync criteria: choose **Work Location** and **Employee Type** (only employees matching BOTH filters will sync)

## Step 2 — Configure field mapping
1. Review auto-mapped default fields (First Name, Last Name, Employee Number, Department, etc.)
2. For any Payroll field not found in People: create a matching **custom field in Zoho People first**, then map it
3. Save the field mapping

## Step 3 — Enable sync
1. Toggle **"Sync my employee database with Zoho Payroll"** ON
2. Confirm the sync — this triggers the first sync immediately
3. Enable **LOP Sync** and select the matching Pay Schedule

## Step 4 — Configure from Zoho People side
1. In Zoho People: go to **Settings → Marketplace → Zoho → Zoho Payroll → Configure**
2. Assign a **Payroll Admin** (Super Admin is default)
3. Note: automated daily sync runs at 12:00 AM; use the **Instant Sync** button for immediate sync

## Key limitations to communicate
- Sync is **one-way only**: People → Payroll (changes in Payroll do NOT go back to People)
- LOP sync only works with **monthly pay periods**
- Once enabled, all employee additions must go through Zoho People (Payroll locks employee management)
- Each payroll organization requires its own separate sync configuration

After each step, use `check_integration_health` to verify employees are syncing correctly.
