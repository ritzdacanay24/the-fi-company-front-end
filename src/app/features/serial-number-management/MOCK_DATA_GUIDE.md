# Mock Data Guide for Serial Number Management System

## Overview

The Serial Number Management System includes comprehensive mock data services to facilitate development, testing, and demonstrations without requiring a live backend. This guide explains how to use, configure, and customize the mock data system.

## Mock Service Architecture

### MockToggleService
The `MockToggleService` provides a centralized way to switch between real API calls and mock data throughout the application.

```typescript
// Enable mock mode globally
this.mockToggleService.setMockMode(true);

// Check current mode
const isMockMode = this.mockToggleService.isMockMode();

// Subscribe to mode changes
this.mockToggleService.mockMode$.subscribe(isMock => {
  console.log('Mock mode:', isMock ? 'enabled' : 'disabled');
});
```

### SerialNumberMockService
Provides realistic mock data for all serial number operations:

```typescript
@Injectable()
export class SerialNumberMockService {
  // Sample data generation
  private generateMockSerialNumbers(count: number): SerialNumber[]
  private generateMockAssignments(): SerialNumberAssignment[]
  private generateMockStats(): SerialNumberStats
  
  // API method implementations
  getAllSerialNumbers(): Observable<SerialNumber[]>
  createSerialNumber(sn: SerialNumber): Observable<SerialNumber>
  // ... other methods
}
```

## Available Mock Data

### Serial Numbers Dataset
The mock service includes 250+ pre-generated serial numbers with:

- **Product Models**: EyeFi Pro X1, Standard S2, Enterprise E3, Lite L1, Advanced A2
- **Status Distribution**:
  - Available: 125 items (50%)
  - Assigned: 75 items (30%)
  - Shipped: 35 items (14%)
  - Returned: 10 items (4%)
  - Defective: 5 items (2%)
- **Batch Numbers**: BATCH-2024-MMDD format
- **Date Ranges**: Generated from 2023-01-01 to present
- **Hardware Versions**: 1.0.0 to 1.3.0
- **Firmware Versions**: 2.0.1 to 2.2.4

### Assignment Data
50+ sample assignments with:
- Realistic customer names (Acme Corp, TechSolutions, etc.)
- Work order numbers (WO-12345 format)
- Purchase orders (PO-ABCD1234 format)
- Assignment dates spanning last 6 months
- Mixed shipping statuses

### Statistics Data
Comprehensive analytics including:
- Status distribution charts
- Product model breakdowns
- Monthly generation trends
- Assignment patterns
- Usage statistics

## Configuration

### Environment Setup
Configure mock data in your environment files:

```typescript
// environment.ts (development)
export const environment = {
  production: false,
  mockDataEnabled: true,
  mockDataDelay: 500, // Simulate network delay (ms)
};

// environment.prod.ts (production)
export const environment = {
  production: true,
  mockDataEnabled: false,
};
```

### Service Registration
Mock services are automatically registered when mock mode is enabled:

```typescript
// In serial-number-management.module.ts
providers: [
  SerialNumberService,
  SerialNumberMockService,
  MockToggleService,
  // Provider factory switches between real and mock services
  {
    provide: SerialNumberService,
    useFactory: (
      realService: SerialNumberService, 
      mockService: SerialNumberMockService,
      toggleService: MockToggleService
    ) => {
      return toggleService.isMockMode() ? mockService : realService;
    },
    deps: [SerialNumberService, SerialNumberMockService, MockToggleService]
  }
]
```

## Mock Data Scenarios

### Serial Number Generation
The mock service simulates batch generation with realistic timing:

```typescript
generateSerialNumbersBatch(batchData: any): Observable<any> {
  // Simulate processing time
  return of({
    success: true,
    generated: batchData.quantity,
    startingNumber: batchData.startNumber,
    prefix: batchData.prefix,
    batchNumber: this.generateBatchNumber()
  }).pipe(
    delay(2000) // 2-second simulation
  );
}
```

### Bulk Upload Simulation
Mock CSV/Excel upload with success and error scenarios:

