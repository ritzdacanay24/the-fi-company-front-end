# EyeFi Serial Number Management System

## Overview

The EyeFi Serial Number Management System is a comprehensive Angular 18+ feature module that provides complete lifecycle management for EyeFi device serial numbers. This system mirrors and extends the existing UL Management module architecture, providing similar functionality specifically tailored for serial number tracking and assignment.

## Features

### Core Functionality
- **Serial Number Generation**: Batch and individual serial number creation with customizable prefixes
- **Bulk Upload**: CSV/Excel import with validation and error reporting
- **Inventory Management**: Real-time status tracking and availability monitoring
- **Assignment System**: Link serial numbers to work orders and customers
- **Analytics Dashboard**: Comprehensive statistics and usage reports
- **Mock Data Toggle**: Development-friendly mock service integration

### Key Components
1. **Generator (`sn-generator`)**: Create serial numbers individually or in batches
2. **List View (`sn-list`)**: Browse, filter, and manage existing serial numbers
3. **Upload (`sn-upload`)**: Bulk import from CSV/Excel files
4. **Assignment (`sn-assignment`)**: Assign serial numbers to customers and work orders
5. **Statistics (`sn-stats`)**: Analytics dashboard with charts and trends

## Architecture

### Module Structure
```
src/app/features/serial-number-management/
├── components/
│   ├── sn-generator/          # Serial number generation
│   ├── sn-list/               # List and management
│   ├── sn-upload/             # Bulk upload
│   ├── sn-assignment/         # Assignment to work orders
│   └── sn-stats/              # Analytics dashboard
├── models/
│   └── serial-number.model.ts  # TypeScript interfaces
├── services/
│   ├── serial-number.service.ts      # Main API service
│   ├── serial-number-mock.service.ts # Mock data service
│   └── mock-toggle.service.ts        # Mock/real service toggle
├── serial-number-management.module.ts
└── serial-number-management-routing.module.ts
```

### Data Models

#### SerialNumber Interface
```typescript
interface SerialNumber {
  id?: number;
  serial_number: string;
  product_model: string;
  hardware_version?: string;
  firmware_version?: string;
  manufacture_date?: string;
  batch_number?: string;
  status: 'available' | 'assigned' | 'shipped' | 'returned' | 'defective';
  qr_code?: string;
  barcode?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
}
```

#### SerialNumberAssignment Interface
```typescript
interface SerialNumberAssignment {
  id?: number;
  serial_number_id: number;
  serial_number: string;
  work_order_number?: string;
  customer_name?: string;
  customer_po?: string;
  assigned_date: string;
  shipped_date?: string;
  tracking_number?: string;
  assigned_by_user: string;
  assigned_by_name: string;
  notes?: string;
  // Work Order Integration
  wo_nbr?: number;
  wo_due_date?: string;
  wo_part?: string;
  wo_qty_ord?: number;
  wo_routing?: string;
  wo_line?: string;
  wo_description?: string;
}
```

## Installation & Setup

### 1. Module Integration
The serial number management module is designed as a standalone feature module. To integrate:

```typescript
// In your main app routing
{
  path: 'serial-numbers',
  loadChildren: () => import('./features/serial-number-management/serial-number-management.module')
    .then(m => m.SerialNumberManagementModule)
}
```

### 2. Navigation Setup
Add navigation links to your main navigation component:

```html
<a routerLink="/serial-numbers" class="nav-link">
  <i class="fas fa-barcode"></i> Serial Numbers
</a>
```

### 3. Backend API Endpoints
The service expects the following API endpoints:

- `GET /api/serial-numbers` - List all serial numbers
- `POST /api/serial-numbers` - Create new serial number
- `PUT /api/serial-numbers/{id}` - Update serial number
- `DELETE /api/serial-numbers/{id}` - Delete serial number
- `POST /api/serial-numbers/generate-batch` - Generate batch of serial numbers
- `POST /api/serial-numbers/bulk-upload` - Bulk upload from file
- `GET /api/serial-numbers/assignments` - Get assignments
- `POST /api/serial-numbers/assignments` - Create assignment
- `GET /api/serial-numbers/stats` - Get statistics
- `GET /api/serial-numbers/reports` - Get reports

## Usage Examples

### Generating Serial Numbers

#### Batch Generation
```typescript
const batchData = {
  prefix: 'EYE',
  startNumber: 2024001001,
  quantity: 100,
  productModel: 'EyeFi Pro X1',
  batchNumber: 'BATCH-2024-0115',
  manufactureDate: '2024-01-15'
};

this.serialNumberService.generateSerialNumbersBatch(batchData).subscribe(result => {
  console.log('Generated:', result);
});
```

#### Individual Creation
```typescript
const serialNumber = {
  serial_number: 'EYE2024001001',
  product_model: 'EyeFi Pro X1',
  hardware_version: '1.2.0',
  firmware_version: '2.1.4',
  manufacture_date: '2024-01-15',
  batch_number: 'BATCH-2024-0115',
  status: 'available'
};

this.serialNumberService.createSerialNumber(serialNumber).subscribe(result => {
  console.log('Created:', result);
});
```

### Assigning Serial Numbers
```typescript
const assignment = {
  serial_number_id: 123,
  serial_number: 'EYE2024001001',
  customer_name: 'Acme Corporation',
  customer_po: 'PO-12345',
  work_order_number: 'WO-67890',
  assigned_date: '2024-01-15',
  assigned_by_user: 'current-user-id',
  assigned_by_name: 'John Doe',
  notes: 'Expedited shipping requested'
};

this.serialNumberService.assignSerialNumber(assignment).subscribe(result => {
  console.log('Assigned:', result);
});
```

