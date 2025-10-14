# Serial Number Consume on Generation Feature

## Overview
Enhanced the serial number generation system to allow immediate consumption (marking as used) when creating serial numbers. Users can now specify the purpose and notes for the serial number at generation time.

## Changes Made

### 1. Backend API Updates (`backend/api/serial-number/index.php`)

#### Modified `generateSerial()` Method
- **New Parameters:**
  - `$notes`: Additional notes about the serial number
  - `$consume_immediately`: Boolean flag to mark serial as used upon creation
  
- **Behavior Changes:**
  - When `$consume_immediately` is true:
    - Sets `is_used = 1`
    - Sets `used_at = current timestamp`
    - Sets `status = 'used'`
  - When false (default):
    - Sets `is_used = 0`
    - Sets `used_at = NULL`
    - Sets `status = 'available'`

- **Updated Return Data:**
  ```php
  return [
      'success' => true,
      'serial_number' => $serial_number,
      'template_id' => $template_id,
      'template_name' => $template['name'],
      'is_used' => $is_used,
      'used_for' => $used_for,
      'notes' => $notes,
      'status' => $status
  ];
  ```

#### Modified `generateBatch()` Method
- **New Parameters:**
  - `$used_for`: Purpose of the serial numbers
  - `$notes`: Additional notes
  - `$consume_immediately`: Boolean flag to mark all serials as used upon creation

- **Behavior:**
  - Applies consumption status to all serials in the batch
  - Each serial in batch receives the same `used_for` and `notes` values

#### Updated Endpoint Handlers
```php
case 'generate':
    $result = $api->generateSerial(
        $input['template_id'],
        $input['used_for'] ?? null,
        $input['reference_id'] ?? null,
        $input['reference_table'] ?? null,
        $input['notes'] ?? null,
        $input['consume_immediately'] ?? false
    );
    break;
    
case 'generate_batch':
    $result = $api->generateBatch(
        $input['template_id'],
        $input['prefix'],
        $input['count'],
        $input['used_for'] ?? null,
        $input['notes'] ?? null,
        $input['consume_immediately'] ?? false
    );
    break;
```

### 2. Frontend Service Updates (`src/app/core/services/serial-number.service.ts`)

#### Updated `generateSerial()` Method
```typescript
generateSerial(
  template_id: string, 
  used_for?: string, 
  reference_id?: string, 
  reference_table?: string,
  notes?: string,
  consume_immediately?: boolean
): Observable<any>
```

#### Updated `generateBatch()` Method
```typescript
generateBatch(
  template_id: string, 
  prefix: string, 
  count: number,
  used_for?: string,
  notes?: string,
  consume_immediately?: boolean
): Observable<any>
```

### 3. Component Updates (`src/app/shared/components/serial-number-generator/serial-number-generator.component.ts`)

#### New Form Controls
```typescript
private initializeForm() {
  this.form = this.fb.group({
    // ... existing controls ...
    used_for: [''], // What the serial number will be used for
    notes: [''], // Additional notes
    consume_immediately: [false] // Mark as used immediately upon generation
  });
}
```

#### Updated `saveSerialNumberToDatabase()` Method
- Reads form values for `used_for`, `notes`, and `consume_immediately`
- Passes these values to the service
- Displays appropriate success message based on consumption status

```typescript
private saveSerialNumberToDatabase(serialNumber: string) {
  const usedFor = this.form.get('used_for')?.value || this.usedFor;
  const notes = this.form.get('notes')?.value || null;
  const consumeImmediately = this.form.get('consume_immediately')?.value || false;
  
  this.serialNumberService.generateSerial(
    templateId, 
    usedFor, 
    null, 
    null, 
    notes, 
    consumeImmediately
  ).subscribe({
    next: (response) => {
      // Handle response with consumption status
      const statusMessage = consumeImmediately 
        ? `Serial number "${this.generatedSerialNumber}" generated, saved, and marked as used!`
        : `Serial number "${this.generatedSerialNumber}" saved to database and ready to use!`;
      
      this.toastrService.success(statusMessage);
    }
  });
}
```

### 4. Template Updates (`src/app/shared/components/serial-number-generator/serial-number-generator.component.html`)

#### New Form Section: Usage Information
Added in the Advanced Configuration offcanvas (only shown when `saveToDatabase` is true):

