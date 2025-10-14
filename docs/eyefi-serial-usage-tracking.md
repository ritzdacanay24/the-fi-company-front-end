# EyeFi Serial Number Usage Tracking System

## Overview
EyeFi serial numbers are used across multiple parts of the application (IGT, AGS/SG, UL Labels, etc.) that store data in different tables. This document outlines the system for tracking where EyeFi serials are being used and marking them as "assigned" or "used".

## Architecture: Hybrid Tracking Approach

### 1. Direct Foreign Key Relationships
Each table that uses EyeFi serials has a direct `eyefi_serial_number` column:

```sql
-- IGT Assets Table
ALTER TABLE igt_assets 
ADD COLUMN eyefi_serial_number VARCHAR(50) NULL,
ADD CONSTRAINT fk_igt_eyefi_serial 
    FOREIGN KEY (eyefi_serial_number) 
    REFERENCES eyefi_serial_numbers(serial_number) 
    ON DELETE SET NULL;

-- AGS/SG Assets Table  
ALTER TABLE ags_serial 
ADD COLUMN eyefi_serial_number VARCHAR(50) NULL,
ADD CONSTRAINT fk_ags_eyefi_serial 
    FOREIGN KEY (eyefi_serial_number) 
    REFERENCES eyefi_serial_numbers(serial_number) 
    ON DELETE SET NULL;

-- UL Label Usages Table (already has this)
-- eyefi_serial_number column exists

-- Add index for faster lookups
CREATE INDEX idx_igt_eyefi_serial ON igt_assets(eyefi_serial_number);
CREATE INDEX idx_ags_eyefi_serial ON ags_serial(eyefi_serial_number);
```

### 2. Central Usage Tracking Table
Create a centralized table to track all EyeFi serial usages across the application:

```sql
CREATE TABLE eyefi_serial_usages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    serial_number VARCHAR(50) NOT NULL,
    usage_type ENUM('igt', 'ags', 'sg', 'ul_label', 'standalone', 'other') NOT NULL,
    reference_table VARCHAR(100) NOT NULL,
    reference_id INT NOT NULL,
    work_order VARCHAR(50) NULL,
    customer VARCHAR(255) NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_by INT NULL,
    notes TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (serial_number) 
        REFERENCES eyefi_serial_numbers(serial_number) 
        ON DELETE CASCADE,
    FOREIGN KEY (used_by) 
        REFERENCES users(id) 
        ON DELETE SET NULL,
        
    INDEX idx_serial (serial_number),
    INDEX idx_usage_type (usage_type),
    INDEX idx_reference (reference_table, reference_id),
    INDEX idx_active (is_active),
    
    UNIQUE KEY unique_active_usage (serial_number, usage_type, reference_table, reference_id, is_active)
);
```

### 3. Automatic Status Updates via Triggers

#### IGT Assets Trigger
```sql
DELIMITER $$
CREATE TRIGGER track_eyefi_usage_igt_insert
AFTER INSERT ON igt_assets
FOR EACH ROW
BEGIN
    IF NEW.eyefi_serial_number IS NOT NULL THEN
        -- Update status in main EyeFi table
        UPDATE eyefi_serial_numbers 
        SET 
            status = 'assigned',
            last_assigned_at = NOW(),
            updated_at = NOW()
        WHERE serial_number = NEW.eyefi_serial_number;
        
        -- Track usage in central table
        INSERT INTO eyefi_serial_usages 
        (serial_number, usage_type, reference_table, reference_id, work_order, used_by)
        VALUES (
            NEW.eyefi_serial_number, 
            'igt', 
            'igt_assets', 
            NEW.id,
            NEW.work_order,
            NEW.created_by
        );
    END IF;
END$$

CREATE TRIGGER track_eyefi_usage_igt_update
AFTER UPDATE ON igt_assets
FOR EACH ROW
BEGIN
    -- Handle serial number change
    IF OLD.eyefi_serial_number != NEW.eyefi_serial_number THEN
        
        -- Deactivate old usage record
        IF OLD.eyefi_serial_number IS NOT NULL THEN
            UPDATE eyefi_serial_usages 
            SET is_active = FALSE 
            WHERE serial_number = OLD.eyefi_serial_number 
                AND usage_type = 'igt'
                AND reference_table = 'igt_assets'
                AND reference_id = OLD.id;
                
            -- Check if old serial is used elsewhere, if not mark as available
            IF NOT EXISTS (
                SELECT 1 FROM eyefi_serial_usages 
                WHERE serial_number = OLD.eyefi_serial_number 
                AND is_active = TRUE
            ) THEN
                UPDATE eyefi_serial_numbers 
                SET status = 'available' 
                WHERE serial_number = OLD.eyefi_serial_number;
            END IF;
        END IF;
        
        -- Add new usage record
        IF NEW.eyefi_serial_number IS NOT NULL THEN
            UPDATE eyefi_serial_numbers 
            SET status = 'assigned', last_assigned_at = NOW()
            WHERE serial_number = NEW.eyefi_serial_number;
            
            INSERT INTO eyefi_serial_usages 
            (serial_number, usage_type, reference_table, reference_id, work_order, used_by)
            VALUES (
                NEW.eyefi_serial_number, 
                'igt', 
                'igt_assets', 
                NEW.id,
                NEW.work_order,
                NEW.updated_by
            );
        END IF;
    END IF;
END$$
DELIMITER ;
```

