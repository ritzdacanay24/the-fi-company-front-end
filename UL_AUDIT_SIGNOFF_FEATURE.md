# UL New Audit Sign-Off Feature

## Overview
This feature allows auditors to select and sign off on UL New label audits, creating a formal record of quality control inspections.

## Features

### 1. Audit Selection
- View all UL New items in AG Grid table
- Multi-select items using checkboxes
- Filter by date range
- Display key information: UL Number, Category, EyeFi Serial, Part Number, Work Order

### 2. Sign-Off Process
- Select items to audit
- Provide audit information:
  - Audit Date
  - Auditor Name
  - Electronic Signature
  - Optional Notes
- Submit sign-off creates permanent record

### 3. Audit History
- View all past audit sign-offs
- See details: Date, Auditor, Items Count, UL Numbers
- Export individual audit reports

## Database Setup

### Migration
Run the migration to create the audit sign-off table:

```sql
SOURCE database/migrations/create_ul_audit_signoffs_table.sql;
```

### Table: `ul_audit_signoffs`
```sql
- id: Primary key
- audit_date: Date of audit
- auditor_name: Name of auditor
- auditor_signature: Electronic signature
- items_audited: Count of items
- ul_numbers: JSON array of UL numbers
- notes: Optional notes
- created_at, updated_at: Timestamps
```

## API Endpoints

### Get Audit Signoffs
```http
GET /backend/api/serial-assignments/index.php?action=get_audit_signoffs
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "audit_date": "2025-12-22",
      "auditor_name": "John Doe",
      "auditor_signature": "John Doe",
      "items_audited": 5,
      "ul_numbers": ["UL001", "UL002", ...],
      "notes": "Audit notes here"
    }
  ]
}
```

### Submit Audit Signoff
```http
POST /backend/api/serial-assignments/index.php
Content-Type: application/json

{
  "action": "submit_audit_signoff",
  "audit_date": "2025-12-22",
  "auditor_name": "John Doe",
  "auditor_signature": "John Doe",
  "items_audited": 5,
  "ul_numbers": ["UL001", "UL002", "UL003", "UL004", "UL005"],
  "notes": "All items passed inspection"
}
```

## Frontend Components

### Component Location
```
src/app/features/ul-audit-signoff/
├── ul-audit-signoff.component.ts
├── ul-audit-signoff.component.html
└── ul-audit-signoff.component.scss
```

### Service Methods Added
In `SerialAssignmentsService`:
- `getAuditSignoffs()` - Fetch all audit history
- `submitAuditSignoff(signoff)` - Submit new sign-off

## Usage

### For Auditors
1. Navigate to UL Audit Sign-Off page
2. Review UL New items in the grid
3. Select items you have audited (checkbox selection)
4. Click "Sign Off Audit" button
5. Fill in audit information:
   - Your name
   - Electronic signature (type your name)
   - Optional notes
6. Click "Submit Sign-Off"

### For Management
1. Click "Audit History" button
2. Review past audits
3. Export individual reports as needed

## Export Format
Audit reports export as text files with format:
```
UL NEW AUDIT SIGN-OFF REPORT
============================

Audit Date: 12/22/2025
Auditor: John Doe
Signature: John Doe
Items Audited: 5

UL Numbers Audited:
UL001
UL002
UL003
UL004
UL005

Notes:
All items passed inspection
```

## Integration Points

### With Serial Assignments
- Fetches UL New items from `vw_all_consumed_serials` view
- Filters for `ul_category = 'New'`
- Shows only items with UL numbers

### Security
- Electronic signature required
- Audit records are immutable (no delete/edit)
- Timestamped for audit trail

## Future Enhancements
- [ ] Print formatted audit reports
- [ ] Email notifications to stakeholders
- [ ] Integration with quality management system
- [ ] Statistical analysis of audit trends
- [ ] Automated compliance reporting
