# EyeFi Serial Search - Strict Mode Feature

## Overview
Added `strictMode` parameter to the EyeFi Serial Search component to control validation behavior. This allows the component to work in two modes:

1. **Strict Mode** (default: `true`) - Only accepts serial numbers selected from the dropdown
2. **Non-Strict Mode** (`false`) - Allows free text entry while still providing search suggestions

## Changes Made

### Component TypeScript (eyefi-serial-search.component.ts)

#### New Input Parameter:
```typescript
@Input() strictMode: boolean = true; // If false, allows free text input without validation
```

#### Updated onSearchChange Method:
```typescript
onSearchChange(event: any): void {
  const value = event.target.value;
  this.searchTerm = value;
  
  if (this.strictMode) {
    // Strict mode: only allow selection from dropdown
    this.searchSubject.next(value);
    
    if (!value) {
      this.clearSelection();
    }
  } else {
    // Non-strict mode: emit value as user types (allow free text)
    if (value) {
      this.notifyParent.emit({ serial_number: value });
    } else {
      this.notifyParent.emit(null);
    }
    // Still show dropdown suggestions but don't require selection
    this.searchSubject.next(value);
  }
}
```

### Component Template (eyefi-serial-search.component.html)

#### Updated Form Text:
```html
<div *ngIf="!errorMessage && !selectedSerial" class="form-text">
  <i class="mdi mdi-information-outline me-1"></i>
  <span *ngIf="strictMode">
    Type to search for EyeFi serial numbers
    <span *ngIf="status"> ({{ getStatusLabel(status) }} only)</span>
  </span>
  <span *ngIf="!strictMode">
    Type any serial number or search for EyeFi devices
    <span *ngIf="status"> (suggestions: {{ getStatusLabel(status) }} only)</span>
  </span>
</div>
```

### UL Usage Form Integration

#### Top Section (Work Order Information):
```html
<!-- Strict Mode: Only EyeFi devices -->
<app-eyefi-serial-search 
    [form_label]="'EyeFi Serial Number'" 
    [placeholder]="'Search by Serial Number'"
    [required]="false" 
    [showLabel]="true"
    [status]="'available'"
    [strictMode]="true"   <!-- Default: Only EyeFi devices -->
    [value]="usageForm.get('eyefi_serial_number')?.value"
    (notifyParent)="onEyeFiSerialSelected($event)">
</app-eyefi-serial-search>
```

#### Transaction Section (Serial Number Field):
```html
<!-- Non-Strict Mode: Any serial number allowed -->
<app-eyefi-serial-search 
    [form_label]="'Serial Number'" 
    [placeholder]="'Search by Serial Number or enter manually'"
    [required]="true" 
    [showLabel]="true"
    [status]="'available'"
    [strictMode]="false"   <!-- Allows any serial number -->
    [value]="usageForm.get('serial_number')?.value"
    (notifyParent)="onEyeFiSerialSelected($event)">
</app-eyefi-serial-search>
```

## Mode Comparison

### Strict Mode (`strictMode="true"`)
**Behavior:**
- ✅ User MUST select from dropdown
- ✅ Only validated EyeFi serial numbers accepted
- ✅ Shows dropdown with search results
- ✅ Clears field if no selection made
- ✅ Emits full serial object on selection

**Use Cases:**
- EyeFi device tracking (top section)
- When you need validated EyeFi serial numbers
- When linking to specific device records
- Audit trail requirements

**User Experience:**
1. User types in search box
2. Dropdown shows matching EyeFi devices
3. User MUST click a result to select
4. Selected device shows in success alert
5. Form receives full device object

### Non-Strict Mode (`strictMode="false"`)
**Behavior:**
- ✅ User can type ANY serial number
- ✅ Still shows EyeFi suggestions if available
- ✅ Emits value as user types (real-time)
- ✅ No selection required
- ✅ Emits `{ serial_number: value }` object

**Use Cases:**
- Transaction serial numbers (any device)
- Non-EyeFi device serial numbers
- Manual entry required
- Legacy serial number support

**User Experience:**
1. User types serial number freely
2. Dropdown shows EyeFi suggestions (optional)
3. User can select from dropdown OR keep typing
4. Form updates in real-time as user types
5. Form receives `{ serial_number: "typed-value" }`

## Parameter Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `strictMode` | boolean | `true` | Controls validation mode |
| `form_label` | string | 'Serial Number' | Label text |
| `placeholder` | string | 'Search by Serial Number' | Input placeholder |
| `required` | boolean | `false` | Shows asterisk (*) |
| `showLabel` | boolean | `true` | Display label |
| `status` | string | 'available' | Filter suggestions by status |
| `productModel` | string | '' | Filter by product model |
| `value` | string | '' | Pre-populated value |

## Output Events