## Mock Data Development

### Enabling Mock Mode
The system includes a mock service toggle for development:

```typescript
// In your component
constructor(private mockToggleService: MockToggleService) {
  // Enable mock data
  this.mockToggleService.setMockMode(true);
}
```

### Mock Data Features
- Pre-generated serial numbers with various statuses
- Sample assignments and work order data
- Realistic statistics and trends
- CSV upload simulation with success/error scenarios

## Customization

### Adding New Product Models
Update the product models array in components:

```typescript
productModels = [
  'EyeFi Pro X1',
  'EyeFi Standard S2', 
  'EyeFi Enterprise E3',
  'EyeFi Lite L1',
  'EyeFi Advanced A2',
  'EyeFi Custom Model'  // Add new model
];
```

### Custom Serial Number Formats
Modify the generation logic in the generator component:

```typescript
private generateSerialNumber(prefix: string, number: number): string {
  // Custom format: PREFIX-YYYY-NNNNNN
  const year = new Date().getFullYear();
  const paddedNumber = String(number).padStart(6, '0');
  return `${prefix}-${year}-${paddedNumber}`;
}
```

### Status Workflow Customization
Add or modify status types in the model:

```typescript
type SerialNumberStatus = 
  'available' | 'assigned' | 'shipped' | 'returned' | 'defective' |
  'quarantined' | 'testing' | 'approved';  // Add custom statuses
```

## Integration Points

### Work Order System
The assignment component integrates with work orders:

```typescript
searchWorkOrder() {
  const woNumber = this.assignmentForm.get('workOrderNumber')?.value;
  this.workOrderService.getWorkOrder(woNumber).subscribe(wo => {
    this.assignmentForm.patchValue({
      woNbr: wo.number,
      woDueDate: wo.dueDate,
      woPart: wo.part,
      woQtyOrd: wo.quantity,
      woDescription: wo.description
    });
  });
}
```

### Shipping Integration
Connect with shipping systems for tracking:

```typescript
updateShipping(assignment: SerialNumberAssignment) {
  const shippingData = {
    serialNumber: assignment.serial_number,
    trackingNumber: assignment.tracking_number,
    carrier: 'FedEx',
    shippedDate: assignment.shipped_date
  };
  
  this.shippingService.updateTracking(shippingData).subscribe();
}
```

## Performance Considerations

### Large Dataset Handling
- Pagination implemented with 25/50/100/250 items per page
- Server-side filtering recommended for >10k records
- Virtual scrolling available for large lists

### Caching Strategy
```typescript
// Implement caching in service
private cache = new Map();

getAllSerialNumbers(): Observable<SerialNumber[]> {
  if (this.cache.has('serialNumbers')) {
    return of(this.cache.get('serialNumbers'));
  }
  
  return this.http.get<SerialNumber[]>(`${this.API_URL}/index.php`)
    .pipe(
      tap(data => this.cache.set('serialNumbers', data))
    );
}
```

## Security & Validation

### Input Validation
- Serial number format validation with regex patterns
- File type and size validation for uploads
- XSS protection on all text inputs
- SQL injection prevention through parameterized queries

### Access Control
```typescript
// Implement role-based access
canCreateSerialNumbers(): boolean {
  return this.authService.hasPermission('serial-numbers:create');
}

canAssignSerialNumbers(): boolean {
  return this.authService.hasPermission('serial-numbers:assign');
}
```

## Testing

### Unit Testing
```typescript
describe('SerialNumberService', () => {
  it('should generate batch serial numbers', () => {
    const batchData = { prefix: 'TEST', quantity: 5 };
    service.generateSerialNumbersBatch(batchData).subscribe(result => {
      expect(result.length).toBe(5);
      expect(result[0].serial_number).toMatch(/^TEST/);
    });
  });
});
```

### Integration Testing
- Mock backend responses for consistent testing
- Component interaction testing with TestBed
- E2E testing for complete workflows

## Deployment

### Production Checklist
- [ ] Configure production API endpoints
- [ ] Disable mock services in production
- [ ] Set up proper error handling and logging
- [ ] Configure caching strategies
- [ ] Implement proper backup procedures
- [ ] Set up monitoring and alerts

### Environment Configuration
```typescript
// environment.prod.ts
export const environment = {
  production: true,
  serialNumberApiUrl: 'https://api.eyefi.com/serial-numbers',
  mockDataEnabled: false
};
```

## Troubleshooting

### Common Issues

**Issue**: Serial numbers not displaying
**Solution**: Check API endpoint configuration and network connectivity

**Issue**: Mock data not working
**Solution**: Verify MockToggleService is properly configured and imported

**Issue**: Upload validation errors
**Solution**: Ensure CSV format matches expected headers and data types

**Issue**: Assignment fails
**Solution**: Verify work order integration and user permissions

### Debug Mode
Enable debug logging:

```typescript
// In service constructor
if (!environment.production) {
  console.log('Serial Number Service initialized in debug mode');
}
```

## Support & Contributing

### Reporting Issues
1. Check existing documentation and troubleshooting guides
2. Verify the issue in both mock and real data modes
3. Provide detailed reproduction steps
4. Include browser console errors and network logs

### Code Style
- Follow Angular style guide
- Use TypeScript strict mode
- Implement proper error handling
- Write comprehensive unit tests
- Document all public methods

## License & Credits

This module is part of the EyeFi manufacturing system and follows the same licensing terms as the main application. Built with Angular 18+, Bootstrap 4, and Font Awesome icons.

---

*Last updated: January 2024*
*Version: 1.0.0*