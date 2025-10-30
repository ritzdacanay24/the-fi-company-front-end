# Multi-Customer Serial Number System

## Overview

The EyeFi serial workflow is designed to handle **multiple customers** with independent serial number sequences for each customer type. The system supports:

1. **EyeFi Serials** - Universal across all devices (Step 4)
2. **UL Labels** - Universal safety certification labels (Step 4)
3. **Customer-Specific Asset Numbers** - Independent sequences per customer (Step 5)
   - IGT (International Game Technology)
   - Light & Wonder (formerly Scientific Games)
   - AGS (American Gaming Systems)
   - *Extensible for new customers*

---

## Architecture

### Serial Number Types

```typescript
// Universal Sequences (All Customers)
EyeFi Serial:  EF-2024-00001, EF-2024-00002, ...
UL Labels:     UL-2024-00001, UL-2024-00002, ...

// Customer-Specific Sequences
IGT:           IGT-2024-00001, IGT-2024-00002, ...
Light&Wonder:  LW-2024-00001, LW-2024-00002, ...
AGS:           AGS-2024-00001, AGS-2024-00002, ...
```

### Database Schema

**Customer Configuration Table:**
```sql
CREATE TABLE customer_types (
    id INT PRIMARY KEY IDENTITY(1,1),
    customer_code VARCHAR(10) UNIQUE NOT NULL,  -- 'igt', 'sg', 'ags'
    customer_name VARCHAR(100) NOT NULL,         -- 'IGT', 'Light & Wonder', 'AGS'
    prefix VARCHAR(10) NOT NULL,                 -- 'IGT', 'LW', 'AGS'
    sequence_format VARCHAR(50) NOT NULL,        -- '{PREFIX}-{YEAR}-{SEQUENCE:5}'
    current_sequence INT DEFAULT 0,
    active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);

-- Seed data
INSERT INTO customer_types (customer_code, customer_name, prefix, sequence_format)
VALUES 
    ('igt', 'IGT (International Game Technology)', 'IGT', '{PREFIX}-{YEAR}-{SEQUENCE:5}'),
    ('sg', 'Light & Wonder', 'LW', '{PREFIX}-{YEAR}-{SEQUENCE:5}'),
    ('ags', 'AGS (American Gaming Systems)', 'AGS', '{PREFIX}-{YEAR}-{SEQUENCE:5}');
```

**Customer Asset Sequence Table:**
```sql
CREATE TABLE customer_asset_sequences (
    id INT PRIMARY KEY IDENTITY(1,1),
    customer_type_id INT NOT NULL,
    asset_number VARCHAR(50) UNIQUE NOT NULL,
    year INT NOT NULL,
    sequence_number INT NOT NULL,
    status VARCHAR(20) DEFAULT 'available',  -- 'available', 'assigned', 'consumed'
    work_order_id INT,
    assigned_date DATETIME,
    consumed_date DATETIME,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (customer_type_id) REFERENCES customer_types(id)
);

CREATE INDEX idx_customer_asset_status ON customer_asset_sequences(customer_type_id, status, year, sequence_number);
```

---

## How It Works

### Step 4: Universal Sequences
All devices receive **EyeFi serials** and **UL labels** regardless of customer:
- Generated from `eyefi_serial_sequence` table
- Generated from `ul_sequence` table
- **Strict sequence** - no manual editing
- Consumed immediately upon generation

### Step 5: Customer-Specific Assets
Devices receive **customer asset numbers** based on work order customer type:
- Looked up from `customer_asset_sequences` table filtered by `customer_type_id`
- Each customer maintains independent sequence
- **Strict sequence** - no manual editing
- Consumed immediately upon generation

### Sequence Integrity
All three serial types (EyeFi, UL, Customer Asset) enforce **strict sequence integrity**:
- Users cannot edit assigned numbers
- System auto-populates from next available sequence
- If physical device doesn't match: **Report Mismatch** instead of editing
- Admin investigates root cause and resolves

---

## Adding New Customers

### Step 1: Add Customer Configuration

**Database:**
```sql
INSERT INTO customer_types (customer_code, customer_name, prefix, sequence_format, active)
VALUES ('aristoc', 'Aristocrat Technologies', 'ART', '{PREFIX}-{YEAR}-{SEQUENCE:5}', 1);
```

**Application (Optional - if not using database-driven):**
```typescript
// src/app/models/customer-types.ts
export const CUSTOMER_TYPES = {
  igt: { code: 'igt', name: 'IGT', prefix: 'IGT', color: 'success' },
  sg: { code: 'sg', name: 'Light & Wonder', prefix: 'LW', color: 'warning' },
  ags: { code: 'ags', name: 'AGS', prefix: 'AGS', color: 'danger' },
  aristoc: { code: 'aristoc', name: 'Aristocrat', prefix: 'ART', color: 'purple' }
};
```

