# EyeFi Serial Number Search Component

A reusable, standalone Angular component for searching and selecting EyeFi device serial numbers with real-time search capabilities.

## Features

- 🔍 **Real-time Search** - Debounced search with 300ms delay
- 🎯 **Smart Filtering** - Filter by status, product model, or search term
- 📋 **Rich Display** - Shows serial number, status badge, product model, batch, hardware/firmware versions
- ✅ **Status Badges** - Color-coded badges for different serial number statuses
- 🎨 **Responsive Design** - Works on mobile and desktop
- ♿ **Accessible** - Proper ARIA labels and keyboard navigation
- 🔄 **Standalone Component** - No module dependencies required

## Installation

The component is already created at:
```
src/app/shared/eyefi-serial-search/
```

## Usage

### Basic Usage

```html
<app-eyefi-serial-search
  [form_label]="'Serial Number'"
  [placeholder]="'Search by Serial Number'"
  [required]="false"
  [showLabel]="true"
  (notifyParent)="onSerialSelected($event)">
</app-eyefi-serial-search>
```

### With Status Filter (Only Available Serials)

```html
<app-eyefi-serial-search
  [form_label]="'Available Serial Number'"
  [placeholder]="'Search available devices'"
  [status]="'available'"
  [required]="true"
  [showLabel]="true"
  (notifyParent)="onSerialSelected($event)">
</app-eyefi-serial-search>
```

### With Product Model Filter

```html
<app-eyefi-serial-search
  [form_label]="'EyeFi Pro X1 Serials'"
  [placeholder]="'Search EyeFi Pro X1 devices'"
  [productModel]="'EyeFi Pro X1'"
  [status]="'available'"
  (notifyParent)="onSerialSelected($event)">
</app-eyefi-serial-search>
```

### Pre-populated Value

```html
<app-eyefi-serial-search
  [value]="existingSerialNumber"
  [form_label]="'Serial Number'"
  (notifyParent)="onSerialSelected($event)">
</app-eyefi-serial-search>
```

## Component Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `form_label` | string | `'Serial Number'` | Label text displayed above the input |
| `placeholder` | string | `'Search by Serial Number'` | Placeholder text for the search input |
| `required` | boolean | `false` | Shows asterisk (*) next to label if true |
| `showLabel` | boolean | `true` | Whether to display the label |
| `value` | string | `''` | Pre-populated serial number value |
| `status` | string | `'available'` | Filter by status: 'available', 'assigned', 'shipped', 'returned', 'defective' |
| `productModel` | string | `''` | Filter by specific product model |

## Component Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `notifyParent` | `SerialNumber \| null` | Emits selected serial number object or null when cleared |

## Payload Structure

When a serial number is selected, the component emits an object with this structure:

```typescript
{
  serial_number: string;          // "EYEFI-001"
  product_model: string;          // "EyeFi Pro X1"
  status: string;                 // "available" | "assigned" | "shipped" | "returned" | "defective"
  hardware_version?: string;      // "1.2.0"
  firmware_version?: string;      // "2.1.4"
  manufacture_date?: string;      // "2024-10-01"
  batch_number?: string;          // "BATCH-2024-1001"
  customer_name?: string;         // "Acme Corp" (if assigned)
  work_order_number?: string;     // "WO-12345" (if assigned)
  created_at: string;            // "2024-10-13T10:00:00Z"
  // ... other fields from backend
}
```

## Example: Component Integration

```typescript
import { Component } from '@angular/core';
import { EyefiSerialSearchComponent } from '@app/shared/eyefi-serial-search/eyefi-serial-search.component';

@Component({
  selector: 'app-my-form',
  standalone: true,
  imports: [EyefiSerialSearchComponent],
  template: `
    <app-eyefi-serial-search
      [form_label]="'Device Serial Number'"
      [status]="'available'"
      [required]="true"
      (notifyParent)="onSerialSelected($event)">
    </app-eyefi-serial-search>
  `
})
export class MyFormComponent {
  selectedSerial: any = null;

  onSerialSelected(serialData: any): void {
    if (serialData) {
      console.log('Serial selected:', serialData);
      this.selectedSerial = serialData;
      
      // Update your form or perform other actions
      this.myForm.patchValue({
        serial_number: serialData.serial_number,
        product_model: serialData.product_model
      });
    } else {
      console.log('Serial cleared');
      this.selectedSerial = null;
    }
  }
}
```

## Status Badge Colors

The component automatically applies color-coded badges based on serial number status:

| Status | Badge Color | Description |
|--------|-------------|-------------|
| `available` | Green (`bg-success`) | Device ready for assignment |
| `assigned` | Blue (`bg-primary`) | Assigned to customer/work order |
| `shipped` | Light Blue (`bg-info`) | Shipped to customer |
| `returned` | Yellow (`bg-warning`) | Returned from customer |
| `defective` | Red (`bg-danger`) | Marked as defective |

## Search Behavior

- **Minimum Characters**: 2 characters required to trigger search
- **Debounce**: 300ms delay after last keystroke
- **Max Results**: 20 results displayed (shows message if more available)
- **Real-time**: Updates as user types
- **Auto-clear**: Dropdown closes on selection or blur

## Features in Action

### Dropdown Display
- Serial number with barcode icon
- Status badge (color-coded)
- Product model
- Batch number (if available)
- Hardware/Firmware versions (if available)
- Customer name (if assigned)

### Selected State
- Shows success alert with selected serial details
- Clear button to reset selection
- Compact display with all relevant information

### Loading State
- Spinner indicator while searching
- Smooth transitions

### Empty State
- Helpful message when no results found
- Suggestions to refine search

## Styling

The component uses Bootstrap 5 classes and custom SCSS. You can customize the appearance by modifying:

```
src/app/shared/eyefi-serial-search/eyefi-serial-search.component.scss
```

## Dependencies

- Angular 15+ (standalone components)
- Bootstrap 5
- Material Design Icons (MDI)
- RxJS (debounceTime, distinctUntilChanged)
- SerialNumberService (from @app/features/serial-number-management/services)

## Backend Requirements

The component requires the Serial Number Management API to be deployed with these endpoints:

- `GET /eyefi-serial-numbers/index.php` - Get all serial numbers with filters
- `GET /eyefi-serial-numbers/index.php?serial_number={number}` - Get specific serial number

See `backend/api/eyefi-serial-numbers/API_DOCUMENTATION.md` for full API details.

## Related Components

- `QadWoSearchComponent` - Similar component for work order search
- `UserSearchComponent` - Similar component for user search

## Support

For issues or questions, contact the development team or create an issue in the repository.
