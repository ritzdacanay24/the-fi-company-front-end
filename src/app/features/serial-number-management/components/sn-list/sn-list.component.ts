import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { SerialNumberService } from '../../services/serial-number.service';
import { SerialNumber } from '../../models/serial-number.model';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import moment from 'moment';
import { ToastrService } from 'ngx-toastr';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

type SerialNumberStatus = 'available' | 'assigned' | 'shipped' | 'returned' | 'defective';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, AgGridModule, NgbDropdownModule],
  selector: 'app-sn-list',
  templateUrl: './sn-list.component.html',
  styleUrls: ['./sn-list.component.scss']
})
export class SnListComponent implements OnInit {
  serialNumbers: SerialNumber[] = [];
  filteredSerialNumbers: SerialNumber[] = [];

  filterForm: FormGroup;
  isLoading = false;
  hasError = false;
  errorMessage = '';
  selectedSerialNumbers: Set<string> = new Set();
  gridApi!: GridApi;

  // Filter options
  statusOptions: { value: SerialNumberStatus | 'all', label: string }[] = [
    { value: 'all', label: 'All Status' },
    { value: 'available', label: 'Available' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'returned', label: 'Returned' },
    { value: 'defective', label: 'Defective' }
  ];

  productModels = [
    'All Models',
    'EyeFi Pro X1',
    'EyeFi Standard S2',
    'EyeFi Enterprise E3',
    'EyeFi Lite L1',
    'EyeFi Advanced A2'
  ];

  sortOptions = [
    { value: 'serial_number_asc', label: 'Serial Number (A-Z)' },
    { value: 'serial_number_desc', label: 'Serial Number (Z-A)' },
    { value: 'created_at_desc', label: 'Created (Newest)' },
    { value: 'created_at_asc', label: 'Created (Oldest)' },
    { value: 'status_asc', label: 'Status (A-Z)' },
    { value: 'product_model_asc', label: 'Product Model (A-Z)' }
  ];

