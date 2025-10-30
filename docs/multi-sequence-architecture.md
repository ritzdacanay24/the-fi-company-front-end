# Multi-Sequence Serial Number Architecture

## Overview

The EyeFi Serial Workflow manages **THREE TYPES of serial number sequences**:

1. **Universal Sequences** (Step 4) - Applied to ALL devices regardless of customer
   - EyeFi Serial Numbers
   - UL Label Numbers

2. **Customer-Specific Sequences** (Step 5) - Each customer has their OWN serial numbers
   - IGT Serial Numbers
   - Light & Wonder Serial Numbers  
   - AGS Serial Numbers
   - (Future customers...)

3. **Internal Tracking** - Database records linking everything together

---

## Serial Number Types Explained

### Type 1: Universal Sequences (Step 4)

These are **THE FI COMPANY's** internal serial numbers applied to every device:

```
Device #1: EF-2024-00100 + UL-2024-00050
Device #2: EF-2024-00101 + UL-2024-00051
Device #3: EF-2024-00102 + UL-2024-00052
```

**Characteristics:**
- ✅ Applied to ALL devices (IGT, Light & Wonder, AGS, etc.)
- ✅ Sequential and unique globally
- ✅ Used for internal tracking and safety compliance (UL)
- ✅ Reported/fixed in **Step 4**

---

### Type 2: Customer-Specific Sequences (Step 5)

Each customer has their **OWN serial number sequence**, completely separate from EyeFi/UL:

#### IGT Serial Numbers
```
Format: IGT-YYYY-XXXXX
Example: IGT-2024-00015

Database Table: igt_serial_sequence
Sequence: Independent from all other sequences
```

#### Light & Wonder (LW) Serial Numbers
```
Format: LW-YYYY-XXXXX
Example: LW-2024-00020

Database Table: sg_asset_sequence
Sequence: Independent from all other sequences
```

#### AGS Serial Numbers
```
Format: AGS-YYYY-XXXXX
Example: AGS-2024-00030

Database Table: ags_serial_sequence
Sequence: Independent from all other sequences
```

**Characteristics:**
- ✅ Each customer maintains SEPARATE sequence
- ✅ NOT related to EyeFi or UL numbers
- ✅ Customer's own identification system
- ✅ Reported/fixed in **Step 5** (per customer section)

---

## Complete Device Example

### Scenario: IGT Device #1

```
┌─────────────────────────────────────────────────┐
│ DEVICE PHYSICAL LABELS                          │
├─────────────────────────────────────────────────┤
│ EyeFi Serial:    EF-2024-00100                  │  ← Universal (Step 4)
│ UL Label:        UL-2024-00050                  │  ← Universal (Step 4)
│ IGT Serial:      IGT-2024-00015                 │  ← Customer-specific (Step 5)
└─────────────────────────────────────────────────┘
```

### Database Records

**Serial Number Assignment (Step 4):**
```sql
INSERT INTO serial_number_assignments (
    work_order_id,
    eyefi_serial_id,      -- Links to: eyefi_serial_sequence.id (EF-2024-00100)
    ul_label_id,          -- Links to: ul_sequence.id (UL-2024-00050)
    status
) VALUES (...);
```

**IGT Asset Assignment (Step 5):**
```sql
INSERT INTO igt_assets (
    work_order_id,
    eyefi_serial_id,      -- Reference to above
    ul_label_id,          -- Reference to above
    igt_serial_id,        -- Links to: igt_serial_sequence.id (IGT-2024-00015)
    status
) VALUES (...);
```

---

## Mismatch Reporting - What Gets Reported

### Step 4 Mismatch: EyeFi + UL

**What to Report:**
```
Row: 1
Expected EyeFi Serial: EF-2024-00100
Physical EyeFi Serial: EF-2024-00105  ❌ WRONG

Expected UL Label: UL-2024-00050
Physical UL Label: UL-2024-00055      ❌ WRONG
```

**When to Report:**
- Physical EyeFi serial doesn't match expected
- Physical UL label doesn't match expected

**Button Location:** Step 4, after EyeFi/UL assignment table

---

### Step 5 Mismatch: Customer Serials

**What to Report (IGT Example):**
```
Row: 1
Expected IGT Serial: IGT-2024-00015
Physical IGT Serial: IGT-2024-00020   ❌ WRONG

Reference Info (for context only):
  EyeFi Serial: EF-2024-00100
  UL Label: UL-2024-00050
```

**When to Report:**
- Physical **IGT serial** doesn't match expected
- Physical **Light & Wonder serial** doesn't match expected
- Physical **AGS serial** doesn't match expected

