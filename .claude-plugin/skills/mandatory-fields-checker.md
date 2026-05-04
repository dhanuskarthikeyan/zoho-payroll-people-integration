---
name: mandatory-fields-checker
description: Check all mandatory fields required for an employee to sync from Zoho People to Zoho Payroll
---

Check all mandatory fields for a specific employee and tell the user exactly which ones are missing.

Ask: "Which employee would you like to check? (provide name or employee ID)"

Then call `get_employee_details` for that employee and run through this checklist.

## Mandatory fields for employee sync

### Basic Info — all required
| Field | Required value | Status |
|---|---|---|
| Employee Number | Any unique value | ☐ |
| First Name | Non-empty | ☐ |
| Last Name | Non-empty | ☐ |
| Date of Joining | Valid date (YYYY-MM-DD) | ☐ |
| Work Location | Must match Payroll sync criteria | ☐ |
| Work Email | Valid business email | ☐ |
| Employee Type | Must match Payroll sync criteria | ☐ |
| Employment Status | Active / Inactive / Terminated | ☐ |

### For terminated employees — additional required field
| Field | Required value | Status |
|---|---|---|
| Date of Exit | Valid date (YYYY-MM-DD) | ☐ |

### Payment Info — if any payment field is present, ALL must be filled
| Field | Required value | Status |
|---|---|---|
| Payment Mode | Bank Transfer / Cheque / Cash | ☐ |
| Bank Holder Name | Full legal name | ☐ |
| Bank Name | Full bank name | ☐ |
| Account Number | Valid account number | ☐ |
| IBAN / Routing Number | Valid routing/IFSC code | ☐ |
| Account Type | Savings / Current / Checking | ☐ |

## How to present results to the user

For each missing or empty field, tell the user:
1. The field name
2. Where to fill it in Zoho People (module + tab)
3. What value to enter

Example output:
```
❌ Work Location — missing
   → Go to: Zoho People → HR → [Employee] → Basic Info tab
   → Set a Work Location that matches one enabled in Payroll sync criteria

❌ Date of Joining — missing
   → Go to: Zoho People → HR → [Employee] → Basic Info tab
   → Enter the employee's start date in YYYY-MM-DD format
```

## After all fields are filled
1. Trigger immediate sync: Zoho People → HR → [Employee] → Payroll tab → **Sync Now**
2. Or run `sync_employee` tool with the employee ID
3. Verify with `get_employee_details` — the Payroll profile should now show data