```html
<!-- Usage Information -->
<div class="mb-4" *ngIf="saveToDatabase">
    <h6 class="text-primary mb-3">
        <i class="mdi mdi-tag-text me-1"></i>Usage Information
    </h6>
    
    <!-- Used For Field -->
    <div class="mb-3">
        <label class="form-label">Used For</label>
        <input type="text" class="form-control" formControlName="used_for"
            placeholder="e.g., Product Assembly, Testing, Shipment">
        <div class="form-text">
            <small class="text-muted">What this serial number will be used for</small>
        </div>
    </div>
    
    <!-- Notes Field -->
    <div class="mb-3">
        <label class="form-label">Notes</label>
        <textarea class="form-control" formControlName="notes" rows="3"
            placeholder="Additional notes or comments..."></textarea>
        <div class="form-text">
            <small class="text-muted">Optional notes about this serial number</small>
        </div>
    </div>
    
    <!-- Consume Immediately Toggle -->
    <div class="mb-3">
        <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" 
                formControlName="consume_immediately" id="consumeImmediately">
            <label class="form-check-label" for="consumeImmediately">
                Mark as Used Immediately
            </label>
        </div>
        <div class="form-text">
            <small class="text-muted">
                <i class="mdi mdi-information me-1"></i>
                When enabled, the serial number will be marked as consumed upon generation
            </small>
        </div>
    </div>
</div>
```

## Usage Examples

### Example 1: Generate and Consume Immediately via API

**Request:**
```json
POST /serial-number/index.php
{
  "action": "generate",
  "template_id": "PROD_001",
  "used_for": "Product Assembly",
  "notes": "Used for customer order #12345",
  "consume_immediately": true
}
```

**Response:**
```json
{
  "success": true,
  "serial_number": "PROD-20251014-5678",
  "template_id": "PROD_001",
  "template_name": "Product Serial",
  "is_used": 1,
  "used_for": "Product Assembly",
  "notes": "Used for customer order #12345",
  "status": "used"
}
```

### Example 2: Generate Without Immediate Consumption

**Request:**
```json
POST /serial-number/index.php
{
  "action": "generate",
  "template_id": "PROD_001",
  "used_for": "Inventory",
  "consume_immediately": false
}
```

**Response:**
```json
{
  "success": true,
  "serial_number": "PROD-20251014-5679",
  "template_id": "PROD_001",
  "template_name": "Product Serial",
  "is_used": 0,
  "used_for": "Inventory",
  "notes": null,
  "status": "available"
}
```

### Example 3: Batch Generation with Consumption

**Request:**
```json
POST /serial-number/index.php
{
  "action": "generate_batch",
  "template_id": "TEST_001",
  "prefix": "TEST",
  "count": 5,
  "used_for": "QA Testing",
  "notes": "Batch for testing phase 2",
  "consume_immediately": true
}
```

**Response:**
```json
{
  "success": true,
  "serials": [
    {
      "serial_number": "TEST1234567",
      "is_used": 1,
      "status": "used",
      "used_for": "QA Testing",
      "notes": "Batch for testing phase 2"
    },
    // ... 4 more serials
  ],
  "count": 5
}
```

## UI Workflow

1. User opens serial number generator
2. Configures serial number format (prefix, date, random numbers, etc.)
3. Clicks "Advanced Configuration"
4. In the "Usage Information" section:
   - Enters what the serial will be used for (e.g., "Product Assembly")
   - Optionally adds notes
   - Toggles "Mark as Used Immediately" if needed
5. Clicks "Generate Serial Number"
6. System generates serial and marks as used if toggle was enabled
7. Success message indicates whether serial was marked as used

## Benefits

1. **Streamlined Workflow**: Generate and consume in one step
2. **Better Tracking**: Immediate context about serial usage
3. **Audit Trail**: Notes field provides additional documentation
4. **Flexibility**: Optional - users can still generate without consuming
5. **Batch Support**: Apply consumption to multiple serials at once

## Database Impact

The feature uses existing database fields:
- `used_for` - Already exists
- `notes` - Already exists
- `is_used` - Already exists
- `used_at` - Already exists
- `status` - Already exists

No schema changes required.

## Backward Compatibility

- All new parameters are optional with default values
- Existing API calls continue to work without modification
- Default behavior (no immediate consumption) is maintained
