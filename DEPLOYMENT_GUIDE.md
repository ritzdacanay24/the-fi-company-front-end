# Quick Start Guide - Serial Assignment Tracking

## 🚀 Deployment Steps

### 1. Run Database Migrations (5 minutes)

```bash
# Connect to your MySQL database
mysql -u your_user -p eyefidb

# Run migrations in order
SOURCE database/migrations/001_create_customer_types_table.sql;
SOURCE database/migrations/002_create_serial_assignments_table.sql;
SOURCE database/migrations/003_alter_eyefi_serial_numbers.sql;
SOURCE database/migrations/004_alter_ul_labels.sql;

# Verify
SELECT * FROM customer_types;
```

### 2. Test the Implementation (10 minutes)

#### Test in Browser Console:
```typescript
// Open your Angular app
// Open browser console (F12)

// Test SG bulk generation
const testAssignments = [{
  eyefi_serial_id: 1,
  serialNumber: '1001',
  ul_label_id: 1,
  ulNumber: 'UL100001',
  poNumber: 'TEST-001',
  property_site: 'Test Site',
  sgPartNumber: 'TEST-PN'
}];

// This should work
await this.sgAssetService.bulkCreate(testAssignments);
```

#### Verify in Database:
```sql
-- Check if serial was consumed
SELECT * FROM eyefi_serial_numbers WHERE id = 1;
-- is_consumed should be TRUE

-- Check assignment record
SELECT * FROM serial_assignments ORDER BY id DESC LIMIT 1;

-- Check generated asset
SELECT * FROM sgAssetGenerator ORDER BY id DESC LIMIT 1;
```

### 3. Monitor in Production

```sql
-- See available serials
SELECT COUNT(*) FROM eyefi_serial_numbers WHERE is_consumed = FALSE;

-- See recent assignments
SELECT * FROM serial_assignments ORDER BY consumed_at DESC LIMIT 10;

-- See consumption by user
SELECT consumed_by, COUNT(*) as total
FROM serial_assignments
WHERE DATE(consumed_at) = CURDATE()
GROUP BY consumed_by;
```

---

## 📋 What Changed

### ✅ Database
- **Added:** 2 new tables (`customer_types`, `serial_assignments`)
- **Modified:** 2 existing tables (added tracking columns)
- **Impact:** None on existing data

### ✅ Backend
- **Added:** `BaseAssetGenerator.php` (new base class)
- **Modified:** `SgAssetGenerator.php` (now extends base)
- **Modified:** `AgsSerialGenerator.php` (now extends base)
- **Impact:** Backward compatible - old methods still work

### ✅ Frontend
- **No changes needed** - already uses bulkCreate endpoints

---

## 🔧 Troubleshooting

### Issue: "Table customer_types doesn't exist"
**Solution:** Run migration 001
```sql
SOURCE database/migrations/001_create_customer_types_table.sql;
```

### Issue: "Column is_consumed doesn't exist"
**Solution:** Run migration 003 and 004
```sql
SOURCE database/migrations/003_alter_eyefi_serial_numbers.sql;
SOURCE database/migrations/004_alter_ul_labels.sql;
```

### Issue: "Class BaseAssetGenerator not found"
**Solution:** Check file path
```bash
# Verify file exists
ls -la backend/api/Quality/BaseAssetGenerator.php

# Check require_once path in SgAssetGenerator.php
# Should be: require_once __DIR__ . '/../BaseAssetGenerator.php';
```

### Issue: Serial numbers still being reused
**Solution:** Update your serial selection queries
```sql
-- Old query (can reuse serials)
SELECT * FROM eyefi_serial_numbers WHERE active = 1;

-- New query (only unconsumed)
SELECT * FROM eyefi_serial_numbers 
WHERE active = 1 AND is_consumed = FALSE;
```

---

## 📊 Key Queries

### Get Available Serials
```sql
SELECT * FROM eyefi_serial_numbers 
WHERE is_consumed = FALSE 
ORDER BY id ASC 
LIMIT 10;
```

### Get All Assignments for PO
```sql
SELECT 
    sa.*,
    ct.customer_name
FROM serial_assignments sa
JOIN customer_types ct ON sa.customer_type_id = ct.id
WHERE sa.po_number = 'YOUR-PO-NUMBER';
```

### Audit Trail
```sql
SELECT 
    consumed_at,
    consumed_by,
    eyefi_serial_number,
    generated_asset_number
FROM serial_assignments
WHERE consumed_by = 'USERNAME'
ORDER BY consumed_at DESC;
```

---

## 🎯 Next Steps

### To Add New Customer Type:

1. Add to database:
```sql
INSERT INTO customer_types 
(customer_code, customer_name, requires_asset_generation, asset_generation_class, asset_table_name)
VALUES ('newcustomer', 'New Customer', TRUE, 'NewCustomerGenerator', 'newCustomerAssets');
```

2. Create generator class (copy from SgAssetGenerator.php)
3. Create bulkCreate.php endpoint (copy from sg-asset/bulkCreate.php)
4. Done!

---

## 📞 Support

- **Documentation:** `docs/serial-assignment-tracking-implementation.md`
- **Rollback:** `database/migrations/999_rollback.sql`
- **Migrations:** `database/migrations/`

---

**Status:** ✅ Complete and Ready for Testing
