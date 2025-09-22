import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AllocationTableComponent } from '../../../shared/components/allocation-table/allocation-table.component';

@Component({
  selector: 'app-allocation-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AllocationTableComponent],
  template: `
    <div class="container-fluid">
      <div class="row justify-content-center">
        <div class="col-12">
          
          <!-- Breadcrumb -->
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb mb-0">
              <li class="breadcrumb-item">
                <a href="#" class="text-decoration-none" (click)="$event.preventDefault()">
                  <i class="mdi mdi-home-outline me-1"></i>Operations
                </a>
              </li>
              <li class="breadcrumb-item active" aria-current="page">
                Allocation Management
              </li>
            </ol>
          </nav>
          
          <!-- Page Header with Context -->
          <div class="mb-4">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <div class="d-flex align-items-center">
                <div class="bg-primary bg-gradient rounded-circle me-3 d-flex align-items-center justify-content-center" style="width: 60px; height: 60px;">
                  <i class="mdi mdi-swap-horizontal text-white fs-4"></i>
                </div>
                <div>
                  <h2 class="mb-1 text-primary">Work Order Allocation Management</h2>
                  <p class="text-muted mb-0">Manage allocation of work orders to sales orders with drag-and-drop, priority adjustment, and locking controls</p>
                </div>
              </div>
              
              <div class="d-flex gap-2">
                <button 
                  type="button" 
                  class="btn btn-outline-secondary"
                  (click)="toggleFilters()"
                  title="Toggle filter controls">
                  <i class="mdi mdi-filter-variant me-2"></i>{{ showFilters ? 'Hide' : 'Show' }} Filters
                </button>
                <button 
                  type="button" 
                  class="btn btn-outline-info"
                  (click)="exportAllocations()"
                  title="Export allocation data to Excel">
                  <i class="mdi mdi-download me-2"></i>Export Excel
                </button>
                <button 
                  type="button" 
                  class="btn btn-outline-warning"
                  (click)="runAutoAllocation()"
                  title="Run automatic allocation algorithm">
                  <i class="mdi mdi-auto-fix me-2"></i>Auto-Allocate
                </button>
                <button 
                  type="button" 
                  class="btn btn-primary"
                  (click)="bulkPriorityUpdate()"
                  title="Bulk update priorities">
                  <i class="mdi mdi-sort-numeric-variant me-2"></i>Bulk Actions
                </button>
              </div>
            </div>
            
            <div class="alert alert-primary border-primary border-opacity-25 bg-primary bg-opacity-10" role="alert">
              <div class="d-flex align-items-start">
                <i class="mdi mdi-information text-primary me-3 mt-1 fs-5"></i>
                <div>
                  <h6 class="alert-heading text-primary mb-2">Allocation Management Overview</h6>
                  <p class="mb-0">
                    This system provides <strong>intelligent work order allocation</strong> with FIFO logic, manual overrides, and priority management. 
                    Use filters to focus on specific parts or allocation types, and leverage bulk operations for efficient management.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Advanced Filters Card -->
          <div class="card shadow-sm border-0 mb-4" *ngIf="showFilters">
            <div class="card-header">
              <div class="d-flex align-items-center justify-content-between">
                <h6 class="mb-0 text-primary">
                  <i class="mdi mdi-filter-cog me-2"></i>Advanced Filters
                </h6>
                <button class="btn btn-sm btn-outline-secondary" (click)="clearFilters()">
                  <i class="mdi mdi-filter-remove me-1"></i>Clear All
                </button>
              </div>
            </div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-3">
                  <label for="partFilter" class="form-label">Part Number</label>
                  <input 
                    id="partFilter"
                    type="text" 
                    class="form-control" 
                    [(ngModel)]="partNumberFilter" 
                    (input)="onPartFilterChange()"
                    placeholder="Enter part number..."
                  >
                </div>
                <div class="col-md-3">
                  <label for="allocationTypeFilter" class="form-label">Allocation Type</label>
                  <select 
                    id="allocationTypeFilter"
                    class="form-select" 
                    [(ngModel)]="allocationTypeFilter"
                    (change)="onFilterChange()"
                  >
                    <option value="">All Types</option>
                    <option value="AUTOMATIC">Automatic</option>
                    <option value="MANUAL">Manual</option>
                    <option value="PRIORITY">Priority</option>
                  </select>
                </div>
                <div class="col-md-3">
                  <label for="riskFilter" class="form-label">Timing Risk</label>
                  <select 
                    id="riskFilter"
                    class="form-select" 
                    [(ngModel)]="riskFilter"
                    (change)="onFilterChange()"
                  >
                    <option value="">All Risk Levels</option>
                    <option value="HIGH">High Risk</option>
                    <option value="MEDIUM">Medium Risk</option>
                    <option value="LOW">Low Risk</option>
                  </select>
                </div>
                <div class="col-md-3">
                  <label for="statusFilter" class="form-label">Status</label>
                  <select 
                    id="statusFilter"
                    class="form-select" 
                    [(ngModel)]="statusFilter"
                    (change)="onFilterChange()"
                  >
                    <option value="">All Statuses</option>
                    <option value="locked">Locked Only</option>
                    <option value="unlocked">Unlocked Only</option>
                    <option value="manual">Manual Overrides</option>
                  </select>
                </div>
              </div>
              
              <div class="d-flex gap-2 mt-3">
                <button class="btn btn-primary" (click)="applyFilters()">
                  <i class="mdi mdi-filter-check me-1"></i>Apply Filters
                </button>
                <button class="btn btn-outline-secondary" (click)="clearFilters()">
                  <i class="mdi mdi-filter-remove me-1"></i>Clear Filters
                </button>
              </div>
            </div>
          </div>

          <!-- Allocation Table -->
          <div class="card shadow-sm border-0">
            <div class="card-header">
              <div class="d-flex align-items-center justify-content-between">
                <h6 class="mb-0 text-primary">
                  <i class="mdi mdi-table me-2"></i>Allocation Details
                </h6>
                <div class="d-flex align-items-center gap-3">
                  <small class="text-muted" *ngIf="!showAllParts">
                    Filtered by part: <strong>{{ currentPartNumber }}</strong>
                  </small>
                  <small class="text-muted" *ngIf="showAllParts">
                    Showing all parts with allocations
                  </small>
                </div>
              </div>
            </div>
            <div class="card-body p-0">
              <app-allocation-table 
                [partNumber]="currentPartNumber" 
                [showAllParts]="showAllParts">
              </app-allocation-table>
            </div>
          </div>

          <!-- Bulk Operations Modal Trigger (Hidden) -->
          <!-- Future: Add modals for bulk operations here -->

        </div>
      </div>
    </div>
  `,
  styleUrls: ['./allocation-management.component.scss']
})
export class AllocationManagementComponent implements OnInit {
  