**Button Location:** Step 5, after customer-specific table (separate button per customer)

---

## Key Differences

### Reporting EyeFi/UL (Step 4) vs Customer Serials (Step 5)

| Aspect | Step 4 (EyeFi/UL) | Step 5 (Customer) |
|--------|-------------------|-------------------|
| **What's Reported** | EyeFi serial + UL label | Customer's own serial number |
| **Scope** | Universal (all devices) | Customer-specific only |
| **Example** | `EF-2024-00100` + `UL-2024-00050` | `IGT-2024-00015` |
| **Database** | `eyefi_serial_sequence` + `ul_sequence` | `igt_serial_sequence` (or sg/ags) |
| **Button** | One button (covers both) | Separate button per customer |
| **Modal Fields** | 2 expected + 2 physical | 1 expected + 1 physical + references |

---

## Workflow Sequence

### Complete Flow for IGT Work Order (Quantity: 3)

#### Step 1: Work Order
```
Enter: WO12345
```

#### Step 2: Customer Selection
```
Select: IGT
```

#### Step 3: Configuration
```
Quantity: 3
Category: NEW
```

#### Step 4: Assign Universal Serials
**System auto-assigns from universal sequences:**
```
Row 1: EF-2024-00100 + UL-2024-00050
Row 2: EF-2024-00101 + UL-2024-00051
Row 3: EF-2024-00102 + UL-2024-00052
```
✅ **Verify these match physical devices**  
❌ **If mismatch:** Click "Report Sequence Mismatch" → Report EyeFi/UL

#### Step 5: Assign IGT Serials
**System auto-assigns from IGT sequence:**
```
Row 1: IGT-2024-00015  (+ EF-2024-00100 + UL-2024-00050)
Row 2: IGT-2024-00016  (+ EF-2024-00101 + UL-2024-00051)
Row 3: IGT-2024-00017  (+ EF-2024-00102 + UL-2024-00052)
```
✅ **Verify IGT serials match physical devices**  
❌ **If mismatch:** Click "Report IGT Serial Number Mismatch" → Report IGT serial

---

## Why Separate Sequences?

### Business Requirements

**Universal Sequences (EyeFi/UL):**
- The Fi Company needs to track ALL devices
- UL certification requires unique labels per device
- Warranty and support tracking
- Manufacturing quality control

**Customer Sequences (IGT/LW/AGS):**
- Customers have their own asset management systems
- Customer contracts may specify serial number formats
- Customer's warranty and support tracking
- Integration with customer's inventory systems

### Technical Benefits

✅ **Independence:** Customer sequences don't affect each other  
✅ **Scalability:** Add new customers without impacting existing sequences  
✅ **Flexibility:** Each customer can have different formats/rules  
✅ **Clarity:** Mismatches are reported against the correct sequence  

---

## Database Schema (Simplified)

```sql
-- Universal Sequences
CREATE TABLE eyefi_serial_sequence (
    id INT PRIMARY KEY,
    serial_number VARCHAR(50) UNIQUE,  -- EF-2024-00100
    status VARCHAR(20)  -- 'available', 'assigned', 'consumed'
);

CREATE TABLE ul_sequence (
    id INT PRIMARY KEY,
    ul_number VARCHAR(50) UNIQUE,      -- UL-2024-00050
    status VARCHAR(20)
);

-- Customer-Specific Sequences
CREATE TABLE igt_serial_sequence (
    id INT PRIMARY KEY,
    serial_number VARCHAR(50) UNIQUE,  -- IGT-2024-00015
    status VARCHAR(20)
);

CREATE TABLE sg_asset_sequence (
    id INT PRIMARY KEY,
    asset_number VARCHAR(50) UNIQUE,   -- LW-2024-00020
    status VARCHAR(20)
);

CREATE TABLE ags_serial_sequence (
    id INT PRIMARY KEY,
    serial_number VARCHAR(50) UNIQUE,  -- AGS-2024-00030
    status VARCHAR(20)
);

-- Assignment Tables
CREATE TABLE serial_number_assignments (
    id INT PRIMARY KEY,
    work_order_id INT,
    eyefi_serial_id INT,               -- FK to eyefi_serial_sequence
    ul_label_id INT,                   -- FK to ul_sequence
    created_at DATETIME
);

CREATE TABLE igt_assets (
    id INT PRIMARY KEY,
    work_order_id INT,
    eyefi_serial_id INT,               -- FK to eyefi_serial_sequence
    ul_label_id INT,                   -- FK to ul_sequence
    igt_serial_id INT,                 -- FK to igt_serial_sequence
    created_at DATETIME
);

-- Similar for sg_assets, ags_assets, etc.

-- Mismatch Reports
CREATE TABLE eyefi_serial_mismatch_reports (
    id INT PRIMARY KEY,
    work_order_number VARCHAR(50),
    step VARCHAR(20),                  -- 'step4' or 'step5-igt'
    
    -- Step 4 fields
    expected_eyefi_serial VARCHAR(50),
    physical_eyefi_serial VARCHAR(50),
    expected_ul_number VARCHAR(50),
    physical_ul_number VARCHAR(50),
    
    -- Step 5 fields
    expected_customer_serial VARCHAR(50),  -- IGT-2024-00015
    physical_customer_serial VARCHAR(50),  -- IGT-2024-00020
    customer_type VARCHAR(20),             -- 'igt', 'sg', 'ags'
    
    -- Reference fields
    reference_eyefi_serial VARCHAR(50),
    reference_ul_number VARCHAR(50),
    
    status VARCHAR(20)
);
```