```typescript
bulkUploadSerialNumbers(file: File): Observable<any> {
  const fileName = file.name.toLowerCase();
  
  // Simulate different outcomes based on filename
  if (fileName.includes('error')) {
    return this.simulateUploadWithErrors();
  } else if (fileName.includes('large')) {
    return this.simulateLargeUpload();
  } else {
    return this.simulateSuccessfulUpload();
  }
}

private simulateUploadWithErrors(): Observable<any> {
  return of({
    success: false,
    totalRows: 25,
    successCount: 18,
    errorCount: 7,
    errors: [
      'Row 3: Duplicate serial number EYE2024001003',
      'Row 8: Invalid product model',
      'Row 12: Missing required field: serial_number',
      'Row 15: Invalid date format',
      'Row 19: Serial number too long',
      'Row 22: Invalid batch number format',
      'Row 24: Missing manufacture date'
    ]
  }).pipe(delay(3000));
}
```

## Customizing Mock Data

### Adding New Product Models
Extend the mock data generator to include new models:

```typescript
private productModels = [
  'EyeFi Pro X1',
  'EyeFi Standard S2',
  'EyeFi Enterprise E3',
  'EyeFi Lite L1',
  'EyeFi Advanced A2',
  'EyeFi Custom Model',    // Add new models here
  'EyeFi Special Edition'
];
```

### Custom Serial Number Patterns
Modify the serial number generation logic:

```typescript
private generateSerialNumber(index: number): string {
  const prefixes = ['EYE', 'EFI', 'PRO', 'STD', 'ENT'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const year = new Date().getFullYear();
  const sequence = String(20240000 + index).padStart(9, '0');
  
  // Custom format: PREFIX-YYYY-NNNNNNNNN
  return `${prefix}-${year}-${sequence}`;
}
```

### Realistic Assignment Scenarios
Create domain-specific customer and work order data:

```typescript
private customers = [
  { name: 'Acme Manufacturing', po_format: 'ACM-{YYYY}-{NNN}' },
  { name: 'TechSolutions Inc', po_format: 'TS{MMDD}{NNN}' },
  { name: 'Global Industries', po_format: 'GI-{YYYY}{MM}-{NNNN}' },
  // Add your customer patterns
];

private generateCustomerAssignment(): Partial<SerialNumberAssignment> {
  const customer = this.customers[Math.floor(Math.random() * this.customers.length)];
  return {
    customer_name: customer.name,
    customer_po: this.generatePO(customer.po_format),
    work_order_number: this.generateWorkOrder(),
    assigned_date: this.getRandomDate(),
  };
}
```

## Testing with Mock Data

### Component Testing
Use mock services in unit tests:

```typescript
describe('SnListComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SnListComponent],
      providers: [
        { provide: SerialNumberService, useClass: SerialNumberMockService },
        MockToggleService
      ]
    });
  });

  it('should load mock serial numbers', () => {
    component.ngOnInit();
    expect(component.serialNumbers$.subscribe(data => {
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('serial_number');
    }));
  });
});
```

### Integration Testing
Test complete workflows with mock data:

```typescript
it('should complete assignment workflow', async () => {
  // Enable mock mode
  mockToggleService.setMockMode(true);
  
  // Load available serial numbers
  const serialNumbers = await service.getAvailableSerialNumbers(10).toPromise();
  expect(serialNumbers.length).toBe(10);
  
  // Create assignment
  const assignment = {
    serial_number_id: serialNumbers[0].id,
    customer_name: 'Test Customer',
    assigned_date: new Date().toISOString().split('T')[0]
  };
  
  const result = await service.assignSerialNumber(assignment).toPromise();
  expect(result.success).toBe(true);
});
```

## Mock Data Validation

### Data Integrity Checks
The mock service includes validation to ensure data consistency:

```typescript
private validateMockData(): boolean {
  // Check for duplicate serial numbers
  const serialNumbers = this.mockData.map(sn => sn.serial_number);
  const uniqueSerialNumbers = new Set(serialNumbers);
  if (serialNumbers.length !== uniqueSerialNumbers.size) {
    console.warn('Mock data contains duplicate serial numbers');
    return false;
  }
  
  // Check date consistency
  const invalidDates = this.mockData.filter(sn => 
    sn.created_at && sn.updated_at && 
    new Date(sn.created_at) > new Date(sn.updated_at)
  );
  if (invalidDates.length > 0) {
    console.warn('Mock data contains invalid date relationships');
    return false;
  }
  
  return true;
}
```

