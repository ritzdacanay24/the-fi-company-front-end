# IGT Asset Number Mismatch Reporting Guide

## Overview

When working with IGT devices in the EyeFi Serial Workflow, the system auto-assigns **IGT asset numbers** in strict sequence for NEW category items. If the physical IGT asset number on a device doesn't match the system's expected sequence, you can report the mismatch.

---

## What Gets Reported

### For IGT Devices (Step 5)

When you click **"Report IGT Asset Mismatch"** in Step 5, you're reporting a mismatch between:

✅ **Expected IGT Asset Number** (from system sequence)
- Example: `IGT-2024-00015`
- This is what the system assigned from the IGT sequence table
- Shown as "System Expected" in the modal

❌ **Physical IGT Asset Number** (what's on the device)
- Example: `IGT-2024-00020` (wrong number)
- This is what's actually printed on the physical device label
- You manually enter this in the "Physical Device" field

📋 **EyeFi Serial (Reference)**
- Example: `EF-2024-12345`
- Included for device tracking purposes
- Helps admin identify which specific device has the issue

---

## Step-by-Step Reporting Process

### 1. Navigate to Step 5 (Generate Assets)

In the workflow, proceed to Step 5 where IGT assets are displayed.

### 2. Verify IGT Asset Numbers

Look at the IGT asset numbers table:

| # | EyeFi Serial | UL Label | IGT Asset Number | Status |
|---|--------------|----------|------------------|---------|
| 1 | EF-2024-00100 | UL-2024-00050 | **IGT-2024-00015** | ✓ Pre-selected |
| 2 | EF-2024-00101 | UL-2024-00051 | **IGT-2024-00016** | ✓ Pre-selected |
| 3 | EF-2024-00102 | UL-2024-00052 | **IGT-2024-00017** | ✓ Pre-selected |

### 3. Notice Mismatch

You physically inspect the device and see:
- **Row 2** device has IGT label: `IGT-2024-00020` ❌
- But system expected: `IGT-2024-00016` ✅
- **This is a mismatch!**

### 4. Click "Report IGT Asset Mismatch"

In the red alert box below the table:

```
┌─────────────────────────────────────────────────┐
│ ⚠️ IGT Asset Number Mismatch?                   │
│                                                  │
│ If the physical IGT asset numbers don't match   │
│ the auto-selected sequence above, report it     │
│ immediately.                                     │
│                                                  │
│ [📋 Report IGT Asset Mismatch]                  │
└─────────────────────────────────────────────────┘
```

### 5. Fill Out the Report

The modal opens with:

**Reporting Context:**
```
Reporting Mismatch For: [IGT Asset Numbers]
```

**Row Selection:**
```
Row Number with Mismatch: [ Select row 2 ]
```

**Expected vs Physical Comparison:**
```
System Expected                 | Physical Device
------------------------------- | ------------------------------
IGT Asset Number:               | Physical IGT Asset Number:
IGT-2024-00016                  | [IGT-2024-00020________]
                                |
EyeFi Serial (reference):       |
EF-2024-00101                   |
```

**Additional Info:**
- Notes: "Found device with IGT-2024-00020 instead of expected 00016"
- Photo: (Optional) Upload picture of the label
- Contact: Select how admin can reach you

### 6. Submit Report

Click **"Submit Mismatch Report"** and admin team is notified.

---

## What Happens After Submission

### Immediate Actions
1. ✅ Report saved to database with unique ID
2. 📧 Email sent to admin team
3. 🔔 Report visible in admin dashboard
4. ✋ **Production paused** - Don't continue until admin resolves

### Admin Investigation
Admin will investigate potential causes:
- **Receiving Error:** IGT asset was received out of order
- **Mislabeling:** Label printing error at IGT
- **Already Consumed:** IGT asset was used on previous work order
- **Physical Wrong Order:** Devices physically shuffled
- **Duplicate:** Duplicate label printed
- **Other:** Unknown root cause

### Resolution
Admin will:
1. Verify physical device location
2. Check database records
3. Contact IGT if necessary
4. Update database to reflect correct mapping
5. Generate corrective labels if needed
6. Mark report as "Resolved"

---

## Key Differences from Step 4

### Step 4: EyeFi Serials + UL Labels
```
Report includes:
- Expected EyeFi Serial
- Physical EyeFi Serial
- Expected UL Label
- Physical UL Label
```

### Step 5: IGT Asset Numbers
```
Report includes:
- Expected IGT Asset Number    ← Primary focus
- Physical IGT Asset Number    ← What you enter
- EyeFi Serial (reference)     ← For tracking only
```

---

## Example Scenarios

### Scenario 1: Out of Sequence
**Expected:** `IGT-2024-00015`, `IGT-2024-00016`, `IGT-2024-00017`  
**Physical:** `IGT-2024-00015`, `IGT-2024-00020`, `IGT-2024-00017`  
**Action:** Report row 2, enter `IGT-2024-00020` as physical

### Scenario 2: Skipped Numbers
**Expected:** `IGT-2024-00025`, `IGT-2024-00026`, `IGT-2024-00027`  
**Physical:** `IGT-2024-00025`, `IGT-2024-00027`, `IGT-2024-00028`  
**Action:** Report row 2, note that 00026 was skipped

### Scenario 3: Wrong Customer Prefix
**Expected:** `IGT-2024-00030`  
**Physical:** `LW-2024-00030` (Light & Wonder label)  
**Action:** Report mismatch, note wrong customer asset type

---

## Best Practices

### ✅ Do:
- Verify IGT asset numbers before completing workflow
- Report mismatches immediately when discovered
- Include clear photos of physical labels
- Double-check row number selection
- Add detailed notes about what you observed

### ❌ Don't:
- Continue workflow if mismatch detected
- Manually "fix" database records
- Try to relabel devices yourself
- Ignore mismatches "to save time"
- Report without verifying physical device first

---

## FAQ

**Q: What if I'm not sure if it's a mismatch?**  
A: Report it! Better to investigate than risk incorrect tracking.

**Q: Can I edit the IGT asset number directly?**  
A: No (for NEW category). This prevents accidental data corruption. Report mismatch instead.

**Q: What if multiple devices have mismatches?**  
A: Submit separate reports for each mismatched row.

**Q: How long does admin investigation take?**  
A: Typically 15-30 minutes. You'll be notified via your selected contact method.

**Q: Does this apply to USED category?**  
A: No. USED category allows manual entry since you're entering existing asset numbers.

**Q: What about Light & Wonder (SG) or AGS assets?**  
A: Same process! Each customer type has its own "Report Mismatch" button in Step 5.

---

## Database Impact

### Mismatch Report Record
```sql
INSERT INTO eyefi_serial_mismatch_reports (
    work_order_number,      -- WO12345
    category,                -- 'new'
    step,                    -- 'step5-igt'
    customer_type,           -- 'igt'
    row_index,               -- 1 (zero-based)
    row_number,              -- 2 (display)
    expected_customer_asset, -- 'IGT-2024-00016'
    physical_customer_asset, -- 'IGT-2024-00020'
    expected_eyefi_serial,   -- 'EF-2024-00101' (reference)
    notes,                   -- 'Found wrong IGT label'
    photo_base64,            -- (optional)
    status                   -- 'reported'
)
```

### No Automatic Changes
The mismatch report does **NOT** automatically:
- Change database sequences
- Consume different IGT assets
- Update work order records

Admin must manually resolve after investigation.

---

## Related Documentation

- [Multi-Customer Serial System](./multi-customer-serial-system.md)
- [Mismatch Report System](../MISMATCH_REPORT_SYSTEM.md)
- [Serial Number Sequence Integrity](../SERIAL_NUMBER_SEQUENCE_INTEGRITY.md)
- [EyeFi Serial Workflow Guide](./eyefi-serial-workflow-guide.md)

---

## Support

**Immediate Issues:** Contact production supervisor  
**Mismatch Reports:** System automatically notifies admin  
**Technical Support:** IT Help Desk  
**IGT Vendor Issues:** Operations Manager → IGT Account Rep  

---

*Last Updated: October 2025*  
*Version: 1.0*