### Step 2: Pre-Generate Asset Sequence

```sql
-- Generate first batch of Aristocrat asset numbers
DECLARE @customer_id INT = (SELECT id FROM customer_types WHERE customer_code = 'aristoc');
DECLARE @year INT = YEAR(GETDATE());
DECLARE @counter INT = 1;

WHILE @counter <= 100
BEGIN
    INSERT INTO customer_asset_sequences (
        customer_type_id, 
        asset_number, 
        year, 
        sequence_number, 
        status
    )
    VALUES (
        @customer_id,
        'ART-' + CAST(@year AS VARCHAR) + '-' + RIGHT('00000' + CAST(@counter AS VARCHAR), 5),
        @year,
        @counter,
        'available'
    );
    SET @counter = @counter + 1;
END
```

### Step 3: Update UI (If Needed)

**Mismatch Report Modal:**
```html
<!-- Add badge for new customer -->
<span class="ms-2" *ngIf="mismatchReport.step === 'step5-aristoc'">
  <span class="badge bg-purple">Aristocrat Assets</span>
</span>
```

**Step 5 Asset Table:**
```html
<!-- System automatically handles new customers if using database-driven approach -->
<!-- No code changes needed if using dynamic customer lookup -->
```

### Step 4: Test End-to-End

1. Create work order with new customer type
2. Navigate to Step 5
3. Verify asset numbers appear with correct prefix
4. Verify sequence increments properly
5. Test mismatch reporting for new customer
6. Verify database records created correctly

---

## Mismatch Reporting Per Customer

### Coverage

The mismatch reporting system handles **all serial types** for **all customers**:

| Step   | Serial Type          | Customers       | Report Button Location |
|--------|---------------------|-----------------|----------------------|
| Step 4 | EyeFi + UL          | All (Universal) | After serials table  |
| Step 5 | IGT Asset Numbers   | IGT only        | After IGT table      |
| Step 5 | LW Asset Numbers    | Light&Wonder    | After LW table       |
| Step 5 | AGS Asset Numbers   | AGS only        | After AGS table      |
| Step 5 | *New Customer*      | *Extensible*    | *Auto-added*         |

### How It Works

**Modal Context Detection:**
```typescript
openMismatchReportModal(step: string) {
  this.mismatchReport = {
    step: step,  // 'step4', 'step5-igt', 'step5-sg', 'step5-ags'
    category: this.category,
    workOrderNumber: this.workOrder.number,
    reportedBy: this.currentUser.name,
    // ...
  };
  
  // Modal automatically shows correct fields based on step
  this.modalService.open(this.mismatchReportModal, { size: 'lg' });
}
```

**Dynamic Field Display:**
- `step === 'step4'` → Show EyeFi + UL comparison
- `step.startsWith('step5')` → Show Customer Asset comparison
- Modal adapts to customer type automatically

**Backend Handling:**
```php
// backend/api/eyefi-serial-mismatch.php
function submitReport($data) {
    // Handles all serial types
    $fields = [
        'step' => $data['step'],
        'expected_eyefi_serial' => $data['expectedEyefiSerial'] ?? null,
        'expected_ul_number' => $data['expectedUlNumber'] ?? null,
        'expected_customer_asset' => $data['expectedCustomerAsset'] ?? null,
        'physical_eyefi_serial' => $data['physicalEyefiSerial'] ?? null,
        'physical_ul_number' => $data['physicalUlNumber'] ?? null,
        'physical_customer_asset' => $data['physicalCustomerAsset'] ?? null,
        'customer_type' => $data['customerType'] ?? null,
        // ...
    ];
    // Inserts regardless of customer type
}
```

---

## Database-Driven vs Code-Based

### Recommended: Database-Driven

**Advantages:**
✅ Add new customers without code deployment  
✅ Admins can configure customers via admin panel  
✅ Customer-specific settings (prefix, format, etc.)  
✅ Supports per-customer business rules  
✅ Easy to disable/enable customers  

**Implementation:**
```typescript
// Service fetches customers from API
getCustomerTypes(): Observable<CustomerType[]> {
  return this.http.get<CustomerType[]>('/api/customer-types');
}

// Component loads dynamically
ngOnInit() {
  this.customerService.getCustomerTypes().subscribe(customers => {
    this.availableCustomers = customers.filter(c => c.active);
  });
}
```

### Alternative: Code-Based

**When to Use:**
- Customer list changes very rarely
- Need compile-time type safety
- Simpler deployment (no DB migrations)

**Implementation:**
```typescript
// models/customer-types.ts
export enum CustomerCode {
  IGT = 'igt',
  SG = 'sg',
  AGS = 'ags'
}

export const CUSTOMER_CONFIG: Record<CustomerCode, CustomerType> = {
  [CustomerCode.IGT]: { /* ... */ },
  [CustomerCode.SG]: { /* ... */ },
  [CustomerCode.AGS]: { /* ... */ }
};
```

