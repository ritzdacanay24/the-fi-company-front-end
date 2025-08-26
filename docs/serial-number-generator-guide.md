# Serial Number Generator Component

A flexible, configurable Angular component for generating unique serial numbers with various formats including date, time, and random components.

## Features

- **Multiple Format Options**: Date, time, random numbers, prefix/suffix support
- **Custom Format Strings**: Use placeholders for complex formatting
- **Preset Templates**: Quick access to common serial number formats
- **Batch Generation**: Generate multiple serial numbers at once
- **Modal Integration**: Easy-to-use modal for form integration
- **Quick Generation**: Inline component for simple generation
- **Validation**: Built-in validation for serial number formats
- **Local Storage**: Save and reuse custom templates

## Components

### 1. SerialNumberGeneratorComponent
The main component with full configuration options.

```typescript
<app-serial-number-generator 
  [config]="config"
  [showForm]="true"
  [autoGenerate]="false"
  (serialNumberGenerated)="onSerialGenerated($event)"
  (configChanged)="onConfigChanged($event)">
</app-serial-number-generator>
```

**Inputs:**
- `config: SerialNumberConfig` - Initial configuration
- `showForm: boolean` - Show/hide configuration form (default: true)
- `autoGenerate: boolean` - Auto-generate on component load (default: false)

**Outputs:**
- `serialNumberGenerated: string` - Emitted when serial number is generated
- `configChanged: SerialNumberConfig` - Emitted when configuration changes

### 2. SerialNumberModalComponent
Modal wrapper for the generator component.

```typescript
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SerialNumberModalComponent } from '@app/shared/components/serial-number-modal/serial-number-modal.component';

openSerialNumberModal() {
  const modalRef = this.modalService.open(SerialNumberModalComponent, { 
    size: 'lg',
    backdrop: 'static'
  });

  modalRef.componentInstance.title = 'Generate Serial Number';
  modalRef.componentInstance.config = {
    prefix: 'PROD',
    includeDate: true,
    dateFormat: 'YYYYMMDD'
  };

  modalRef.result.then((result) => {
    if (result) {
      console.log('Generated serial:', result);
    }
  });
}
```

### 3. QuickSerialGeneratorComponent
Compact component with preset options.

```typescript
<app-quick-serial-generator 
  (serialGenerated)="onSerialGenerated($event)">
</app-quick-serial-generator>
```

## Configuration Options

```typescript
interface SerialNumberConfig {
  prefix?: string;               // Text before the serial number
  includeDate?: boolean;         // Include date component
  includeTime?: boolean;         // Include time component
  dateFormat?: string;           // Moment.js date format
  timeFormat?: string;           // Moment.js time format
  includeRandomNumbers?: boolean; // Include random numbers
  randomNumberLength?: number;   // Length of random number
  suffix?: string;               // Text after the serial number
  separator?: string;            // Separator between components
  customFormat?: string;         // Custom format string with placeholders
}
```

## Format Examples

### Standard Formats
- **Simple**: `250819123` (YYMMDD + 3 digits)
- **Standard**: `SN-20250819-1234` (Prefix + Date + Random)
- **Detailed**: `PROD-20250819-143052-5678` (Prefix + Date + Time + Random)
- **Timestamp**: `1724072252-1234` (Unix timestamp + Random)

### Custom Format Placeholders
- `{DATE:format}` - Date with custom format
- `{TIME:format}` - Time with custom format
- `{RANDOM:length}` - Random number with specified length
- `{TIMESTAMP}` - Unix timestamp
- `{YEAR}` - Current year (YYYY)
- `{MONTH}` - Current month (MM)
- `{DAY}` - Current day (DD)

**Example Custom Formats:**
```
PROD-{DATE:YYYYMMDD}-{RANDOM:4}           → PROD-20250819-1234
{YEAR}{MONTH}-{RANDOM:6}                  → 202508-123456
WO-{DATE:YYMMDD}-{TIME:HHmm}-{RANDOM:3}   → WO-250819-1430-123
```

## Service Usage

```typescript
import { SerialNumberService } from '@app/core/services/serial-number.service';

constructor(private serialNumberService: SerialNumberService) {}

// Quick generation
const serial = this.serialNumberService.generateQuick('standard');

// Custom configuration
const config = {
  prefix: 'ASSET',
  includeDate: true,
  dateFormat: 'YYYYMMDD',
  randomNumberLength: 6
};
const customSerial = this.serialNumberService.generateWithConfig(config);

// Batch generation
const batch = this.serialNumberService.generateBatch(10, config);

// Validation
const isValid = this.serialNumberService.validateSerialNumber('SN-20250819-1234');
```

## Integration Examples

### 1. Form Field Integration
```typescript
// In component
openSerialGenerator() {
  const modalRef = this.modalService.open(SerialNumberModalComponent);
  modalRef.result.then((result) => {
    this.form.patchValue({ serialNumber: result });
  });
}
```

```html
<!-- In template -->
<div class="input-group">
  <input type="text" class="form-control" formControlName="serialNumber">
  <button type="button" class="btn btn-outline-primary" (click)="openSerialGenerator()">
    <i class="mdi mdi-refresh"></i> Generate
  </button>
</div>
```

### 2. Quick Buttons
```html
<div class="mb-2">
  <app-quick-serial-generator (serialGenerated)="onSerialGenerated($event)">
  </app-quick-serial-generator>
</div>
<input type="text" class="form-control" [(ngModel)]="serialNumber">
```

### 3. Auto-generation
```typescript
<app-serial-number-generator 
  [showForm]="false"
  [autoGenerate]="true"
  [config]="{ prefix: 'AUTO', includeTime: true }"
  (serialNumberGenerated)="handleAutoGenerated($event)">
</app-serial-number-generator>
```

## Preset Templates

The service includes default templates:
- **Standard Product**: `SN-YYYYMMDD-XXXX`
- **Asset Tag**: `AT-YYMMDD-XXXX`
- **Work Order**: `WO-YYYYMMDD-HHmmss-XXXX`

Save custom templates:
```typescript
const template = {
  id: 'custom-product',
  name: 'Custom Product Serial',
  description: 'Format for custom products',
  config: { prefix: 'CUSTOM', includeDate: true }
};

this.serialNumberService.saveTemplate(template);
```

## Demo Page

Visit `/dashboard/operations/serial-number-generator` to see the component in action with examples and integration guides.

## Dependencies

- Angular 15+
- NgBootstrap (for modal)
- Moment.js (for date/time formatting)
- Font Awesome or Material Design Icons (for icons)

## Styling

The component uses Bootstrap classes and can be customized with CSS variables or by overriding component styles.

## Best Practices

1. **Uniqueness**: Use timestamps or random components for uniqueness
2. **Validation**: Always validate generated numbers in your backend
3. **Consistency**: Use templates for consistent formatting across your application
4. **Length**: Keep serial numbers reasonably short for usability
5. **Readability**: Use separators for better readability
