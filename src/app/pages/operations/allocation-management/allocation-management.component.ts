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
    <div class="allocation-management-page">
      <div class="page-header">
        <h1><i class="fas fa-exchange-alt"></i> Work Order Allocation Management</h1>
        <p class="page-description">
          Manage the allocation of work orders to sales orders. Drag and drop to reassign, 
          adjust priorities, and lock allocations to prevent automatic changes.
        </p>
      </div>

      <div class="filter-controls" *ngIf="showFilters">
        <div class="row">
          <div class="col-md-3">
            <label for="partFilter">Part Number:</label>
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
            <label for="allocationTypeFilter">Allocation Type:</label>
            <select 
              id="allocationTypeFilter"
              class="form-control" 
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
            <label for="riskFilter">Timing Risk:</label>
            <select 
              id="riskFilter"
              class="form-control" 
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
            <label for="statusFilter">Status:</label>
            <select 
              id="statusFilter"
              class="form-control" 
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
        
        <div class="filter-actions">
          <button class="btn btn-outline-secondary" (click)="clearFilters()">
            <i class="fas fa-times"></i> Clear Filters
          </button>
          <button class="btn btn-primary" (click)="applyFilters()">
            <i class="fas fa-filter"></i> Apply Filters
          </button>
        </div>
      </div>

      <div class="allocation-content">
        <app-allocation-table 
          [partNumber]="currentPartNumber" 
          [showAllParts]="showAllParts">
        </app-allocation-table>
      </div>

      <div class="page-actions">
        <div class="action-group">
          <h4>Quick Actions</h4>
          <button class="btn btn-outline-info" (click)="toggleFilters()">
            <i class="fas fa-filter"></i> 
            {{ showFilters ? 'Hide' : 'Show' }} Filters
          </button>
          <button class="btn btn-outline-warning" (click)="exportAllocations()">
            <i class="fas fa-download"></i> Export to Excel
          </button>
          <button class="btn btn-outline-success" (click)="runAutoAllocation()">
            <i class="fas fa-magic"></i> Run Auto-Allocation
          </button>
        </div>

        <div class="action-group">
          <h4>Bulk Operations</h4>
          <button class="btn btn-outline-primary" (click)="bulkPriorityUpdate()">
            <i class="fas fa-sort-numeric-up"></i> Update Priorities
          </button>
          <button class="btn btn-outline-danger" (click)="bulkLockUnlock()">
            <i class="fas fa-lock"></i> Bulk Lock/Unlock
          </button>
          <button class="btn btn-outline-secondary" (click)="resetAllAllocations()">
            <i class="fas fa-undo"></i> Reset to Auto
          </button>
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
  }

  clearFilters() {
    this.partNumberFilter = '';
    this.allocationTypeFilter = '';
    this.riskFilter = '';
    this.statusFilter = '';
    this.currentPartNumber = '';
    this.showAllParts = true;
  }

  applyFilters() {
    this.onFilterChange();
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  exportAllocations() {
    console.log('Exporting allocations to Excel...');
    // Implement Excel export functionality
  }

  runAutoAllocation() {
    const confirmed = confirm('This will reset all manual allocations and run automatic allocation. Are you sure?');
    if (confirmed) {
      console.log('Running auto-allocation...');
      // Implement auto-allocation logic
    }
  }

  bulkPriorityUpdate() {
    console.log('Opening bulk priority update modal...');
    // Implement bulk priority update
  }

  bulkLockUnlock() {
    console.log('Opening bulk lock/unlock modal...');
    // Implement bulk lock/unlock
  }

  resetAllAllocations() {
    const confirmed = confirm('This will remove all manual overrides and reset to automatic allocation. Are you sure?');
    if (confirmed) {
      console.log('Resetting all allocations...');
      // Implement reset functionality
    }
  }
}