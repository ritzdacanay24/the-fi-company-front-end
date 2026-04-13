# Navigation Guide for Serial Number Management System

## Overview

This guide provides comprehensive navigation instructions for the EyeFi Serial Number Management System, including user workflows, access patterns, and integration with the main application navigation.

## Main Navigation Structure

### Primary Navigation Menu
Add the Serial Number Management link to your main application navigation:

```html
<!-- In your main navigation component -->
<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
  <div class="navbar-nav">
    <!-- Existing navigation items -->
    <a class="nav-item nav-link" routerLink="/operations">
      <i class="fas fa-cogs"></i> Operations
    </a>
    
    <!-- Serial Number Management -->
    <a class="nav-item nav-link" routerLink="/serial-numbers" routerLinkActive="active">
      <i class="fas fa-barcode"></i> Serial Numbers
    </a>
    
    <!-- Other navigation items -->
  </div>
</nav>
```

### Breadcrumb Navigation
Implement breadcrumbs for better user orientation:

```html
<!-- In serial-number-management.component.html -->
<nav aria-label="breadcrumb">
  <ol class="breadcrumb">
    <li class="breadcrumb-item">
      <a routerLink="/">Home</a>
    </li>
    <li class="breadcrumb-item">
      <a routerLink="/operations">Operations</a>
    </li>
    <li class="breadcrumb-item active" aria-current="page">
      Serial Numbers
    </li>
  </ol>
</nav>
```

## Routing Configuration

### Main Module Routes
```typescript
// serial-number-management-routing.module.ts
const routes: Routes = [
  {
    path: '',
    component: SerialNumberManagementComponent,
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { 
        path: 'list', 
        component: SnListComponent,
        data: { title: 'Serial Number List' }
      },
      { 
        path: 'generate', 
        component: SnGeneratorComponent,
        data: { title: 'Generate Serial Numbers' }
      },
      { 
        path: 'upload', 
        component: SnUploadComponent,
        data: { title: 'Bulk Upload' }
      },
      { 
        path: 'assignment', 
        component: SnAssignmentComponent,
        data: { title: 'Assignment Management' }
      },
      { 
        path: 'stats', 
        component: SnStatsComponent,
        data: { title: 'Statistics & Reports' }
      }
    ]
  }
];
```

### App-Level Integration
```typescript
// app-routing.module.ts
const routes: Routes = [
  // Other routes...
  {
    path: 'serial-numbers',
    loadChildren: () => import('./features/serial-number-management/serial-number-management.module')
      .then(m => m.SerialNumberManagementModule),
    canActivate: [AuthGuard], // Optional: Add authentication
    data: { 
      title: 'Serial Number Management',
      permissions: ['serial-numbers:read'] // Optional: Add permissions
    }
  }
];
```

## Tab-Based Navigation

### Main Component Template
Create a tabbed interface for easy navigation between features:

```html
<!-- serial-number-management.component.html -->
<div class="serial-number-management">
  <div class="page-header">
    <h2><i class="fas fa-barcode"></i> Serial Number Management</h2>
    <p class="page-description">
      Manage EyeFi device serial numbers throughout their lifecycle
    </p>
  </div>

  <!-- Tab Navigation -->
  <ul class="nav nav-tabs nav-tabs-custom" role="tablist">
    <li class="nav-item">
      <a class="nav-link" 
         routerLink="/serial-numbers/list" 
         routerLinkActive="active"
         [routerLinkActiveOptions]="{exact: false}">
        <i class="fas fa-list"></i> List & Manage
      </a>
    </li>
    <li class="nav-item">
      <a class="nav-link" 
         routerLink="/serial-numbers/generate" 
         routerLinkActive="active">
        <i class="fas fa-plus-circle"></i> Generate
      </a>
    </li>
    <li class="nav-item">
      <a class="nav-link" 
         routerLink="/serial-numbers/upload" 
         routerLinkActive="active">
        <i class="fas fa-upload"></i> Bulk Upload
      </a>
    </li>
    <li class="nav-item">
      <a class="nav-link" 
         routerLink="/serial-numbers/assignment" 
         routerLinkActive="active">
        <i class="fas fa-clipboard-list"></i> Assignment
      </a>
    </li>
    <li class="nav-item">
      <a class="nav-link" 
         routerLink="/serial-numbers/stats" 
         routerLinkActive="active">
        <i class="fas fa-chart-bar"></i> Statistics
      </a>
    </li>
  </ul>

  <!-- Router Outlet for Child Components -->
  <div class="tab-content">
    <router-outlet></router-outlet>
  </div>
</div>
```