  // AG Grid Configuration
  columnDefs: ColDef[] = [
    {
      headerName: 'Serial Number',
      field: 'serial_number',
      sortable: true,
      filter: true,
      width: 180,
      pinned: 'left',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      cellRenderer: (params: any) => {
        if (!params.value) return '';
        const serialNumber = params.value.toString();
        return `<code style="
          font-family: 'Courier New', monospace;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.5px;
          color: #495057;
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 2px;
          padding: 1px 4px;
          text-transform: uppercase;
        ">${serialNumber}</code>`;
      }
    },
    {
      headerName: 'Status',
      field: 'status',
      sortable: true,
      filter: true,
      width: 130,
      cellRenderer: (params: any) => {
        const status = params.value;
        const badges: Record<string, string> = {
          available: 'success',
          assigned: 'warning',
          shipped: 'info',
          returned: 'secondary',
          defective: 'danger'
        };
        const icons: Record<string, string> = {
          available: 'check-circle',
          assigned: 'clock',
          shipped: 'truck',
          returned: 'undo',
          defective: 'exclamation-triangle'
        };
        const badgeClass = badges[status] || 'secondary';
        const icon = icons[status] || 'question';
        return `<span class="badge bg-${badgeClass} text-white">
          <i class="mdi mdi-${icon}"></i> ${status.charAt(0).toUpperCase() + status.slice(1)}
        </span>`;
      }
    },
    // {
    //   headerName: 'Product Model',
    //   field: 'product_model',
    //   sortable: true,
    //   filter: true,
    //   width: 180
    // },
    {
      headerName: 'Assigned To',
      field: 'assigned_to_table',
      sortable: true,
      filter: true,
      width: 150,
      cellRenderer: (params: any) => {
        if (!params.data.assigned_to_table || !params.data.assigned_to_id) {
          return '<span class="text-muted">Not Assigned</span>';
        }
        const labels: Record<string, string> = {
          'agsSerialGenerator': 'AGS Asset',
          'ul_label_usages': 'UL Label',
          'sgAssetGenerator': 'SG Asset',
          'igt_assets': 'IGT Asset'
        };
        const label = labels[params.data.assigned_to_table] || params.data.assigned_to_table;
        return `<span class="badge bg-primary text-white me-1">${label}</span>
                <small class="text-muted">#${params.data.assigned_to_id}</small>`;
      }
    },
    {
      headerName: 'Assigned By',
      field: 'assigned_by',
      sortable: true,
      filter: true,
      width: 140,
      cellRenderer: (params: any) => {
        return params.value || '<span class="text-muted">—</span>';
      }
    },
    {
      headerName: 'Assigned At',
      field: 'assigned_at',
      sortable: true,
      filter: 'agDateColumnFilter',
      width: 140,
      valueFormatter: (params: any) => {
        return params.value ? moment(params.value).format('MM/DD/YYYY') : '—';
      }
    },
    {
      headerName: 'Batch Number',
      field: 'batch_number',
      sortable: true,
      filter: true,
      width: 140,
      cellRenderer: (params: any) => {
        return params.value || '<span class="text-muted">—</span>';
      }
    },
    {
      headerName: 'QR Code',
      field: 'qr_code',
      sortable: true,
      filter: true,
      width: 140,
      cellRenderer: (params: any) => {
        if (!params.value) return '<span class="text-muted">—</span>';
        return `<code style="font-family: 'Courier New', monospace; font-size: 11px;">${params.value}</code>`;
      },
      hide: true
    },
    {
      headerName: 'Created Date',
      field: 'created_at',
      sortable: true,
      filter: 'agDateColumnFilter',
      width: 130,
      valueFormatter: (params: any) => {
        return params.value ? moment(params.value).format('MM/DD/YYYY') : '—';
      }
    },
    {
      headerName: 'Actions',
      width: 100,
      pinned: 'right',
      cellStyle: { 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '4px'
      },
      cellRenderer: (params: any) => {
        const status = params.data.status;
        const isConsumed = status !== 'available';
        
        if (isConsumed) {
          return `
            <button class="btn btn-sm btn-warning" data-action="void" title="Void & Free Serial">
              <i class="mdi mdi-cancel"></i>
            </button>
          `;
        } else {
          return `<span class="text-muted small">Available</span>`;
        }
      },
      onCellClicked: (params: any) => {
        const target = params.event.target as HTMLElement;
        const button = target.closest('button');
        
        if (button) {
          const action = button.getAttribute('data-action');
          
          if (action === 'void') {
            this.voidSerial(params.data);
          }
        }
      }
    }
  ];

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    floatingFilter: true
  };

  constructor(
    private serialNumberService: SerialNumberService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      status: ['all'],
      productModel: ['All Models'],
      sortBy: ['created_at_desc'],
      batchNumber: [''],
      dateFrom: [''],
      dateTo: ['']
    });
  }

  ngOnInit() {
    this.loadSerialNumbers();
    this.setupFilters();
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;

    // Handle action button clicks
    const eGridDiv = document.querySelector('#serial-number-grid');
    if (eGridDiv) {
      eGridDiv.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLElement;
        const button = target.closest('[data-action]') as HTMLElement;

        if (button) {
          const action = button.getAttribute('data-action');
          const serial = button.getAttribute('data-serial');

          if (action === 'menu' && serial) {
            // Handle dropdown menu
            e.stopPropagation();
          }
        }
      });
    }
  }

  async loadSerialNumbers() {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    try {
      const response = await this.serialNumberService.getAllSerialNumbers();
      if (response && response.success) {
        this.serialNumbers = response.data || [];
        this.filteredSerialNumbers = [...this.serialNumbers];
        this.applyCurrentFilters();
      } else {
        this.hasError = true;
        this.errorMessage = response?.error || 'Failed to load serial numbers';
        this.serialNumbers = [];
        this.filteredSerialNumbers = [];
      }
    } catch (error: any) {
      this.hasError = true;
      this.errorMessage = error?.message || 'Network error occurred while loading serial numbers';
      console.error('Error loading serial numbers:', error);
      this.serialNumbers = [];
      this.filteredSerialNumbers = [];
    } finally {
      this.isLoading = false;
    }
  }

  refresh() {
    this.loadSerialNumbers();
  }

  setupFilters() {
    this.filterForm.valueChanges.subscribe(filters => {
      this.applyCurrentFilters();
    });

    // Apply initial filters
    this.applyCurrentFilters();
  }

  private applyCurrentFilters() {
    const filters = this.filterForm.value;
    this.filteredSerialNumbers = this.applyFilters(this.serialNumbers, filters);
  }

  private applyFilters(serialNumbers: SerialNumber[], filters: any): SerialNumber[] {
    let filtered = [...serialNumbers];

    // Text search
    if (filters.search?.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      filtered = filtered.filter(sn =>
        sn.serial_number.toLowerCase().includes(searchTerm) ||
        sn.product_model.toLowerCase().includes(searchTerm) ||
        sn.batch_number?.toLowerCase().includes(searchTerm)
      );
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(sn => sn.status === filters.status);
    }

    // Product model filter
    if (filters.productModel && filters.productModel !== 'All Models') {
      filtered = filtered.filter(sn => sn.product_model === filters.productModel);
    }

    // Batch number filter
    if (filters.batchNumber?.trim()) {
      filtered = filtered.filter(sn =>
        sn.batch_number?.toLowerCase().includes(filters.batchNumber.toLowerCase())
      );
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(sn => new Date(sn.created_at || '') >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      filtered = filtered.filter(sn => new Date(sn.created_at || '') <= toDate);
    }

    // Sorting
    if (filters.sortBy) {
      const [field, direction] = filters.sortBy.split('_');
      filtered.sort((a, b) => {
        let aVal: any = a[field as keyof SerialNumber];
        let bVal: any = b[field as keyof SerialNumber];

        if (field === 'created_at') {
          aVal = new Date(aVal || '').getTime();
          bVal = new Date(bVal || '').getTime();
        } else if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }

  // Selection methods (using AG Grid's built-in selection)
  getSelectedRows(): SerialNumber[] {
    if (!this.gridApi) return [];
    return this.gridApi.getSelectedRows();
  }

  get selectedCount(): number {
    return this.getSelectedRows().length;
  }

  // Status update methods
  updateStatus(serialNumber: string, newStatus: SerialNumberStatus) {
    console.log(`Updating ${serialNumber} to ${newStatus}`);
    this.toastr.info(`Status update: ${serialNumber} → ${newStatus}`);
    this.refreshData();
  }

  bulkUpdateStatus(newStatus: SerialNumberStatus) {
    const selected = this.getSelectedRows();
    if (selected.length === 0) {
      this.toastr.warning('No serial numbers selected');
      return;
    }

    console.log(`Bulk updating ${selected.length} items to ${newStatus}`);
    this.toastr.info(`Updating ${selected.length} serial numbers to ${newStatus}`);
    this.refreshData();
  }

  // Void serial to make it available again
  async voidSerial(serialData: SerialNumber) {
    if (!confirm(`Are you sure you want to void serial number ${serialData.serial_number}?\n\nThis will:\n• Set status back to 'available'\n• Remove assignment references\n• Allow the serial to be reused`)) {
      return;
    }

    try {
      // Update serial to available status
      await this.serialNumberService.updateSerialNumber(serialData.id!, {
        ...serialData,
        status: 'available',
        assigned_to_table: undefined,
        assigned_to_id: undefined,
        assigned_by: undefined,
        assigned_at: undefined
      });

      this.toastr.success(`Serial ${serialData.serial_number} has been voided and is now available for reuse`);
      this.refreshData();
    } catch (error: any) {
      console.error('Error voiding serial:', error);
      this.toastr.error(error.message || 'Failed to void serial number');
    }
  }

  // Export methods
  async exportSelected() {
    const selected = this.getSelectedRows();
    if (selected.length === 0) {
      this.toastr.warning('No serial numbers selected');
      return;
    }

    try {
      const serialNumbers = selected.map(sn => sn.serial_number);
      const blob = await this.serialNumberService.exportSerialNumbers(serialNumbers);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `serial-numbers-${moment().format('YYYY-MM-DD')}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      this.toastr.success(`Exported ${selected.length} serial numbers`);
    } catch (error) {
      console.error('Error exporting:', error);
      this.toastr.error('Error exporting serial numbers');
    }
  }

  async exportAll() {
    try {
      const serialNumbers = this.filteredSerialNumbers.map(sn => sn.serial_number);
      const blob = await this.serialNumberService.exportSerialNumbers(serialNumbers);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `all-serial-numbers-${moment().format('YYYY-MM-DD')}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      this.toastr.success(`Exported ${serialNumbers.length} serial numbers`);
    } catch (error) {
      console.error('Error exporting:', error);
      this.toastr.error('Error exporting serial numbers');
    }
  }

  // Utility methods
  clearFilters() {
    this.filterForm.reset({
      search: '',
      status: 'all',
      productModel: 'All Models',
      sortBy: 'created_at_desc',
      batchNumber: '',
      dateFrom: '',
      dateTo: ''
    });
  }

  refreshData() {
    this.loadSerialNumbers();
    this.toastr.success('Data refreshed');
  }

  // Summary statistics
  getSummary() {
    const total = this.filteredSerialNumbers.length;
    const available = this.filteredSerialNumbers.filter(sn => sn.status === 'available').length;
    const assigned = this.filteredSerialNumbers.filter(sn => sn.status === 'assigned').length;
    const shipped = this.filteredSerialNumbers.filter(sn => sn.status === 'shipped').length;
    const uniqueModels = new Set(this.filteredSerialNumbers.map(sn => sn.product_model)).size;

    return {
      total,
      available,
      assigned,
      shipped,
      uniqueModels
    };
  }
}