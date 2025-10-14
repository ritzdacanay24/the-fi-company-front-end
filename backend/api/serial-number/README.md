# Serial Number Generator - Quick Setup Guide

## Database Setup

Run this SQL migration to create the required tables:

```bash
mysql -u your_username -p your_database < database/migrations/create_serial_numbers_table.sql
```

Or execute the SQL file manually in phpMyAdmin/MySQL Workbench.

## Tables Created

1. **generated_serial_numbers** - Main table storing all generated serial numbers
2. **serial_number_templates** - Templates for different serial types (Product, Asset, Work Order, etc.)
3. **v_generated_serial_numbers** - View for easy querying with user names
4. **v_serial_number_templates** - View showing template usage statistics

## API Endpoint

**Location**: `backend/api/serial-number/index.php`

### Generate Batch
```javascript
POST /backend/api/serial-number/index.php
{
  "action": "generate_batch",
  "template_id": "PROD_001",
  "prefix": "PRD",
  "count": 10
}
```

### Get Templates
```javascript
GET /backend/api/serial-number/index.php?action=templates&include_inactive=false
```

### Get History
```javascript
GET /backend/api/serial-number/index.php?action=history&limit=100&template_id=PROD_001&status=available
```

### Mark as Used
```javascript
POST /backend/api/serial-number/index.php
{
  "action": "use_serial",
  "serial_number": "PRD12345678",
  "reference_id": "123",
  "reference_table": "work_orders",
  "notes": "Used for work order #123"
}
```

## Frontend Routes

- **Standalone Form**: `/standalone/serial-generator`
- **Public Forms Menu**: `/forms`
- **Report Page**: `/serial-number-report` (if exists)

## Default Templates

- **PROD_001**: Product Serial (PRD prefix)
- **ASSET_001**: Asset Tracking (AST prefix)
- **WO_001**: Work Order (WO prefix)
- **DEMO_001**: Demo Equipment (DEMO prefix)
- **OTHER_001**: Custom (no prefix - manual entry)

## Features

✅ Generate 1-100 serial numbers at once
✅ Auto-generated unique IDs (timestamp + random)
✅ Template-based prefixes
✅ Track usage status (available/used)
✅ Reference tracking (what/where used)
✅ Export to CSV
✅ Copy to clipboard
✅ Barcode support
✅ Full audit trail

## Quick Test

1. Run the SQL migration
2. Navigate to `/standalone/serial-generator`
3. Login with your credentials
4. Select a template
5. Enter quantity (1-100)
6. Click "Generate Serial Numbers"
7. View, copy, or export generated serials

Done! 🎉