---

## New Customer Onboarding Checklist

### Pre-Launch (1 week before)
- [ ] Add customer to `customer_types` table
- [ ] Define prefix and sequence format
- [ ] Pre-generate initial asset number batch (100-500 numbers)
- [ ] Configure customer-specific business rules (if any)
- [ ] Update mismatch report modal badges (if code-based)
- [ ] Test sequence generation in dev/staging

### Launch Day
- [ ] Verify customer appears in work order customer dropdown
- [ ] Create test work order for new customer
- [ ] Verify Step 5 shows customer-specific section
- [ ] Test asset number auto-population
- [ ] Test mismatch reporting for new customer
- [ ] Verify database records created correctly
- [ ] Monitor for any errors

### Post-Launch (1 week after)
- [ ] Review sequence consumption rate
- [ ] Pre-generate more numbers if needed
- [ ] Check for any mismatch reports
- [ ] Gather user feedback
- [ ] Document any customer-specific quirks

---

## Sequence Management

### Monitoring

**Check Available Numbers:**
```sql
SELECT 
    ct.customer_name,
    COUNT(*) as available_count,
    MIN(sequence_number) as next_available,
    MAX(sequence_number) as highest_generated
FROM customer_asset_sequences cas
JOIN customer_types ct ON cas.customer_type_id = ct.id
WHERE cas.status = 'available'
    AND cas.year = YEAR(GETDATE())
GROUP BY ct.customer_name;
```

**Alert Threshold:**
```sql
-- Alert if any customer has < 50 available numbers
SELECT customer_name
FROM customer_types ct
WHERE (
    SELECT COUNT(*) 
    FROM customer_asset_sequences 
    WHERE customer_type_id = ct.id 
        AND status = 'available'
        AND year = YEAR(GETDATE())
) < 50;
```

### Auto-Generation

**Scheduled Job (Daily):**
```sql
-- Auto-generate numbers to maintain 100 available per customer
CREATE PROCEDURE sp_maintain_customer_sequences
AS
BEGIN
    DECLARE @customer_id INT, @current_max INT, @year INT;
    
    SET @year = YEAR(GETDATE());
    
    DECLARE customer_cursor CURSOR FOR
    SELECT id FROM customer_types WHERE active = 1;
    
    OPEN customer_cursor;
    FETCH NEXT FROM customer_cursor INTO @customer_id;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- Check available count
        DECLARE @available INT = (
            SELECT COUNT(*) 
            FROM customer_asset_sequences 
            WHERE customer_type_id = @customer_id 
                AND status = 'available'
                AND year = @year
        );
        
        IF @available < 100
        BEGIN
            -- Generate more numbers
            -- (Implementation similar to Step 2 above)
        END
        
        FETCH NEXT FROM customer_cursor INTO @customer_id;
    END
    
    CLOSE customer_cursor;
    DEALLOCATE customer_cursor;
END
```

---

## FAQs

### Q: What happens if we run out of asset numbers for a customer?
**A:** The system will return an error when trying to generate serials. Admins should monitor available counts and pre-generate numbers proactively. Automated job (above) prevents this.

### Q: Can we add customers mid-year?
**A:** Yes! New customers start their sequence at 1 for the current year. Example: If added in June 2024, first number is `ART-2024-00001`.

### Q: What if a customer uses a different format?
**A:** Configure the `sequence_format` field in `customer_types` table. Supported tokens: `{PREFIX}`, `{YEAR}`, `{SEQUENCE:n}` where n is padding.

### Q: Can we have customers without asset numbers?
**A:** Yes, simply don't show Step 5 for those customers. The system only requires EyeFi and UL (Step 4).

### Q: How do we handle customer name changes (e.g., Scientific Games → Light & Wonder)?
**A:** Update `customer_name` in `customer_types` table. Keep `customer_code` and `prefix` the same to maintain sequence continuity.

### Q: What if two customers merge?
**A:** Create new customer type with new prefix, or keep both active and migrate work orders to preferred customer code.

---

## Related Documentation

- [Serial Number Sequence Integrity](./SERIAL_NUMBER_SEQUENCE_INTEGRITY.md)
- [Mismatch Report System](./MISMATCH_REPORT_SYSTEM.md)
- [EyeFi Serial Tracking Implementation](./eyefi-serial-usage-tracking.md)
- [Database Schema Documentation](./serial-number-database-documentation.md)

---

## Support Contacts

**Database Issues:** Database Team  
**Sequence Errors:** System Admins  
**New Customer Setup:** IT Manager + Operations Manager  
**Business Rules:** Operations Director  

---

*Last Updated: 2024*
*Version: 1.0*