  // Component state
  currentPartNumber: string = '';
  showAllParts: boolean = true;
  showFilters: boolean = false;

  // Filters
  partNumberFilter: string = '';
  allocationTypeFilter: string = '';
  riskFilter: string = '';
  statusFilter: string = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    // Check if a specific part number was passed in the route
    this.route.queryParams.subscribe(params => {
      if (params['partNumber']) {
        this.currentPartNumber = params['partNumber'];
        this.showAllParts = false;
      }
    });
  }

  onPartFilterChange() {
    if (this.partNumberFilter.trim()) {
      this.currentPartNumber = this.partNumberFilter.trim();
      this.showAllParts = false;
    } else {
      this.currentPartNumber = '';
      this.showAllParts = true;
    }
  }

  onFilterChange() {
    // Apply filters to the allocation table
    console.log('Filters changed:', {
      allocationType: this.allocationTypeFilter,
      risk: this.riskFilter,
      status: this.statusFilter
    });
    // TODO: Pass these filters to the allocation table component
    // The allocation table could accept additional filter inputs
  }

  clearFilters() {
    this.partNumberFilter = '';
    this.allocationTypeFilter = '';
    this.riskFilter = '';
    this.statusFilter = '';
    this.currentPartNumber = '';
    this.showAllParts = true;
    console.log('All filters cleared');
  }

  applyFilters() {
    this.onFilterChange();
    console.log('Filters applied successfully');
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  runAutoAllocation() {
    if (confirm('This will reset all manual allocations and run automatic allocation. Are you sure?')) {
      console.log('Running auto-allocation...');
      // TODO: Implement auto-allocation logic
      // This would call the allocation service to recalculate all allocations
    }
  }

  bulkPriorityUpdate() {
    console.log('Opening bulk priority update interface...');
    // TODO: Implement bulk priority update modal or interface
    // This could show a modal with selected rows and priority input
  }

  bulkLockUnlock() {
    console.log('Opening bulk lock/unlock interface...');
    // TODO: Implement bulk lock/unlock modal
    // This could show selected allocations and toggle lock status
  }

  resetAllAllocations() {
    if (confirm('This will remove all manual overrides and reset to automatic allocation. Are you sure?')) {
      console.log('Resetting all allocations...');
      // TODO: Implement reset functionality
      // This would call the service to clear manual overrides
    }
  }

  exportAllocations() {
    console.log('Exporting allocations to Excel...');
    // TODO: Implement Excel export functionality
    // This would generate and download an Excel file with current allocation data
  }
}