---

## Common Scenarios

### Scenario 1: All Serials Correct
```
✅ Step 4: EyeFi and UL match expected
✅ Step 5: IGT serial matches expected
Action: Continue workflow normally
```

### Scenario 2: EyeFi Mismatch, IGT Correct
```
❌ Step 4: EyeFi serial doesn't match
✅ Step 5: IGT serial matches expected
Action: Report in Step 4, admin fixes EyeFi assignment
```

### Scenario 3: EyeFi Correct, IGT Mismatch
```
✅ Step 4: EyeFi and UL match expected
❌ Step 5: IGT serial doesn't match
Action: Report in Step 5 (IGT section), admin fixes IGT assignment
```

### Scenario 4: Both Mismatch
```
❌ Step 4: EyeFi serial doesn't match
❌ Step 5: IGT serial doesn't match
Action: Report BOTH separately (one in Step 4, one in Step 5)
```

---

## Best Practices

### For Users

**Do:**
- ✅ Verify EyeFi/UL in Step 4 before proceeding
- ✅ Verify customer serials in Step 5 before completing
- ✅ Report mismatches immediately when detected
- ✅ Take photos of physical labels when reporting
- ✅ Report each mismatch type separately (Step 4 vs Step 5)

**Don't:**
- ❌ Mix up EyeFi serial with customer serial
- ❌ Report IGT serial mismatch using Step 4 button
- ❌ Report EyeFi serial mismatch using Step 5 button
- ❌ Continue workflow if ANY serial doesn't match

### For Admins

**Investigation Checklist:**
- [ ] Identify which sequence has the mismatch (EyeFi/UL/Customer)
- [ ] Verify physical device location
- [ ] Check database for duplicate assignments
- [ ] Review sequence consumption logs
- [ ] Contact customer if customer serial is involved
- [ ] Update correct database records
- [ ] Generate replacement labels if needed
- [ ] Document root cause

---

## Future Customers

### Adding New Customer with Serial Numbers

**Example: Adding "Aristocrat" customer**

1. **Create sequence table:**
```sql
CREATE TABLE aristocrat_serial_sequence (
    id INT PRIMARY KEY,
    serial_number VARCHAR(50) UNIQUE,  -- ART-2024-00001
    status VARCHAR(20)
);
```

2. **Create asset table:**
```sql
CREATE TABLE aristocrat_assets (
    id INT PRIMARY KEY,
    work_order_id INT,
    eyefi_serial_id INT,
    ul_label_id INT,
    aristocrat_serial_id INT,
    created_at DATETIME
);
```

3. **Update workflow:**
- Add "Aristocrat" to customer dropdown (Step 2)
- Add Aristocrat table section in Step 5
- Add "Report Aristocrat Serial Mismatch" button
- Add 'step5-aristocrat' to mismatch modal

4. **Update mismatch model:**
```typescript
step?: 'step4' | 'step5-igt' | 'step5-sg' | 'step5-ags' | 'step5-aristocrat';
customerType?: 'igt' | 'sg' | 'ags' | 'aristocrat';
```

**That's it!** The architecture supports unlimited customers with their own serial sequences.

---

## Related Documentation

- [Mismatch Report System](../MISMATCH_REPORT_SYSTEM.md)
- [Multi-Customer Serial System](./multi-customer-serial-system.md)
- [IGT Mismatch Reporting Guide](./igt-mismatch-reporting-guide.md)
- [Serial Number Sequence Integrity](../SERIAL_NUMBER_SEQUENCE_INTEGRITY.md)

---

*Last Updated: October 2025*  
*Version: 1.0*
