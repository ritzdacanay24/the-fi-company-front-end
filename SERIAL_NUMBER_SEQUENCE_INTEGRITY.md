# Serial Number Sequence Integrity Guide

## Overview
This document outlines the strict sequence enforcement for EyeFi, IGT, and UL Label serial numbers in the NEW category workflow, and the process for resolving sequence mismatches.

## Design Philosophy

### Why Strict Sequence?
- **Data Integrity**: Sequence represents actual inventory order
- **Audit Trail**: Prevents arbitrary changes that hide tracking issues
- **Root Cause Analysis**: Forces investigation of underlying problems
- **Prevents Cascading Errors**: One wrong manual selection won't throw off entire inventory

### Category Differences

#### NEW Category (Strict Sequence)
- ✅ Auto-populated from database in sequential order
- 🔒 **Read-only** - No manual editing allowed
- 📋 Sequence represents physical inventory order
- ⚠️ Mismatches require admin investigation

#### USED Category (Manual Entry)
- ✏️ Fully editable fields
- 📝 Users enter serial numbers manually
- 🆕 New serials automatically added to database
- 🔍 Can search existing serials or add new ones

---

## User Workflow

### Step 1: Review Auto-Populated Sequence
Users see the next N serials in sequence for:
- EyeFi Serial Numbers
- UL Label Numbers
- IGT Asset Numbers (if applicable)

### Step 2: Verify Physical Devices
Compare physical devices against system sequence:
- ✅ **Match**: Proceed to next step
- ❌ **Mismatch**: **STOP** and report to admin

### Step 3: Report Mismatch (If Found)
Contact supervisor/admin with:
- Expected serial (from system)
- Physical serial (on device)
- Row number/position
- Work order number
- Optional: Photo evidence

---

## Admin Resolution Process

### Step 1: Receive Mismatch Report
Gather information:
- Expected vs physical serial numbers
- Work order context
- User who discovered mismatch
- Location/bin information

### Step 2: Investigate Root Cause

#### Common Scenarios:

**A. Physical Inventory Wrong Order**
- **Issue**: Devices physically stored out of sequence
- **Resolution**: 
  - Physically reorganize inventory to match database sequence
  - Update location/bin tracking
  - Document reorganization
- **SQL Action**: None needed

**B. Database Sequence Wrong**
- **Issue**: Serial recorded incorrectly or status wrong
- **Resolution**:
  - Verify actual serial on device
  - Update database record
  - Document correction reason
- **SQL Example**:
  ```sql
  -- Update incorrect serial number
  UPDATE eyefi_serials 
  SET serial_number = 'CORRECT_SERIAL'
  WHERE serial_number = 'WRONG_SERIAL';
  
  -- Add audit note
  INSERT INTO serial_audit_log (serial_id, action, reason, admin_user)
  VALUES (123, 'correction', 'Receiving error - incorrect serial recorded', 'admin_username');
  ```

**C. Serial Already Consumed**
- **Issue**: Serial marked available but already assigned
- **Resolution**:
  - Find original assignment transaction
  - Update status to consumed
  - Investigate why status wasn't updated
- **SQL Example**:
  ```sql
  -- Mark as consumed
  UPDATE eyefi_serials 
  SET status = 'consumed', 
      consumed_date = GETDATE(),
      work_order = 'ORIGINAL_WO'
  WHERE serial_number = 'SERIAL123';
  
  -- Log the correction
  INSERT INTO serial_audit_log (serial_id, action, reason)
  VALUES (123, 'status_correction', 'Found already consumed in WO-456');
  ```

**D. Device Mislabeled During Receiving**
- **Issue**: Physical label doesn't match actual device
- **Resolution**:
  - Verify correct serial via other means (QR code, internal ID)
  - Re-label device if needed
  - Create/update correct serial record
- **SQL Example**:
  ```sql
  -- If completely new serial
  INSERT INTO eyefi_serials (serial_number, status, category, received_date, notes)
  VALUES ('ACTUAL_SERIAL', 'available', 'new', GETDATE(), 'Corrected from mislabeled device');
  ```

**E. Duplicate Serial Exists**
- **Issue**: Same serial number entered twice
- **Resolution**:
  - Identify which is correct record
  - Merge or delete duplicate
  - Fix references
- **SQL Example**:
  ```sql
  -- Find duplicates
  SELECT serial_number, COUNT(*) 
  FROM eyefi_serials 
  GROUP BY serial_number 
  HAVING COUNT(*) > 1;
  
  -- Delete incorrect duplicate after verifying
  DELETE FROM eyefi_serials WHERE id = <wrong_id>;
  ```

### Step 3: Document Resolution
Required documentation:
- Root cause identified
- Actions taken (SQL queries, physical changes)
- Date/time of resolution
- Admin user who resolved
- Preventive measures (if applicable)

