---
name: custom-field-mapping
description: Guide to creating and mapping custom fields between Zoho People and Zoho Payroll
---

Help the user create and map custom fields so that data flows correctly from Zoho People into Zoho Payroll.

## Step 0 — Pull live mapping state first
Before giving any instructions, call `get_people_field_mappings` with `entity: "employee"`, then call it again with `entity: "work_location"`.

Show the user a clear table of what is currently mapped vs unmapped:
```
EMPLOYEE FIELDS
✅ first_name         → FirstName           (syncing)
✅ department         → Department          (syncing)
❌ bank_account_no    → NOT MAPPED          ← needs action

WORK LOCATION FIELDS
✅ work_location_name → WorkLocationName    (syncing)
❌ work_location_code → NOT MAPPED          ← needs action
```

Only guide the user through the fix steps below for fields that are **actually unmapped**. If everything is already mapped, say: "All fields are currently mapped — no action needed."

## When manual mapping is needed
When a field exists in Zoho Payroll (e.g., a statutory field, bank detail, or HR field) but has no matching field in Zoho People — you must first create the field in People, then map it.

## Standard fields that sync automatically (no mapping needed)

**Basic Info (auto-mapped):** First Name, Middle Name, Last Name, Employee Number, Gender, Date of Joining, Date of Termination, Designation, Work Email, Mobile Number, Department, Work Location, Status, Employment Type, Role

**Personal Info (auto-mapped):** Personal Email, Date of Birth, Father's Name, PAN, Address, City, State, Postal Code, Country

**Payment Info (auto-mapped, all-or-nothing):** Payment Mode, Bank Holder Name, Bank Name, Account Number, IBAN/Routing Number, Account Type

## Step-by-step: create and map a custom field

### Step 1 — Identify the missing Payroll field
- In Zoho Payroll: **Settings → Integrations → Zoho People → Field Mapping**
- Look for any Payroll field showing **"Not Mapped"**

### Step 2 — Create the matching field in Zoho People
- In Zoho People: **Settings → Modules → Employees → Fields**
- Click **Add Field**
- Set the field name to match the Payroll field name exactly (or a clear equivalent)
- Choose the correct field type:
  - Text → for names, codes
  - Number → for amounts, counts
  - Date → for date fields
  - Dropdown → for status/type fields (add the same options as Payroll)
- Save the field

### Step 3 — Map the field
- Back in Zoho Payroll: **Settings → Integrations → Zoho People → Field Mapping**
- Find the Payroll field → select the newly created People field from the dropdown
- Save the mapping

### Step 4 — Populate the field for existing employees
- For existing employees, fill in the new custom field value in Zoho People
- Then call `trigger_people_sync` to push all employees immediately
- After a minute, call `list_people_sync_errors` to confirm the field is no longer causing errors
- Or run `sync_employee` with a specific employee ID to test a single record first

## Important notes
- **Payment Info is all-or-nothing:** if you map any payment field, ALL 6 payment fields must be mapped and filled
- **Dropdown fields:** values in People dropdown must match values in Payroll exactly (case-sensitive)
- **Custom fields do not auto-map** — you must manually map each one after creating it
