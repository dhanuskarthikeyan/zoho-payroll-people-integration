---
name: custom-field-mapping
description: Show current field mapping state and guide the user to fix unmapped fields between Zoho People and Zoho Payroll
---

Help the user understand and complete field mappings so employee data flows correctly from Zoho People into Zoho Payroll.

## Step 0 — Pull live mapping state first
Call `get_people_field_mappings` with `entity: "employee"`.

Present results grouped by section, exactly as the Payroll UI shows them:

```
BASIC INFORMATION (X of 13 mapped)
✅ first_name         → FirstName
✅ last_name          → LastName
✅ employee_number    → EmployeeID
✅ gender             → Gender
✅ date_of_joining    → DateOfJoining
✅ designation        → Designation
✅ email_address      → WorkEmail
✅ department         → Department
✅ work_location      → WorkLocationName
✅ date_of_exit       → LastWorkingDay
✅ employee_status    → Status
❌ middle_name        → NOT MAPPED
❌ mobile_number      → NOT MAPPED

PERSONAL INFORMATION (X of 9 mapped)
✅ date_of_birth      → DateOfBirth
❌ personal_email     → NOT MAPPED
❌ father_name        → NOT MAPPED
❌ pan_number         → NOT MAPPED
❌ address_line1      → NOT MAPPED
❌ address_line2      → NOT MAPPED
❌ city               → NOT MAPPED
❌ state_code         → NOT MAPPED
❌ postal_code        → NOT MAPPED

PAYMENT INFORMATION (0 of 6 mapped)
⚠️  NONE mapped — must map ALL 6 or NONE (all-or-nothing rule)
❌ payment_mode       → NOT MAPPED  (Permitted: Cheque, Direct Deposit, Bank Transfer)
❌ bank_holder_name   → NOT MAPPED
❌ bank_name          → NOT MAPPED
❌ account_number     → NOT MAPPED
❌ ifsc_code          → NOT MAPPED
❌ account_type       → NOT MAPPED  (Permitted: Savings, Current)
```

Tell the user: "X fields are unmapped. Here's what I recommend fixing:"

## How to fix unmapped fields

### Option A — Map via API (fastest, no UI needed)
If the Zoho People fields already exist, use `get_people_field_mapping_edit_data` to discover the exact People field API names, then call `update_people_employee_field_mappings` to map them in one shot.

Example — mapping Personal Info fields that exist in People:
```
update_people_employee_field_mappings with fields:
[
  { payroll_field_name: "personal_email",  payroll_display_name: "Personal Email",  people_field_name: "PersonalEmail" },
  { payroll_field_name: "father_name",     payroll_display_name: "Father Name",     people_field_name: "FatherName" },
  { payroll_field_name: "pan_number",      payroll_display_name: "PAN Number",      people_field_name: "PANNumber" },
  { payroll_field_name: "address_line1",   payroll_display_name: "Personal AddressLine1", people_field_name: "AddressLine1" },
  { payroll_field_name: "address_line2",   payroll_display_name: "Personal AddressLine2", people_field_name: "AddressLine2" },
  { payroll_field_name: "city",            payroll_display_name: "Personal City",   people_field_name: "City" },
  { payroll_field_name: "state_code",      payroll_display_name: "Personal StateCode", people_field_name: "StateCode" },
  { payroll_field_name: "postal_code",     payroll_display_name: "Personal PostalCode", people_field_name: "PostalCode" }
]
```

Always confirm with the user before calling the update — show them the exact mapping list and ask "Shall I apply these mappings?"

### Option B — Map via Payroll UI (when People fields don't exist yet)
1. In Zoho Payroll: **Settings → Integrations → Zoho Apps → Zoho People → Field Mapping**
2. Find the unmapped Payroll field
3. Click the dropdown on the right — it shows available Zoho People fields
4. If the People field doesn't appear: go to Zoho People first and create it (see Step below)
5. Save the mapping

### Creating a missing field in Zoho People
Only needed if the People field doesn't exist yet:
1. In Zoho People: **Settings → Modules → Employees → Fields → Add Field**
2. Match the field name and type exactly:
   - Text fields (names, codes, addresses) → use **Single Line** type
   - Numeric (account numbers, postal codes) → use **Number** type
   - Dropdown (payment mode, account type) → use **Dropdown** — add EXACT same options as Payroll (case-sensitive)
3. Save, then go back to Option A or B to map it

## Payment Info — all-or-nothing rule
⚠️ If you map ANY payment field, you MUST map ALL 6:
`payment_mode`, `bank_holder_name`, `bank_name`, `account_number`, `ifsc_code`, `account_type`

And every employee record in Zoho People must have ALL 6 payment fields filled before syncing — otherwise the employee will fail to sync.

**Recommendation:** Only map Payment Info if the customer wants to manage bank details in Zoho People. If they prefer entering payment info directly in Payroll, leave all 6 unmapped.

Ask the user: "Do you want to sync payment/bank details from Zoho People into Payroll, or manage them directly in Payroll?"

## After mapping — verify and sync
1. Call `get_people_field_mappings` again to confirm the mappings saved correctly
2. Call `trigger_people_sync` to push all employees with the new field data
3. Wait 1–2 minutes, then call `list_people_sync_errors` to confirm no new errors from the newly mapped fields