### Step 4: Communicate Back to User
Inform user:
- Issue has been resolved
- Whether they can proceed or need to restart workflow
- Any process changes to prevent future occurrences

---

## Preventive Measures

### During Receiving
- ✅ Double-check serial numbers during data entry
- ✅ Use barcode scanning when possible
- ✅ Verify physical labels match database entry
- ✅ Take photos of received devices with serials visible

### During Storage
- ✅ Store devices in sequence order
- ✅ Use bin location tracking
- ✅ First-in-first-out (FIFO) methodology
- ✅ Regular inventory audits

### During Consumption
- ✅ Always consume from beginning of sequence
- ✅ Immediately mark as consumed in database
- ✅ Don't "cherry pick" serials out of order
- ✅ Transaction logging for all status changes

---

## Database Views for Admin Investigation

### View: Available Serials Sequence
```sql
CREATE VIEW v_available_eyefi_sequence AS
SELECT 
    id,
    serial_number,
    category,
    status,
    received_date,
    location_bin,
    ROW_NUMBER() OVER (ORDER BY received_date, id) as sequence_position
FROM eyefi_serials
WHERE status = 'available'
ORDER BY received_date, id;
```

### View: Serial Consumption History
```sql
CREATE VIEW v_serial_consumption_history AS
SELECT 
    es.serial_number,
    es.category,
    es.consumed_date,
    es.work_order,
    igt.asset_number as igt_asset,
    ul.ul_number,
    u.username as consumed_by
FROM eyefi_serials es
LEFT JOIN igt_assets igt ON es.id = igt.eyefi_serial_id
LEFT JOIN ul_labels ul ON es.ul_label_id = ul.id
LEFT JOIN users u ON es.consumed_by_user_id = u.id
WHERE es.status = 'consumed'
ORDER BY es.consumed_date DESC;
```

### Query: Find Sequence Gaps
```sql
-- Identify missing sequence positions
WITH numbered_serials AS (
    SELECT 
        id,
        serial_number,
        ROW_NUMBER() OVER (ORDER BY received_date, id) as seq_num
    FROM eyefi_serials
    WHERE status = 'available'
)
SELECT 
    seq_num,
    serial_number,
    LEAD(seq_num) OVER (ORDER BY seq_num) - seq_num - 1 as gap_size
FROM numbered_serials
WHERE LEAD(seq_num) OVER (ORDER BY seq_num) - seq_num > 1;
```

---

## Audit Logging

All sequence corrections should be logged:

```sql
CREATE TABLE serial_audit_log (
    id INT PRIMARY KEY IDENTITY,
    serial_id INT FOREIGN KEY REFERENCES eyefi_serials(id),
    action VARCHAR(50), -- 'correction', 'status_change', 'deletion', etc.
    old_value VARCHAR(255),
    new_value VARCHAR(255),
    reason TEXT,
    admin_user VARCHAR(100),
    timestamp DATETIME DEFAULT GETDATE()
);
```

### Example Log Entry
```sql
INSERT INTO serial_audit_log 
(serial_id, action, old_value, new_value, reason, admin_user)
VALUES 
(456, 'serial_correction', 'EF123ABC', 'EF124ABC', 
 'Receiving error - typo in original entry. Verified with physical device photo.', 
 'admin_username');
```

---

## Emergency Override Process

In rare cases where immediate production is critical:

### Temporary Skip (Not Recommended)
1. Admin creates temporary "skip" record
2. Document reason and approval
3. Schedule follow-up investigation
4. Update sequence after resolution

### Example:
```sql
-- Mark problematic serial for investigation
UPDATE eyefi_serials 
SET status = 'under_investigation',
    notes = 'Skipped in WO-789 due to production emergency. Investigate sequence position.'
WHERE serial_number = 'PROBLEM_SERIAL';

-- Log the skip
INSERT INTO serial_audit_log (serial_id, action, reason, admin_user)
VALUES (789, 'emergency_skip', 'Production emergency - WO-789 deadline. Scheduled for investigation.', 'supervisor_name');
```

---

## Training and Communication

### User Training
- Emphasize importance of sequence integrity
- Clear instructions: "If mismatch found, STOP and report"
- No blame culture - encourage reporting issues
- Regular refreshers on process

### Admin Training
- SQL query skills for investigation
- Root cause analysis methodology
- Documentation requirements
- Communication with production team

---

## Success Metrics

Track these to measure effectiveness:
- Number of sequence mismatches reported per month
- Average resolution time
- Root cause distribution (receiving errors, mislabeling, etc.)
- Preventive measure effectiveness
- User compliance with stop-and-report protocol

---

## Contact Information

**For Sequence Mismatches:**
- Primary: Supervisor [Name] - [Phone/Email]
- Secondary: Admin [Name] - [Phone/Email]
- Emergency: [Name] - [Phone/Email]

**Database Admin:**
- [Name] - [Phone/Email]

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-01-23 | 1.0 | Initial document | Development Team |

