# EyeFi Serial Search - ControlValueAccessor Implementation

## Overview
The EyeFi Serial Search component now implements Angular's `ControlValueAccessor` interface, allowing it to work seamlessly with Reactive Forms using `formControlName` instead of custom event emitters.

## Benefits

### Before (Custom Events)
```html
<app-eyefi-serial-search 
  [value]="f.serialNumber.value"
  (notifyParent)="onEyeFiSerialSelected($event)">
</app-eyefi-serial-search>
```

```typescript
onEyeFiSerialSelected(serialData: any): void {
  if (serialData) {
    this.form.patchValue({
      serialNumber: serialData.serial_number || serialData
    });
  }
}
```

### After (ControlValueAccessor)
```html
<app-eyefi-serial-search 
  formControlName="serialNumber"
  [form_label]="'Serial Number'"
  [strictMode]="true">
</app-eyefi-serial-search>
```

**No TypeScript handler needed!** The form control is automatically updated.

## Implementation Details

### 1. Interface Implementation
```typescript
export class EyefiSerialSearchComponent implements OnInit, ControlValueAccessor {
  // ControlValueAccessor properties
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};
  disabled: boolean = false;
```

### 2. Provider Registration
```typescript
@Component({
  // ... other config
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EyefiSerialSearchComponent),
      multi: true
    }
  ]
})
```

### 3. Required Methods

#### writeValue()
Called by Angular to write a value to the component:
```typescript
writeValue(value: any): void {
  if (value) {
    this.searchTerm = value;
    this.loadSerialNumberByNumber(value);
  } else {
    this.searchTerm = '';
    this.selectedSerial = null;
  }
}
```

**Usage:** When form control value changes programmatically, this updates the component.

#### registerOnChange()
Registers the callback function to call when value changes:
```typescript
registerOnChange(fn: any): void {
  this.onChange = fn;
}
```

#### registerOnTouched()
Registers the callback function to call when component is touched/blurred:
```typescript
registerOnTouched(fn: any): void {
  this.onTouched = fn;
}
```

#### setDisabledState()
Called when form control is disabled/enabled:
```typescript
setDisabledState(isDisabled: boolean): void {
  this.disabled = isDisabled;
}
```

### 4. Calling Callbacks

#### On Selection
```typescript
selectSerialNumber(serial: any): void {
  this.selectedSerial = serial;
  this.searchTerm = serial.serial_number;
  this.showDropdown = false;
  this.errorMessage = '';
  
  // ✅ Update form control value
  this.onChange(serial.serial_number);
  this.onTouched();
  
  // Also emit for backward compatibility
  this.notifyParent.emit(serial);
}
```

#### On Clear
```typescript
clearSelection(): void {
  this.selectedSerial = null;
  this.searchTerm = '';
  this.filteredSerialNumbers = [];
  this.showDropdown = false;
  
  // ✅ Update form control value
  this.onChange(null);
  this.onTouched();
  
  this.notifyParent.emit(null);
}
```

#### On Blur (Strict Mode)
```typescript
onBlur(): void {
  // ✅ Mark as touched for form validation
  this.onTouched();
  
  setTimeout(() => {
    this.showDropdown = false;
    
    if (this.strictMode && this.searchTerm && !this.selectedSerial) {
      this.searchTerm = '';
      this.errorMessage = 'Please select a valid serial number from the dropdown';
      
      // ✅ Update form control value
      this.onChange(null);
      this.notifyParent.emit(null);
    } else if (!this.strictMode && this.searchTerm && !this.selectedSerial) {
      // ✅ Update form control value (manual entry)
      this.onChange(this.searchTerm);
      this.notifyParent.emit({ 
        serial_number: this.searchTerm,
        isManualEntry: true
      });
    }
  }, 200);
}
```

## Usage Examples

### Basic Usage with FormControl
```typescript
export class MyFormComponent {
  form = this.fb.group({
    serialNumber: ['', Validators.required]
  });
}
```

```html
<form [formGroup]="form">
  <app-eyefi-serial-search 
    formControlName="serialNumber"
    [strictMode]="true">
  </app-eyefi-serial-search>
  
  <div *ngIf="form.get('serialNumber')?.errors?.['required']">
    Serial Number is required
  </div>
</form>
```

### With Validation
```typescript
form = this.fb.group({
  serialNumber: ['', [
    Validators.required,
    Validators.minLength(5)
  ]]
});
```

### Programmatic Updates
```typescript
// Set value
this.form.patchValue({ serialNumber: 'eyefi-007' });

// Get value
const serial = this.form.get('serialNumber')?.value;

// Check validation
if (this.form.get('serialNumber')?.invalid) {
  console.log('Invalid serial number');
}

// Disable control
this.form.get('serialNumber')?.disable();

// Enable control
this.form.get('serialNumber')?.enable();
```

