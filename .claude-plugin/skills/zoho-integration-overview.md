---
name: zoho-integration-overview
description: Plugin overview, capability map, and MANDATORY pre-execution checklist. Load this before invoking any zoho-integration tool.
---

# Zoho Payroll ↔ Zoho People Integration Plugin

This plugin lets the agent connect to Zoho Payroll and Zoho People, sync employees, manage field mappings, run health checks, and operate Leave & Attendance flows — all via the `mcp__zoho-integration__*` tools.

## MANDATORY pre-execution checklist

Before invoking ANY tool from this plugin in a new session, you MUST ask the user for and confirm three values, even if a saved config already exists. Do NOT silently reuse cached credentials.

1. **Zoho MCP URL** — from https://www.zoho.com/mcp (single URL covering Payroll + People).
2. **Zoho People organization ID.**
3. **Zoho Payroll organization ID.**

After the user supplies all three, call `connect_zoho` with `zoho_mcp_url`, `people_org_id`, `payroll_org_id`. Only then proceed to other tools.

If the user later wants to use REST-only tools (dashboard, sync history, preferences, field mappings), also call `configure_people_api_credentials` with the Payroll org ID and an OAuth access token (scope `ZohoPayroll.settings.READ,UPDATE,CREATE` from https://api-console.zoho.com).

## Tool map

**Connection:** `connect_zoho`, `disconnect_zoho`, `connection_status`

**Employee sync (MCP):** `list_employees`, `get_employee_details`, `sync_employee`, `sync_all_employees`, `check_integration_health`, `fix_sync_issues`

**People integration management (REST):** `configure_people_api_credentials`, `get_people_integration_dashboard`, `trigger_people_sync`, `get_people_sync_history`, `list_people_sync_errors`, `get_people_integration_preferences`, `update_people_integration_preferences`, `get_people_field_mappings`, `get_people_field_mapping_edit_data`, `update_people_employee_field_mappings`

**Leave & Attendance (REST):** `get_leave_attendance_details`, `trigger_leave_attendance_sync`, `get_leave_attendance_settings`, `get_leave_attendance_sync_summary`, `list_leave_attendance_sync_errors`, `get_attendance_settings`, `get_employee_attendance`, `list_attendance_regularizations`

## Companion skills

Other skills in this plugin cover specific workflows:
- `setup-integration` — first-time setup walkthrough
- `guided-people-sync` — step-by-step sync with field-mapping guidance
- `setup-leave-attendance` — LOP & attendance configuration
- `mandatory-fields-checker` — verify required fields before sync
- `custom-field-mapping` — map custom Payroll fields to People fields
- `integration-health-check` — diagnose sync gaps
- `diagnose-employee-sync` — investigate per-employee failures
- `diagnose-lop-sync` — LOP-specific failure triage
- `troubleshoot-connection` — fix connection issues

Defer to those skills when the user's request matches.