#### AGS/SG Assets Trigger
```sql
DELIMITER $$
CREATE TRIGGER track_eyefi_usage_ags_insert
AFTER INSERT ON ags_serial
FOR EACH ROW
BEGIN
    IF NEW.eyefi_serial_number IS NOT NULL THEN
        UPDATE eyefi_serial_numbers 
        SET 
            status = 'assigned',
            last_assigned_at = NOW(),
            updated_at = NOW()
        WHERE serial_number = NEW.eyefi_serial_number;
        
        INSERT INTO eyefi_serial_usages 
        (serial_number, usage_type, reference_table, reference_id, work_order, used_by)
        VALUES (
            NEW.eyefi_serial_number, 
            'ags', 
            'ags_serial', 
            NEW.id,
            NEW.poNumber,
            NEW.created_by
        );
    END IF;
END$$

CREATE TRIGGER track_eyefi_usage_ags_update
AFTER UPDATE ON ags_serial
FOR EACH ROW
BEGIN
    IF OLD.eyefi_serial_number != NEW.eyefi_serial_number THEN
        
        IF OLD.eyefi_serial_number IS NOT NULL THEN
            UPDATE eyefi_serial_usages 
            SET is_active = FALSE 
            WHERE serial_number = OLD.eyefi_serial_number 
                AND usage_type = 'ags'
                AND reference_table = 'ags_serial'
                AND reference_id = OLD.id;
                
            IF NOT EXISTS (
                SELECT 1 FROM eyefi_serial_usages 
                WHERE serial_number = OLD.eyefi_serial_number 
                AND is_active = TRUE
            ) THEN
                UPDATE eyefi_serial_numbers 
                SET status = 'available' 
                WHERE serial_number = OLD.eyefi_serial_number;
            END IF;
        END IF;
        
        IF NEW.eyefi_serial_number IS NOT NULL THEN
            UPDATE eyefi_serial_numbers 
            SET status = 'assigned', last_assigned_at = NOW()
            WHERE serial_number = NEW.eyefi_serial_number;
            
            INSERT INTO eyefi_serial_usages 
            (serial_number, usage_type, reference_table, reference_id, work_order, used_by)
            VALUES (
                NEW.eyefi_serial_number, 
                'ags', 
                'ags_serial', 
                NEW.id,
                NEW.poNumber,
                NEW.updated_by
            );
        END IF;
    END IF;
END$$
DELIMITER ;
```

#### UL Label Usage Trigger (if not already exists)
```sql
DELIMITER $$
CREATE TRIGGER track_eyefi_usage_ul_insert
AFTER INSERT ON ul_label_usages
FOR EACH ROW
BEGIN
    IF NEW.eyefi_serial_number IS NOT NULL THEN
        UPDATE eyefi_serial_numbers 
        SET status = 'assigned', last_assigned_at = NOW()
        WHERE serial_number = NEW.eyefi_serial_number;
        
        INSERT INTO eyefi_serial_usages 
        (serial_number, usage_type, reference_table, reference_id, work_order, used_by)
        VALUES (
            NEW.eyefi_serial_number, 
            'ul_label', 
            'ul_label_usages', 
            NEW.id,
            NEW.work_order,
            NEW.created_by
        );
    END IF;
END$$
DELIMITER ;
```

## Usage Queries

### Find Where a Serial is Used
```sql
SELECT 
    esu.serial_number,
    esu.usage_type,
    esu.reference_table,
    esu.reference_id,
    esu.work_order,
    esu.customer,
    esu.used_at,
    u.name as used_by_name,
    esn.status,
    esn.product_model
FROM eyefi_serial_usages esu
LEFT JOIN eyefi_serial_numbers esn ON esu.serial_number = esn.serial_number
LEFT JOIN users u ON esu.used_by = u.id
WHERE esu.serial_number = 'eyefi-00722'
  AND esu.is_active = TRUE
ORDER BY esu.used_at DESC;
```

### Get All Usages by Type
```sql
SELECT 
    usage_type,
    COUNT(*) as usage_count,
    COUNT(DISTINCT serial_number) as unique_serials
FROM eyefi_serial_usages
WHERE is_active = TRUE
GROUP BY usage_type;
```