### Tab Styling
```scss
// serial-number-management.component.scss
.nav-tabs-custom {
  border-bottom: 2px solid #dee2e6;
  margin-bottom: 25px;

  .nav-link {
    border: none;
    color: #6c757d;
    padding: 12px 20px;
    font-weight: 500;
    transition: all 0.2s ease;

    i {
      margin-right: 6px;
    }

    &:hover {
      color: #3498db;
      border-bottom: 2px solid #3498db;
    }

    &.active {
      color: #3498db;
      background-color: transparent;
      border-bottom: 2px solid #3498db;
    }
  }
}
```

## User Workflows

### Workflow 1: Generate New Serial Numbers

**Navigation Path**: Home → Serial Numbers → Generate

1. **Entry Point**: Click "Serial Numbers" in main nav
2. **Default Landing**: List view (shows existing numbers)
3. **Action**: Click "Generate" tab
4. **Options**: 
   - Quick generate (preset quantities)
   - Custom batch (detailed configuration)
   - Manual entry (individual numbers)

```typescript
// Navigation helper methods
navigateToGenerate(): void {
  this.router.navigate(['/serial-numbers/generate']);
}

generateAndViewResults(): void {
  // After generation, navigate to list with filter
  this.router.navigate(['/serial-numbers/list'], {
    queryParams: { 
      batch: this.lastGeneratedBatch,
      status: 'available' 
    }
  });
}
```

### Workflow 2: Bulk Upload Serial Numbers

**Navigation Path**: Home → Serial Numbers → Upload

1. **Entry Point**: Serial Numbers → Upload tab
2. **Process**: 
   - Download template
   - Prepare CSV/Excel file
   - Upload and validate
   - Review results
3. **Next Steps**: Navigate to List view to see uploaded items

```typescript
// Post-upload navigation
handleUploadSuccess(result: UploadResult): void {
  // Show success message
  this.toastr.success(`Uploaded ${result.successCount} serial numbers`);
  
  // Navigate to list with filter for uploaded batch
  if (result.batchNumber) {
    this.router.navigate(['/serial-numbers/list'], {
      queryParams: { batch: result.batchNumber }
    });
  }
}
```

### Workflow 3: Assign Serial Numbers

**Navigation Path**: Serial Numbers → Assignment

1. **Search Available**: Find unassigned serial numbers
2. **Select Items**: Choose serial numbers for assignment
3. **Enter Details**: Customer info, work order, dates
4. **Confirm Assignment**: Review and submit
5. **View Results**: See assigned items in list view

```typescript
// Assignment completion navigation
completeAssignment(assignment: SerialNumberAssignment): void {
  this.toastr.success('Assignment completed successfully');
  
  // Navigate to list with assignment filter
  this.router.navigate(['/serial-numbers/list'], {
    queryParams: { 
      status: 'assigned',
      customer: assignment.customer_name
    }
  });
}
```

### Workflow 4: View Statistics and Reports

**Navigation Path**: Serial Numbers → Statistics

1. **Dashboard View**: Overview cards and charts
2. **Drill-down**: Click metrics to filter list view
3. **Export**: Generate reports for external use

```typescript
// Navigation from stats to filtered lists
viewStatusDetails(status: string): void {
  this.router.navigate(['/serial-numbers/list'], {
    queryParams: { status }
  });
}

viewModelDetails(model: string): void {
  this.router.navigate(['/serial-numbers/list'], {
    queryParams: { productModel: model }
  });
}
```