### Strict Mode Output:
```typescript
{
  serial_number: "EYEFI-001",
  product_model: "EyeFi Pro X1",
  status: "available",
  hardware_version: "1.2.0",
  firmware_version: "2.1.4",
  batch_number: "BATCH-2024-1001",
  // ... full serial object
}
```

### Non-Strict Mode Output:
```typescript
{
  serial_number: "ANY-SERIAL-123"  // Just the typed value
}
```

## Usage Examples

### Example 1: Strict EyeFi Only
```html
<app-eyefi-serial-search 
    [form_label]="'EyeFi Device Serial'" 
    [strictMode]="true"
    [status]="'available'"
    (notifyParent)="onEyeFiSelected($event)">
</app-eyefi-serial-search>
```
**Result:** User must select from EyeFi database

### Example 2: Free Text with EyeFi Suggestions
```html
<app-eyefi-serial-search 
    [form_label]="'Device Serial Number'" 
    [strictMode]="false"
    [status]="'available'"
    [placeholder]="'Enter or search serial number'"
    (notifyParent)="onSerialEntered($event)">
</app-eyefi-serial-search>
```
**Result:** User can type anything, EyeFi devices shown as suggestions

### Example 3: Required Non-Strict
```html
<app-eyefi-serial-search 
    [form_label]="'Serial Number'" 
    [strictMode]="false"
    [required]="true"
    [placeholder]="'Search by Serial Number or enter manually'"
    (notifyParent)="onSerialChange($event)">
</app-eyefi-serial-search>
```
**Result:** Required field, accepts any input, shows EyeFi suggestions

## Form Integration

### Handling Both Modes in Parent Component:
```typescript
onEyeFiSerialSelected(serialData: any): void {
  if (serialData) {
    // Works for both strict and non-strict modes
    this.usageForm.patchValue({
      eyefi_serial_number: serialData.serial_number,
      serial_number: serialData.serial_number
    });
    
    // In strict mode, serialData has full device object
    // In non-strict mode, serialData only has serial_number
    
    if (serialData.product_model) {
      console.log('EyeFi device selected:', serialData);
      // Can access full device details
    } else {
      console.log('Manual serial entered:', serialData.serial_number);
      // Only has serial number string
    }
  }
}
```

## Benefits

### Flexibility:
- ✅ Single component handles both validated and free-text scenarios
- ✅ Backward compatible (strictMode defaults to true)
- ✅ Can be configured per instance

### User Experience:
- ✅ Strict mode prevents invalid EyeFi serials
- ✅ Non-strict mode doesn't block user workflow
- ✅ Suggestions still helpful even in non-strict mode
- ✅ Clear visual indicators of mode behavior

### Development:
- ✅ One component, multiple use cases
- ✅ Easy to switch modes via parameter
- ✅ Consistent interface regardless of mode
- ✅ Reduced code duplication

## Migration Guide

### Old Manual Input:
```html
<input type="text" formControlName="serial_number"
    class="form-control"
    placeholder="Enter serial number">
```

### New Non-Strict Search:
```html
<app-eyefi-serial-search 
    [form_label]="'Serial Number'"
    [strictMode]="false"
    [value]="usageForm.get('serial_number')?.value"
    (notifyParent)="onSerialEntered($event)">
</app-eyefi-serial-search>
```

**Benefits:** Still allows free text BUT also provides EyeFi suggestions!

## Current Usage in UL Form

### Location 1: Work Order Information Section
- **Mode:** Strict (`strictMode="true"`)
- **Purpose:** Link to specific EyeFi device
- **Behavior:** Must select from dropdown
- **Optional:** Yes

### Location 2: Transaction Details Section
- **Mode:** Non-Strict (`strictMode="false"`)
- **Purpose:** Record any serial number for UL label
- **Behavior:** Free text entry with suggestions
- **Optional:** No (required)

## Testing Checklist

- [x] Component compiles without errors
- [x] Strict mode works (requires selection)
- [ ] Non-strict mode works (allows free text)
- [ ] Dropdown still shows in both modes
- [ ] Selection works in both modes
- [ ] Form receives correct data structure
- [ ] Real-time emission in non-strict mode
- [ ] Form validation works with both modes

## Future Enhancements

### Possible Improvements:
1. **Hybrid Mode** - Start strict, allow override after no results
2. **Custom Validation** - Pass regex pattern for non-strict validation
3. **Min Length** - Require minimum characters in non-strict mode
4. **Format Helper** - Show format examples in non-strict mode
5. **History** - Remember recently entered non-EyeFi serials

## Related Files

- `eyefi-serial-search.component.ts` - Component logic
- `eyefi-serial-search.component.html` - Component template
- `ul-usage-form.component.html` - Usage implementation
- `ul-usage-form.component.ts` - Event handler

---

**Status:** ✅ Complete - Ready for Testing
**Date:** October 13, 2025
**Feature:** Strict Mode Toggle
**Impact:** Component now supports both validated and free-text entry