### AGS Serial Form (Updated)
```html
<form [formGroup]="form">
  <div class="row">
    <div class="col-md-6">
      <input class="form-control" 
        type="text" 
        formControlName="generated_SG_asset" />
    </div>

    <div class="col-md-6">
      <app-eyefi-serial-search 
        formControlName="serialNumber"
        [form_label]="'Serial Number'" 
        [strictMode]="true"
        [status]="'available'"
        [required]="true">
      </app-eyefi-serial-search>
      
      <div *ngIf="submitted && f.serialNumber.errors?.['required']">
        Serial Number is required
      </div>
    </div>
  </div>
</form>
```

**No event handler needed in TypeScript!**

### UL Usage Form (Can be updated)
```html
<!-- Before -->
<app-eyefi-serial-search 
  [value]="usageForm.get('eyefi_serial_number')?.value"
  (notifyParent)="onEyeFiSerialSelected($event)">
</app-eyefi-serial-search>

<!-- After -->
<app-eyefi-serial-search 
  formControlName="eyefi_serial_number"
  [strictMode]="false"
  [status]="'available'">
</app-eyefi-serial-search>
```

## Backward Compatibility

The component still emits `notifyParent` events for backward compatibility with existing code:

```typescript
// Both work simultaneously
this.onChange(value);        // ← Updates form control
this.notifyParent.emit(value); // ← Emits event for existing handlers
```

This allows gradual migration:
1. **New components** use `formControlName` (recommended)
2. **Existing components** continue to work with `(notifyParent)` events
3. Can migrate one component at a time

## Form Validation Integration

### Touched State
```typescript
onBlur(): void {
  this.onTouched(); // ← Marks control as touched
  // ... rest of blur logic
}
```

**Result:** Validation errors only show after user interacts with field.

### Validation Errors
```html
<app-eyefi-serial-search formControlName="serialNumber">
</app-eyefi-serial-search>

<!-- Shows when touched and invalid -->
<div *ngIf="form.get('serialNumber')?.touched && 
            form.get('serialNumber')?.invalid"
     class="invalid-feedback d-block">
  <span *ngIf="form.get('serialNumber')?.errors?.['required']">
    Serial Number is required
  </span>
</div>
```

### Disabled State
```typescript
// Disable the control
this.form.get('serialNumber')?.disable();
```

The component's `setDisabledState()` method is called, and the `disabled` property is updated, which can be used in the template:

```html
<input 
  type="text"
  [(ngModel)]="searchTerm"
  [disabled]="disabled"  ← Uses the disabled property
  (input)="onSearchChange($event)"
  (blur)="onBlur()"
/>
```

## Testing

### Test Form Control Integration
```typescript
it('should update form control when serial is selected', () => {
  const form = new FormGroup({
    serialNumber: new FormControl('')
  });
  
  component.registerOnChange((value) => {
    form.get('serialNumber')?.setValue(value);
  });
  
  component.selectSerialNumber({ serial_number: 'eyefi-007' });
  
  expect(form.get('serialNumber')?.value).toBe('eyefi-007');
});

it('should mark as touched on blur', () => {
  const form = new FormGroup({
    serialNumber: new FormControl('')
  });
  
  let touched = false;
  component.registerOnTouched(() => touched = true);
  
  component.onBlur();
  
  expect(touched).toBe(true);
});
```

## Migration Guide

### Step 1: Remove Event Handler (TypeScript)
```typescript
// DELETE THIS:
onEyeFiSerialSelected(serialData: any): void {
  if (serialData) {
    this.form.patchValue({
      serialNumber: serialData.serial_number
    });
  }
}
```

### Step 2: Update Template
```html
<!-- BEFORE -->
<app-eyefi-serial-search 
  [value]="f.serialNumber.value"
  (notifyParent)="onEyeFiSerialSelected($event)">
</app-eyefi-serial-search>

<!-- AFTER -->
<app-eyefi-serial-search 
  formControlName="serialNumber">
</app-eyefi-serial-search>
```

### Step 3: Test
- ✅ Value updates when selection is made
- ✅ Validation works (required, touched, etc.)
- ✅ Disabled state works
- ✅ Programmatic updates work (`patchValue`, `setValue`)

## Summary

✅ **Standard Angular pattern** - Uses ControlValueAccessor interface  
✅ **Less boilerplate** - No need for custom event handlers  
✅ **Better validation** - Integrates with Angular form validation  
✅ **Disabled support** - Can be disabled via form control  
✅ **Backward compatible** - Still emits events for existing code  
✅ **Cleaner code** - Form logic stays in form, not in event handlers  
✅ **Type safe** - Full TypeScript support  

The component now works like any standard Angular form control (input, select, etc.) and can be used with `formControlName` for a cleaner, more maintainable approach.
