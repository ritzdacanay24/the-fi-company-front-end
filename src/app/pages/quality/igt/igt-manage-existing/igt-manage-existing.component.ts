import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { AgGridModule } from 'ag-grid-angular';
import { GridApi, GridReadyEvent, ColDef, SelectionChangedEvent } from 'ag-grid-community';
import { ToastrService } from 'ngx-toastr';

export interface IgtSerial {
  id: number;
  serial_number: string;
  category: string;
  status: 'available' | 'reserved' | 'used';
  manufacturer?: string;
  model?: string;
  notes?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  used_at?: string;
  used_by?: string;
  used_in_asset_id?: string;
  used_in_asset_number?: string;
}

@Component({
  selector: 'app-igt-manage-existing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AgGridModule
  ],
  templateUrl: './igt-manage-existing.component.html',
  styleUrls: ['./igt-manage-existing.component.scss']
})
export class IgtManageExistingComponent implements OnInit {
  @ViewChild('editSerialModal', { static: false }) editSerialModal!: TemplateRef<any>;

  // Grid
  gridApi!: GridApi;
  rowData: IgtSerial[] = [];
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 100,
    sortable: true,
    filter: true,
    resizable: true
  };

  // Filters
  categoryFilter = '';
  statusFilter = '';
  isActiveFilter = '';
  searchTerm = '';

  // Selection
  selectedSerials: IgtSerial[] = [];

  // Edit Modal
  editForm: FormGroup;
  editModalRef?: NgbModalRef;
  serialToEdit: Partial<IgtSerial> = {};

  // Loading states
  isLoading = false;
  isRefreshing = false;

  // Permissions
  canManageSerials = true; // This should come from your auth service

  // Statistics
  statistics = {
    total: 0,
    available: 0,
    reserved: 0,
    used: 0,
    inactive: 0
  };

  constructor(
    private fb: FormBuilder,
    private modal: NgbModal,
    private toastr: ToastrService,
    private router: Router
  ) {
    this.editForm = this.fb.group({
      serial_number: [''],
      category: ['gaming'],
      status: ['available'],
      manufacturer: [''],
      model: [''],
      notes: [''],
      is_active: [1]
    });

    this.setupColumnDefs();
  }

  ngOnInit(): void {
    this.loadSerials();
  }

  private setupColumnDefs(): void {
    this.columnDefs = [
      {
        headerName: '',
        field: 'select',
        headerCheckboxSelection: true,
        checkboxSelection: true,
        width: 50,
        pinned: 'left',
        lockPosition: true,
        suppressMenu: true,
        sortable: false,
        filter: false
      },
      {
        headerName: 'Serial Number',
        field: 'serial_number',
        minWidth: 150,
        pinned: 'left',
        cellClass: 'fw-bold',
        cellRenderer: (params: any) => {
          const status = params.data.status;
          const isActive = params.data.is_active;
          let badgeClass = 'badge bg-secondary';
          
          if (!isActive) {
            badgeClass = 'badge bg-light text-muted';
          } else if (status === 'available') {
            badgeClass = 'badge bg-success';
          } else if (status === 'reserved') {
            badgeClass = 'badge bg-warning';
          } else if (status === 'used') {
            badgeClass = 'badge bg-info';
          }

          return `
            <div class="d-flex align-items-center">
              <span>${params.value}</span>
            </div>
          `;
        }
      },
      {
        headerName: 'Category',
        field: 'category',
        width: 130,
        cellRenderer: (params: any) => {
          const categoryMap: Record<string, { label: string; icon: string; color: string }> = {
            gaming: { label: 'Gaming', icon: 'mdi-gamepad-variant', color: 'text-primary' },
            peripheral: { label: 'Peripheral', icon: 'mdi-usb', color: 'text-info' },
            system: { label: 'System', icon: 'mdi-desktop-tower', color: 'text-success' },
            other: { label: 'Other', icon: 'mdi-package-variant', color: 'text-secondary' }
          };
          
          const cat = categoryMap[params.value] || categoryMap['other'];
          return `
            <div class="d-flex align-items-center">
              <i class="mdi ${cat.icon} ${cat.color} me-1"></i>
              <span>${cat.label}</span>
            </div>
          `;
        }
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 100,
        cellRenderer: (params: any) => {
          const statusMap: Record<string, { label: string; color: string }> = {
            available: { label: 'Available', color: 'text-success' },
            reserved: { label: 'Reserved', color: 'text-warning' },
            used: { label: 'Used', color: 'text-info' }
          };
          
          const status = statusMap[params.value] || { label: params.value, color: 'text-muted' };
          return `<span class="${status.color}">${status.label}</span>`;
        }
      },
      {
        headerName: 'Manufacturer',
        field: 'manufacturer',
        width: 120
      },
      {
        headerName: 'Model',
        field: 'model',
        width: 120
      },
      {
        headerName: 'Active',
        field: 'is_active',
        width: 80,
        cellRenderer: (params: any) => {
          return params.value ? 
            '<i class="mdi mdi-check-circle text-success"></i>' : 
            '<i class="mdi mdi-close-circle text-danger"></i>';
        }
      },
      {
        headerName: 'Created',
        field: 'created_at',
        width: 130,
        cellRenderer: (params: any) => {
          return new Date(params.value).toLocaleDateString();
        }
      },
      {
        headerName: 'Used At',
        field: 'used_at',
        width: 130,
        cellRenderer: (params: any) => {
          return params.value ? new Date(params.value).toLocaleDateString() : '-';
        }
      },
      {
        headerName: 'Actions',
        field: 'actions',
        width: 120,
        pinned: 'right',
        sortable: false,
        filter: false,
        cellRenderer: (params: any) => {
          return `
            <div class="d-flex gap-1 mt-1">
              <button class="btn btn-sm btn-outline-primary edit-btn" title="Edit">
                <i class="mdi mdi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger delete-btn" title="Delete">
                <i class="mdi mdi-delete"></i>
              </button>
            </div>
          `;
        },
        onCellClicked: (params: any) => {
          if (params.event.target.closest('.edit-btn')) {
            this.editSerial(params.data);
          } else if (params.event.target.closest('.delete-btn')) {
            this.deleteSerial(params.data);
          }
        }
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  onSelectionChanged(event: SelectionChangedEvent): void {
    this.selectedSerials = event.api.getSelectedRows();
  }

  getRowId = (params: any) => params.data.id;

  loadSerials(): void {
    this.isLoading = true;
    
    // Mock data for now - replace with actual API call
    setTimeout(() => {
      this.rowData = this.generateMockData();
      this.updateStatistics();
      this.isLoading = false;
    }, 1000);
  }

  private generateMockData(): IgtSerial[] {
    // Generate sample data for demonstration
    const categories = ['gaming', 'peripheral', 'system', 'other'];
    const statuses: ('available' | 'reserved' | 'used')[] = ['available', 'reserved', 'used'];
    const manufacturers = ['IGT', 'Bally', 'Scientific Games', 'Aristocrat', 'Konami'];
    
    return Array.from({ length: 150 }, (_, i) => ({
      id: i + 1,
      serial_number: `Z${String(i + 1).padStart(6, '0')}`,
      category: categories[Math.floor(Math.random() * categories.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      manufacturer: Math.random() > 0.3 ? manufacturers[Math.floor(Math.random() * manufacturers.length)] : '',
      model: Math.random() > 0.4 ? `Model-${Math.floor(Math.random() * 100)}` : '',
      notes: Math.random() > 0.7 ? 'Sample notes for this serial number' : '',
      is_active: Math.random() > 0.1 ? 1 : 0,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      used_at: Math.random() > 0.6 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      used_by: Math.random() > 0.7 ? 'John Doe' : undefined,
      used_in_asset_id: Math.random() > 0.7 ? `ASSET-${Math.floor(Math.random() * 1000)}` : undefined,
      used_in_asset_number: Math.random() > 0.7 ? `AN-${Math.floor(Math.random() * 10000)}` : undefined
    }));
  }

  private updateStatistics(): void {
    this.statistics = {
      total: this.rowData.length,
      available: this.rowData.filter(s => s.status === 'available' && s.is_active === 1).length,
      reserved: this.rowData.filter(s => s.status === 'reserved' && s.is_active === 1).length,
      used: this.rowData.filter(s => s.status === 'used' && s.is_active === 1).length,
      inactive: this.rowData.filter(s => s.is_active === 0).length
    };
  }

  // Filter methods
  onFilterChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onIsActiveFilterChange(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    if (!this.gridApi) return;

    // Apply quick filter for search
    if (this.searchTerm) {
      this.gridApi.setGridOption('quickFilterText', this.searchTerm);
    } else {
      this.gridApi.setGridOption('quickFilterText', '');
    }

    // Apply custom filters by updating row data with filtering logic
    this.gridApi.onFilterChanged();
  }

  clearFilters(): void {
    this.categoryFilter = '';
    this.statusFilter = '';
    this.isActiveFilter = '';
    this.searchTerm = '';
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return !!(this.categoryFilter || this.statusFilter || this.isActiveFilter !== '' || this.searchTerm);
  }

  getFilteredCount(): number {
    return this.gridApi?.getDisplayedRowCount() || 0;
  }

  refreshData(): void {
    this.isRefreshing = true;
    this.loadSerials();
    setTimeout(() => this.isRefreshing = false, 1000);
  }

  // CRUD Operations
  editSerial(serial: IgtSerial): void {
    this.serialToEdit = { ...serial };
    this.editForm.patchValue(serial);
    this.editModalRef = this.modal.open(this.editSerialModal, { 
      size: 'lg',
      backdrop: 'static'
    });

    this.editModalRef.result.then((result) => {
      if (result === 'save') {
        this.saveSerial();
      }
    }).catch(() => {
      // Modal dismissed
    });
  }

  saveSerial(): void {
    if (this.editForm.valid) {
      const updatedSerial = { ...this.serialToEdit, ...this.editForm.value };
      
      // Mock save - replace with actual API call
      const index = this.rowData.findIndex(s => s.id === updatedSerial.id);
      if (index !== -1) {
        this.rowData[index] = updatedSerial as IgtSerial;
        this.gridApi.setGridOption('rowData', this.rowData);
        this.updateStatistics();
        this.toastr.success('Serial number updated successfully');
      }
      
      this.editModalRef?.close();
    }
  }

  deleteSerial(serial: IgtSerial): void {
    if (confirm(`Are you sure you want to delete serial number "${serial.serial_number}"?`)) {
      this.performDelete([serial]);
    }
  }

  bulkDelete(): void {
    if (this.selectedSerials.length === 0) return;

    if (confirm(`Are you sure you want to delete ${this.selectedSerials.length} selected serial numbers?`)) {
      this.performDelete(this.selectedSerials);
    }
  }

  private performDelete(serials: IgtSerial[]): void {
    // Mock delete - replace with actual API call
    const idsToDelete = serials.map(s => s.id);
    this.rowData = this.rowData.filter(s => !idsToDelete.includes(s.id));
    this.gridApi.setGridOption('rowData', this.rowData);
    this.updateStatistics();
    this.selectedSerials = [];
    this.toastr.success(`${serials.length} serial number(s) deleted successfully`);
  }

  // Export functionality
  exportFiltered(): void {
    const displayedData = this.getDisplayedRowData();
    const csvContent = this.convertToCSV(displayedData);
    this.downloadCSV(csvContent, 'igt-serials-filtered.csv');
  }

  exportSelected(): void {
    if (this.selectedSerials.length === 0) {
      this.toastr.warning('No serials selected for export');
      return;
    }
    
    const csvContent = this.convertToCSV(this.selectedSerials);
    this.downloadCSV(csvContent, 'igt-serials-selected.csv');
  }

  private getDisplayedRowData(): IgtSerial[] {
    const displayedData: IgtSerial[] = [];
    this.gridApi.forEachNodeAfterFilterAndSort((node) => {
      displayedData.push(node.data);
    });
    return displayedData;
  }

  private convertToCSV(data: IgtSerial[]): string {
    const headers = ['Serial Number', 'Category', 'Status', 'Manufacturer', 'Model', 'Active', 'Created', 'Notes'];
    const csvRows = [headers.join(',')];

    data.forEach(serial => {
      const row = [
        `"${serial.serial_number}"`,
        `"${serial.category}"`,
        `"${serial.status}"`,
        `"${serial.manufacturer || ''}"`,
        `"${serial.model || ''}"`,
        serial.is_active ? 'Yes' : 'No',
        `"${new Date(serial.created_at).toLocaleDateString()}"`,
        `"${(serial.notes || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  private downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toastr.success(`Exported ${filename} successfully`);
  }

  // Utility methods
  getAvailableCount(): number {
    return this.statistics.available;
  }

  isEditSaveDisabled(): boolean {
    return this.editForm.invalid;
  }

  goBack(): void {
    this.router.navigate(['/dashboard/quality/igt']);
  }
}