## Quick Actions & Shortcuts

### Action Menu Integration
Add quick actions to main navigation:

```html
<!-- Quick action dropdown -->
<div class="dropdown">
  <button class="btn btn-primary dropdown-toggle" type="button" data-toggle="dropdown">
    <i class="fas fa-plus"></i> Quick Actions
  </button>
  <div class="dropdown-menu">
    <a class="dropdown-item" (click)="navigateToGenerate()">
      <i class="fas fa-plus-circle"></i> Generate Serial Numbers
    </a>
    <a class="dropdown-item" (click)="navigateToUpload()">
      <i class="fas fa-upload"></i> Bulk Upload
    </a>
    <a class="dropdown-item" (click)="navigateToAssignment()">
      <i class="fas fa-clipboard-list"></i> New Assignment
    </a>
    <div class="dropdown-divider"></div>
    <a class="dropdown-item" (click)="navigateToStats()">
      <i class="fas fa-chart-bar"></i> View Statistics
    </a>
  </div>
</div>
```

### Keyboard Shortcuts
Implement keyboard navigation:

```typescript
@HostListener('keydown', ['$event'])
handleKeyboardShortcuts(event: KeyboardEvent): void {
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case '1':
        event.preventDefault();
        this.router.navigate(['/serial-numbers/list']);
        break;
      case '2':
        event.preventDefault();
        this.router.navigate(['/serial-numbers/generate']);
        break;
      case '3':
        event.preventDefault();
        this.router.navigate(['/serial-numbers/upload']);
        break;
      case '4':
        event.preventDefault();
        this.router.navigate(['/serial-numbers/assignment']);
        break;
      case '5':
        event.preventDefault();
        this.router.navigate(['/serial-numbers/stats']);
        break;
    }
  }
}
```

## Mobile Navigation

### Responsive Menu
Adapt navigation for mobile devices:

```html
<!-- Mobile-friendly tab navigation -->
<div class="nav-tabs-mobile d-md-none">
  <div class="dropdown">
    <button class="btn btn-outline-primary dropdown-toggle w-100" 
            type="button" data-toggle="dropdown">
      <i class="fas fa-bars"></i> {{ getCurrentTabName() }}
    </button>
    <div class="dropdown-menu w-100">
      <a class="dropdown-item" routerLink="/serial-numbers/list">
        <i class="fas fa-list"></i> List & Manage
      </a>
      <a class="dropdown-item" routerLink="/serial-numbers/generate">
        <i class="fas fa-plus-circle"></i> Generate
      </a>
      <a class="dropdown-item" routerLink="/serial-numbers/upload">
        <i class="fas fa-upload"></i> Bulk Upload
      </a>
      <a class="dropdown-item" routerLink="/serial-numbers/assignment">
        <i class="fas fa-clipboard-list"></i> Assignment
      </a>
      <a class="dropdown-item" routerLink="/serial-numbers/stats">
        <i class="fas fa-chart-bar"></i> Statistics
      </a>
    </div>
  </div>
</div>

<!-- Desktop tab navigation -->
<ul class="nav nav-tabs d-none d-md-flex">
  <!-- Tab items here -->
</ul>
```

### Touch-Friendly Actions
Optimize for touch interactions:

```scss
@media (max-width: 768px) {
  .nav-tabs-mobile {
    margin-bottom: 20px;
    
    .dropdown-menu {
      .dropdown-item {
        padding: 12px 20px;
        font-size: 1rem;
        
        i {
          margin-right: 10px;
          width: 20px;
        }
      }
    }
  }
  
  // Larger touch targets
  .btn, .nav-link {
    min-height: 44px;
    display: flex;
    align-items: center;
  }
}
```

## Integration with External Systems

### Work Order System Navigation
Link to work order details:

```typescript
viewWorkOrder(workOrderNumber: string): void {
  // Navigate to work order system
  window.open(`/work-orders/${workOrderNumber}`, '_blank');
}

createWorkOrderFromSerial(serialNumber: string): void {
  // Navigate to work order creation with pre-filled serial
  this.router.navigate(['/work-orders/create'], {
    queryParams: { serialNumber }
  });
}
```

### Customer Management Integration
Connect with customer system:

```typescript
viewCustomerDetails(customerId: string): void {
  this.router.navigate(['/customers', customerId]);
}

assignToExistingCustomer(): void {
  // Open customer picker modal
  const modalRef = this.modalService.open(CustomerPickerComponent);
  modalRef.result.then(customer => {
    this.assignmentForm.patchValue({
      customerName: customer.name,
      customerId: customer.id
    });
  });
}
```

## Search and Filtering Navigation

### Global Search Integration
Add serial number search to global search:

```typescript
// In global search component
searchSerialNumbers(query: string): void {
  this.router.navigate(['/serial-numbers/list'], {
    queryParams: { search: query }
  });
}
```

### Deep Linking Support
Support URL parameters for direct access:

```typescript
// In SnListComponent
ngOnInit(): void {
  this.route.queryParams.subscribe(params => {
    if (params.search) {
      this.searchForm.patchValue({ search: params.search });
    }
    if (params.status) {
      this.searchForm.patchValue({ status: params.status });
    }
    if (params.batch) {
      this.searchForm.patchValue({ batchNumber: params.batch });
    }
    
    this.applyFilters();
  });
}
```

## Error Handling and Fallbacks

### Navigation Error Handling
Handle routing errors gracefully:

```typescript
navigateWithErrorHandling(route: string[]): void {
  this.router.navigate(route).catch(error => {
    console.error('Navigation failed:', error);
    this.toastr.error('Navigation failed. Please try again.');
    
    // Fallback to main list view
    this.router.navigate(['/serial-numbers/list']);
  });
}
```

### Offline Navigation
Handle offline scenarios:

```typescript
// In navigation service
canNavigate(route: string): boolean {
  if (!navigator.onLine) {
    this.toastr.warning('Some features require an internet connection');
    return false;
  }
  return true;
}
```

## Accessibility

### Keyboard Navigation
Ensure tab navigation works properly:

```html
<!-- Add proper tab indexes -->
<a class="nav-link" 
   routerLink="/serial-numbers/list" 
   tabindex="1"
   role="tab"
   [attr.aria-selected]="isCurrentRoute('/serial-numbers/list')">
  List & Manage
</a>
```

### Screen Reader Support
Add ARIA labels and descriptions:

```html
<nav role="navigation" aria-label="Serial number management navigation">
  <ul class="nav nav-tabs" role="tablist">
    <li class="nav-item" role="presentation">
      <a class="nav-link" 
         role="tab"
         [attr.aria-selected]="isActive"
         aria-describedby="list-tab-description">
        List & Manage
      </a>
    </li>
  </ul>
  
  <div id="list-tab-description" class="sr-only">
    View and manage existing serial numbers with filtering and search options
  </div>
</nav>
```

## Performance Considerations

### Lazy Loading
Implement lazy loading for better performance:

```typescript
// Route configuration with preloading
{
  path: 'serial-numbers',
  loadChildren: () => import('./features/serial-number-management/serial-number-management.module')
    .then(m => m.SerialNumberManagementModule),
  data: { preload: true }
}
```

### Navigation Caching
Cache navigation state:

```typescript
// Navigation state service
@Injectable()
export class NavigationStateService {
  private navigationStack: string[] = [];
  
  pushState(route: string): void {
    this.navigationStack.push(route);
    if (this.navigationStack.length > 10) {
      this.navigationStack.shift();
    }
  }
  
  goBack(): void {
    this.navigationStack.pop(); // Remove current
    const previous = this.navigationStack.pop(); // Get previous
    if (previous) {
      this.router.navigate([previous]);
    }
  }
}
```

---

*This navigation guide ensures users can efficiently navigate through all serial number management features with clear pathways and intuitive interactions.*