### Real-time Data Updates
Simulate real-time updates with WebSocket-like behavior:

```typescript
// Simulate status updates
setInterval(() => {
  if (this.mockToggleService.isMockMode()) {
    this.simulateStatusUpdate();
  }
}, 30000); // Every 30 seconds

private simulateStatusUpdate(): void {
  const availableItems = this.mockData.filter(sn => sn.status === 'available');
  if (availableItems.length > 0) {
    const randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];
    randomItem.status = 'assigned';
    randomItem.updated_at = new Date().toISOString();
    
    // Emit update event
    this.dataUpdatedSubject.next(randomItem);
  }
}
```

## Performance with Mock Data

### Large Dataset Simulation
Generate large datasets for performance testing:

```typescript
generateLargeDataset(size: number): SerialNumber[] {
  const batchSize = 1000;
  const batches = Math.ceil(size / batchSize);
  const result: SerialNumber[] = [];
  
  for (let i = 0; i < batches; i++) {
    const batchStart = i * batchSize;
    const batchEnd = Math.min(batchStart + batchSize, size);
    const batch = this.generateSerialNumberBatch(batchStart, batchEnd);
    result.push(...batch);
  }
  
  return result;
}
```

### Pagination Mock
Simulate server-side pagination:

```typescript
getSerialNumbers(page: number, pageSize: number, filters?: any): Observable<any> {
  let filteredData = this.applyFilters(this.mockData, filters);
  
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageData = filteredData.slice(start, end);
  
  return of({
    data: pageData,
    pagination: {
      page,
      pageSize,
      total: filteredData.length,
      totalPages: Math.ceil(filteredData.length / pageSize)
    }
  }).pipe(delay(300)); // Simulate network latency
}
```

## Deployment Considerations

### Production Safety
Ensure mock services are disabled in production:

```typescript
// In main.ts or app.module.ts
if (environment.production && environment.mockDataEnabled) {
  throw new Error('Mock data cannot be enabled in production');
}
```

### Environment Detection
Automatically disable mocks based on URL:

```typescript
// In MockToggleService constructor
constructor() {
  const hostname = window.location.hostname;
  const isProduction = hostname.includes('api.eyefi.com') || 
                      hostname.includes('.com') && 
                      !hostname.includes('dev') && 
                      !hostname.includes('staging');
  
  this.mockEnabled = !isProduction && environment.mockDataEnabled;
}
```

## Troubleshooting Mock Data

### Common Issues

**Issue**: Mock data not loading
**Solution**: 
1. Check MockToggleService is properly injected
2. Verify environment.mockDataEnabled is true
3. Ensure proper service registration

**Issue**: Inconsistent mock responses
**Solution**:
1. Clear browser cache/localStorage
2. Restart development server
3. Check for race conditions in async operations

**Issue**: Mock upload simulation not working
**Solution**:
1. Verify file input is properly bound
2. Check file type validation logic
3. Ensure proper delay timing for UX

### Debug Tools
Enable detailed mock logging:

```typescript
// In MockToggleService
private debugMode = !environment.production;

log(message: string, data?: any): void {
  if (this.debugMode) {
    console.log(`[MOCK] ${message}`, data);
  }
}
```

Use debug panel for real-time control:

```typescript
// Add debug component
@Component({
  template: `
    <div class="mock-debug-panel" *ngIf="!environment.production">
      <h6>Mock Data Debug</h6>
      <label>
        <input type="checkbox" 
               [checked]="mockToggleService.isMockMode()"
               (change)="toggleMock($event)">
        Enable Mock Data
      </label>
      <button (click)="resetMockData()">Reset Data</button>
      <button (click)="generateTestData()">Generate Test Data</button>
    </div>
  `
})
export class MockDebugComponent { /* ... */ }
```

---

*This guide covers the comprehensive mock data system for development and testing. For production deployment, ensure all mock services are properly disabled.*