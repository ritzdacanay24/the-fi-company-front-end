import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { ULLabelService } from '../../services/ul-label.service';
import { ULLabel } from '../../models/ul-label.model';
import { ColDef, GridApi, GridReadyEvent, GridOptions } from 'ag-grid-community';
import { BreadcrumbComponent, BreadcrumbItem } from "@app/shared/components/breadcrumb/breadcrumb.component";
import moment from 'moment';
import { AgGridModule } from 'ag-grid-angular';

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule, BreadcrumbComponent],
  selector: 'app-ul-labels-report',
  templateUrl: './ul-labels-report.component.html',
  styleUrls: ['./ul-labels-report.component.scss']
})
export class ULLabelsReportComponent implements OnInit {
  filterForm: FormGroup;
  ulLabels: ULLabel[] = [];
  filteredData: ULLabel[] = [];
  isLoading = false;
  gridApi!: GridApi;

  // AG Grid Configuration
  columnDefs: ColDef[] = [
    {
      headerName: 'UL Number',
      field: 'ul_number',
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
      pinned: 'left',
      width: 150,
      cellRenderer: (params: any) => {
        return `<strong class="text-primary">${params.value}</strong>`;
      },
      filterParams: {
        filterOptions: ['contains', 'startsWith', 'endsWith'],
        defaultOption: 'contains'
      }
    },
    {
      headerName: 'Description',
      field: 'description',
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
      flex: 1,
      minWidth: 200,
      tooltipField: 'description',
      filterParams: {
        filterOptions: ['contains', 'startsWith'],
        defaultOption: 'contains'
      }
    },
    {
      headerName: 'Category',
      field: 'category',
      sortable: true,
      filter: 'agSetColumnFilter',
      floatingFilter: true,
      width: 120,
      filterParams: {
        values: ['Electronics', 'Wiring', 'Appliances', 'Medical', 'New', 'Used'],
        selectAllOnMiniFilter: true
      }
    },
    {
      headerName: 'Manufacturer',
      field: 'manufacturer',
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
      width: 150,
      filterParams: {
        filterOptions: ['contains', 'equals'],
        defaultOption: 'contains'
      }
    },
    {
      headerName: 'Status',
      field: 'status',
      sortable: true,
      filter: 'agSetColumnFilter',
      floatingFilter: true,
      width: 100,
      cellRenderer: (params: any) => {
        const statusClass = {
          'active': 'success',
          'inactive': 'secondary',
          'expired': 'danger'
        }[params.value] || 'secondary';

        return `<span class="badge bg-${statusClass}">${params.value || 'Unknown'}</span>`;
      },
      filterParams: {
        values: ['active', 'inactive', 'expired'],
        selectAllOnMiniFilter: false
      }
    },
    {
      headerName: 'Created Date',
      field: 'created_at',
      sortable: true,
      filter: 'agDateColumnFilter',
      floatingFilter: true,
      width: 130,
      valueFormatter: (params: any) => {
        return params.value ? moment(params.value).format('MM/DD/YYYY') : '';
      },
      filterParams: {
        filterOptions: ['equals', 'greaterThan', 'lessThan', 'inRange'],
        defaultOption: 'inRange',
        inRangeInclusive: true
      }
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 200,
      pinned: 'right',
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => {
        const isActive = params.data.status === 'active';
        const isUsed = params.data.is_used || false; // Assuming we have this field or will add it
        
        // If UL label has been used, don't show any action buttons
        if (isUsed) {
          return `
            <div class="d-flex justify-content-center align-items-center text-muted" style="height: 100%;">
              <small>Used</small>
            </div>
          `;
        }
        
        // If not used, show all action buttons
        const toggleText = isActive ? 'Disable' : 'Enable';
        const toggleClass = isActive ? 'btn-outline-warning' : 'btn-outline-success';
        const toggleIcon = isActive ? 'mdi-cancel' : 'mdi-check-circle';
        
        return `
          <div class="d-flex gap-1">
            <button class="btn btn-outline-primary btn-sm" onclick="window.editULLabel('${params.data.id}')" title="Edit UL label">
              <i class="mdi mdi-pencil"></i>
            </button>
            <button class="btn ${toggleClass} btn-sm" onclick="window.toggleULLabel('${params.data.id}', '${params.data.status}')" title="${toggleText} UL label">
              <i class="mdi ${toggleIcon}"></i>
            </button>
            <button class="btn btn-outline-danger btn-sm" onclick="window.deleteULLabel('${params.data.id}')" title="Delete UL label">
              <i class="mdi mdi-delete"></i>
            </button>
          </div>
        `;
      }
    }
  ];

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    floatingFilter: true
  };

  // Grid Options
  gridOptions: GridOptions = {
    columnDefs: this.columnDefs,
    defaultColDef: this.defaultColDef,
    rowData: [],
    suppressMenuHide: true,
    tooltipShowDelay: 500,
    animateRows: true
  };

  constructor(
    private fb: FormBuilder,
    private ulLabelService: ULLabelService,
    private toastr: ToastrService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private location: Location,
    private modalService: NgbModal
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      category: [''],
      status: [''],
      startDate: [''],
      endDate: ['']
    });
  }

  ngOnInit(): void {
    this.loadULLabels();

    // Watch for form changes
    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });

    // Set up global window functions for grid actions
    (window as any).editULLabel = (id: string) => this.editULLabel(parseInt(id));
    (window as any).toggleULLabel = (id: string, status: string) => this.toggleULLabel(id, status);
    (window as any).deleteULLabel = (id: string) => this.deleteULLabel(id);
    (window as any).viewULLabel = (id: string) => this.viewULLabel(parseInt(id));
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;

    // Handle action button clicks
    const eGridDiv = document.querySelector('#ul-labels-grid');
    if (eGridDiv) {
      eGridDiv.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('action-btn')) {
          const action = target.getAttribute('data-action');
          const id = target.getAttribute('data-id');

          if (action === 'use' && id) {
            this.useULLabel(parseInt(id));
          } else if (action === 'edit' && id) {
            this.editULLabel(parseInt(id));
          }
        }
      });
    }
  }

  loadULLabels(): void {
    this.isLoading = true;

    this.ulLabelService.getAllULLabels().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.ulLabels = response.data || [];
          this.filteredData = [...this.ulLabels];
        } else {
          this.toastr.error(response.message || 'Failed to load UL Labels');
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Load error:', error);
        this.toastr.error('Error loading UL Labels');
      }
    });
  }

  applyFilters(): void {
    const filters = this.filterForm.value;
    let filtered = [...this.ulLabels];

    // Apply form filters first
    if (filters.category) {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    if (filters.status) {
      filtered = filtered.filter(item => item.status === filters.status);
    }

    if (filters.startDate && filters.endDate) {
      filtered = filtered.filter(item => {
        if (!item.created_at) return false;
        const itemDate = moment(item.created_at);
        return itemDate.isBetween(filters.startDate, filters.endDate, 'day', '[]');
      });
    }

    // Apply search filter from form
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(item =>
        item.ul_number.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm) ||
        item.manufacturer?.toLowerCase().includes(searchTerm) ||
        item.part_number?.toLowerCase().includes(searchTerm)
      );
    }

    this.filteredData = filtered;
  }

  useULLabel(id: number): void {
    const ulLabel = this.ulLabels.find(label => label.id === id);
    if (ulLabel) {
      // Navigate to usage form or open modal
      this.toastr.info(`Selected UL Number: ${ulLabel.ul_number}`);
      // TODO: Implement navigation to usage form
    }
  }

  editULLabel(id: number): void {
    const ulLabel = this.ulLabels.find(label => label.id === id);
    if (ulLabel) {
      // Check if UL label has been used
      if (this.isULLabelUsed(ulLabel)) {
        this.toastr.warning('This UL label has been used and cannot be edited.');
        return;
      }
      
      // Open modal for editing
      this.openEditModal(ulLabel);
    }
  }

  exportData(): void {
    this.ulLabelService.exportULLabels().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ul-labels-${moment().format('YYYY-MM-DD')}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.toastr.success('UL Labels exported successfully');
      },
      error: (error) => {
        console.error('Export error:', error);
        this.toastr.error('Error exporting UL Labels');
      }
    });
  }

  refreshData(): void {
    this.loadULLabels();
    this.toastr.success('Data refreshed');
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.filteredData = [...this.ulLabels];
  }

  clearAllFilters(): void {
    // Clear AG Grid filters
    if (this.gridApi) {
      this.gridApi.setFilterModel(null);
    }
    // Clear form filters
    this.clearFilters();
  }

  // Quick filter methods
  quickFilterActive(): void {
    this.filterForm.patchValue({ status: 'active' });
  }

  quickFilterExpired(): void {
    this.filterForm.patchValue({ status: 'expired' });
  }

  quickFilterExpiringSoon(): void {
    const today = moment();
    const thirtyDaysFromNow = moment().add(30, 'days');

    const expiringSoon = this.ulLabels.filter(label => {
      if (!label.expiry_date) return false;
      const expiryDate = moment(label.expiry_date);
      return expiryDate.isBetween(today, thirtyDaysFromNow, 'day', '[]');
    });

    this.filteredData = expiringSoon;
    this.toastr.info(`Found ${expiringSoon.length} labels expiring within 30 days`);
  }

  getStatusSummary() {
    const summary = {
      total: this.ulLabels.length,
      active: this.ulLabels.filter(l => l.status === 'active').length,
      inactive: this.ulLabels.filter(l => l.status === 'inactive').length,
      expired: this.ulLabels.filter(l => l.status === 'expired').length,
      expiringSoon: this.ulLabels.filter(l => {
        if (!l.expiry_date) return false;
        const expiryDate = moment(l.expiry_date);
        const today = moment();
        const thirtyDaysFromNow = moment().add(30, 'days');
        return expiryDate.isBetween(today, thirtyDaysFromNow, 'day', '[]');
      }).length
    };
    return summary;
  }

  // Breadcrumb navigation
  breadcrumbItems(): BreadcrumbItem[] {
    return [
      { label: 'Dashboard', link: '/dashboard' },
      { label: 'UL Management', link: '/ul-management' },
      { label: 'UL Labels Report' }
    ];
  }

  // Navigation methods
  goBackToMain(): void {
    this.router.navigate(['/ul-management']);
  }

  // Create new UL Label
  createULLabel(): void {
    this.router.navigate(['ul-usage']);
  }

  // Navigate to UL Upload
  goToUpload(): void {
    this.router.navigate(['/ul-management/upload']);
  }

  // Navigate to UL Usage Report
  goToUsageReport(): void {
    this.router.navigate(['/ul-management/usage-report']);
  }

  // Grid data methods
  data(): ULLabel[] {
    return this.filteredData;
  }

  title(): string {
    return `UL Labels (${this.filteredData.length})`;
  }

  // Update getData method to use the data() method
  getData(): void {
    this.loadULLabels();
  }

  // Navigate back to previous page
  goBack(): void {
    this.location.back();
  }

  // UL Label Actions
  isULLabelUsed(ulLabel: ULLabel): boolean {
    // For now, we'll check if there's an is_used property
    // In the future, this could check against usage records from the API
    return (ulLabel as any).is_used || false;
  }

  openEditModal(ulLabel: ULLabel): void {
    // Create a simple inline modal content
    const modalContent = `
      <div class="modal-header">
        <h4 class="modal-title">Edit UL Label</h4>
        <button type="button" class="btn-close" aria-label="Close" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body">
        <form>
          <div class="mb-3">
            <label for="ulNumber" class="form-label">UL Number</label>
            <input type="text" class="form-control" id="ulNumber" value="${ulLabel.ul_number}" readonly>
          </div>
          <div class="mb-3">
            <label for="description" class="form-label">Description</label>
            <textarea class="form-control" id="description" rows="3">${ulLabel.description}</textarea>
          </div>
          <div class="mb-3">
            <label for="category" class="form-label">Category</label>
            <input type="text" class="form-control" id="category" value="${ulLabel.category}">
          </div>
          <div class="mb-3">
            <label for="manufacturer" class="form-label">Manufacturer</label>
            <input type="text" class="form-control" id="manufacturer" value="${ulLabel.manufacturer || ''}">
          </div>
          <div class="mb-3">
            <label for="status" class="form-label">Status</label>
            <select class="form-control" id="status">
              <option value="active" ${ulLabel.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="inactive" ${ulLabel.status === 'inactive' ? 'selected' : ''}>Inactive</option>
              <option value="expired" ${ulLabel.status === 'expired' ? 'selected' : ''}>Expired</option>
            </select>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Cancel</button>
        <button type="button" class="btn btn-primary" (click)="saveULLabel()">Save Changes</button>
      </div>
    `;

    // For now, just show a toast message indicating modal would open
    // In a full implementation, you would create a proper modal component
    this.toastr.info(`Edit UL Label: ${ulLabel.ul_number} (Modal functionality would open here)`);
    
    // TODO: Implement proper NgBootstrap modal with a dedicated component
    // const modalRef = this.modalService.open(ULEditModalComponent);
    // modalRef.componentInstance.ulLabel = ulLabel;
    // modalRef.result.then((result) => {
    //   if (result) {
    //     this.loadULLabels(); // Refresh data
    //   }
    // });
  }

  viewULLabel(id: number): void {
    const ulLabel = this.ulLabels.find(label => label.id === id);
    if (ulLabel) {
      // Open read-only modal for viewing
      this.openViewModal(ulLabel);
    }
  }

  openViewModal(ulLabel: ULLabel): void {
    // For now, just show a toast message indicating modal would open
    this.toastr.info(`View UL Label: ${ulLabel.ul_number} (View modal functionality would open here)`);
    
    // TODO: Implement proper NgBootstrap read-only modal
    // const modalRef = this.modalService.open(ULViewModalComponent);
    // modalRef.componentInstance.ulLabel = ulLabel;
  }

  toggleULLabel(id: string, currentStatus: string): void {
    const idNumber = parseInt(id);
    const ulLabel = this.ulLabels.find(label => label.id === idNumber);
    
    if (ulLabel && this.isULLabelUsed(ulLabel)) {
      this.toastr.warning('This UL label has been used and cannot be disabled/enabled.');
      return;
    }

    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'enable' : 'disable';
    
    if (confirm(`Are you sure you want to ${action} this UL label?`)) {
      this.ulLabelService.updateULLabelStatus(idNumber, newStatus as 'active' | 'inactive').subscribe({
        next: (response) => {
          this.toastr.success(`UL label ${action}d successfully`);
          this.loadULLabels(); // Reload the data
        },
        error: (error) => {
          console.error('Error updating UL label status:', error);
          this.toastr.error(`Failed to ${action} UL label`);
        }
      });
    }
  }

  deleteULLabel(id: string): void {
    const idNumber = parseInt(id);
    const ulLabel = this.ulLabels.find(label => label.id === idNumber);
    
    if (ulLabel && this.isULLabelUsed(ulLabel)) {
      this.toastr.warning('This UL label has been used and cannot be deleted.');
      return;
    }

    if (confirm('Are you sure you want to delete this UL label? This action cannot be undone.')) {
      this.ulLabelService.deleteULLabel(idNumber).subscribe({
        next: (response) => {
          this.toastr.success('UL label deleted successfully');
          this.loadULLabels(); // Reload the data
        },
        error: (error) => {
          console.error('Error deleting UL label:', error);
          this.toastr.error('Failed to delete UL label');
        }
      });
    }
  }
}