### Find Available Serials
```sql
SELECT serial_number, product_model, status
FROM eyefi_serial_numbers
WHERE status = 'available'
  AND serial_number NOT IN (
      SELECT serial_number 
      FROM eyefi_serial_usages 
      WHERE is_active = TRUE
  )
ORDER BY serial_number;
```

### Usage History for a Serial
```sql
SELECT 
    esu.*,
    u.name as user_name,
    CASE 
        WHEN esu.usage_type = 'igt' THEN (SELECT serial_number FROM igt_assets WHERE id = esu.reference_id)
        WHEN esu.usage_type = 'ags' THEN (SELECT generated_SG_asset FROM ags_serial WHERE id = esu.reference_id)
        WHEN esu.usage_type = 'ul_label' THEN (SELECT ul_number FROM ul_label_usages WHERE id = esu.reference_id)
    END as related_asset
FROM eyefi_serial_usages esu
LEFT JOIN users u ON esu.used_by = u.id
WHERE esu.serial_number = 'eyefi-00722'
ORDER BY esu.used_at DESC;
```

## Frontend Integration

### Components Using EyeFi Search
1. **UL Usage Form** - Transaction section (non-strict mode)
2. **IGT Form** - Serial number field (TBD)
3. **AGS Serial Form** - Serial number field ✅ (just implemented)

### Event Handler Pattern
```typescript
onEyeFiSerialSelected(serialData: any): void {
  if (serialData) {
    const serialNumber = serialData.serial_number || serialData;
    
    this.form.patchValue({
      eyefi_serial_number: serialNumber,
      serialNumber: serialNumber // Or whatever field name
    });

    // Distinguish validated EyeFi vs manual entry
    if (serialData.product_model && serialData.status) {
      console.log('✅ EyeFi Serial Selected:', serialData);
      // This is a validated EyeFi device from database
    } else {
      console.log('📝 Manual Serial Entered:', serialNumber);
      // This is a manual entry (non-EyeFi device)
    }
  }
}
```

## API Endpoints Needed

### Check Serial Usage
```php
// GET /api/eyefi-serial-numbers/index.php?action=check-usage&serial_number=eyefi-00722
case 'check-usage':
    $serialNumber = $_GET['serial_number'] ?? '';
    
    $stmt = $pdo->prepare("
        SELECT 
            esu.*,
            esn.status,
            esn.product_model
        FROM eyefi_serial_usages esu
        LEFT JOIN eyefi_serial_numbers esn ON esu.serial_number = esn.serial_number
        WHERE esu.serial_number = ? AND esu.is_active = TRUE
    ");
    $stmt->execute([$serialNumber]);
    $usages = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'serial_number' => $serialNumber,
            'is_used' => count($usages) > 0,
            'usage_count' => count($usages),
            'usages' => $usages
        ]
    ]);
    break;
```

### Release Serial (Mark as Available)
```php
// POST /api/eyefi-serial-numbers/index.php?action=release
case 'release':
    $data = json_decode(file_get_contents('php://input'), true);
    $serialNumber = $data['serial_number'];
    $usageType = $data['usage_type'];
    $referenceId = $data['reference_id'];
    
    // Deactivate usage record
    $stmt = $pdo->prepare("
        UPDATE eyefi_serial_usages 
        SET is_active = FALSE 
        WHERE serial_number = ? 
          AND usage_type = ?
          AND reference_id = ?
    ");
    $stmt->execute([$serialNumber, $usageType, $referenceId]);
    
    // Check if serial is used elsewhere
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM eyefi_serial_usages 
        WHERE serial_number = ? AND is_active = TRUE
    ");
    $stmt->execute([$serialNumber]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // If not used anywhere else, mark as available
    if ($result['count'] == 0) {
        $stmt = $pdo->prepare("
            UPDATE eyefi_serial_numbers 
            SET status = 'available' 
            WHERE serial_number = ?
        ");
        $stmt->execute([$serialNumber]);
    }
    
    echo json_encode(['success' => true]);
    break;
```

## Benefits of This System

✅ **Automatic Tracking**: Triggers handle status updates automatically  
✅ **Cross-Reference**: Know where any serial is used across all systems  
✅ **History**: Complete audit trail of serial number usage  
✅ **Flexibility**: Supports multiple usages and manual entries  
✅ **Data Integrity**: Foreign keys prevent orphaned records  
✅ **Performance**: Indexed for fast lookups  
✅ **Decoupled**: Main tables don't need complex logic  

## Next Steps

1. ✅ Add EyeFi search component to AGS form
2. ⏳ Create database migration for:
   - `eyefi_serial_usages` table
   - Foreign key columns in IGT/AGS tables
   - Triggers for automatic tracking
3. ⏳ Add EyeFi search component to IGT form
4. ⏳ Create API endpoints for usage checking
5. ⏳ Add usage display in EyeFi serial list view
6. ⏳ Implement "release serial" functionality
7. ⏳ Add usage statistics dashboard
