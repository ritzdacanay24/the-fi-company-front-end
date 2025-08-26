import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '@app/shared/shared.module';
import { ULLabelService } from '../../services/ul-label.service';
import { ULUsageReport } from '../../models/ul-label.model';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import moment from 'moment';
import { AgGridModule } from 'ag-grid-angular';

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule],
  selector: 'app-ul-usage-report',
  templateUrl: './ul-usage-report.component.html',
  styleUrls: ['./ul-usage-report.component.scss']
})
export class ULUsageReportComponent implements OnInit {
  filterForm: FormGroup;
  usageData: ULUsageReport[] = [];
  filteredData: ULUsageReport[] = [];
  isLoading = false;
  gridApi!: GridApi;

  // AG Grid Configuration
  columnDefs: ColDef[] = [
    {
      headerName: 'Date Used',
      field: 'date_used',
      sortable: true,
      filter: 'agDateColumnFilter',
      width: 130,
      pinned: 'left',
      valueFormatter: (params: any) => {
        return params.value ? moment(params.value).format('MM/DD/YYYY') : '';
      }
    },
    {
      headerName: 'UL Number',
      field: 'ul_number',
      sortable: true,
      filter: true,
      width: 150,
      cellRenderer: (params: any) => {
        return `<strong class="text-primary">${params.value}</strong>`;
      }
    },
    {
      headerName: 'Description',
      field: 'description',
      sortable: true,
      filter: true,
      flex: 1,
      minWidth: 200,
      tooltipField: 'description'
    },
    {
      headerName: 'Eyefi Serial #',
      field: 'eyefi_serial_number',
      sortable: true,
      filter: true,
      width: 140,
      cellRenderer: (params: any) => {
        return `<code class="text-info">${params.value}</code>`;
      }
    },
    {
      headerName: 'Qty Used',
      field: 'quantity_used',
      sortable: true,
      filter: 'agNumberColumnFilter',
      width: 100,
      cellRenderer: (params: any) => {
        return `<span class="badge bg-secondary">${params.value}</span>`;
      }
    },
    {
      headerName: 'User Name',
      field: 'user_name',
      sortable: true,
      filter: true,
      width: 150
    },
    {
      headerName: 'Customer',
      field: 'customer_name',
      sortable: true,
      filter: true,
      width: 150
    },
    {
      headerName: 'Notes',
      field: 'notes',
      sortable: true,
      filter: true,
      width: 200,
      tooltipField: 'notes',
      cellRenderer: (params: any) => {
        if (!params.value) return '';
        return params.value.length > 30 ? 
          `${params.value.substring(0, 30)}...` : 
          params.value;
      }
    },
    {
      headerName: 'Actions',
      width: 100,
      pinned: 'right',
      cellRenderer: (params: any) => {
        return `
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-info btn-sm action-btn" data-action="edit" data-id="${params.data.id}">
              <i class="mdi mdi-pencil"></i>
            </button>
          </div>
        `;
      }
    }
  ];

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true
  };

  constructor(
    private fb: FormBuilder,
    private ulLabelService: ULLabelService,
    private toastr: ToastrService
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      customer: [''],
      startDate: [''],
      endDate: [''],
      ulNumber: ['']
    });
  }

  ngOnInit(): void {
    this.loadUsageData();
    
    // Set default date range (last 30 days)
    const endDate = moment().format('YYYY-MM-DD');
    const startDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
    this.filterForm.patchValue({
      startDate: startDate,
      endDate: endDate
    });
    
    // Watch for form changes
    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    
    // Handle action button clicks
    const eGridDiv = document.querySelector('#ul-usage-grid');
    if (eGridDiv) {
      eGridDiv.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('action-btn')) {
          const action = target.getAttribute('data-action');
          const id = target.getAttribute('data-id');
          
          if (action === 'edit' && id) {
            this.editUsage(parseInt(id));
          }
        }
      });
    }
  }

  loadUsageData(): void {
    this.isLoading = true;
    const filters = this.filterForm.value;
    
    this.ulLabelService.getULUsageReport(
      filters.startDate, 
      filters.endDate, 
      filters.customer
    ).subscribe({
      next: (data) => {
        this.isLoading = false;
        this.usageData = data || [];
        this.filteredData = [...this.usageData];
        this.applyFilters();
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Load error:', error);
        this.toastr.error('Error loading usage data');
      }
    });
  }

  applyFilters(): void {
    const filters = this.filterForm.value;
    let filtered = [...this.usageData];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.ul_number.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm) ||
        item.eyefi_serial_number.toLowerCase().includes(searchTerm) ||
        item.user_name.toLowerCase().includes(searchTerm) ||
        item.customer_name.toLowerCase().includes(searchTerm)
      );
    }

    // UL Number filter
    if (filters.ulNumber) {
      filtered = filtered.filter(item => 
        item.ul_number.toLowerCase().includes(filters.ulNumber.toLowerCase())
      );
    }

    // Customer filter
    if (filters.customer) {
      filtered = filtered.filter(item => 
        item.customer_name.toLowerCase().includes(filters.customer.toLowerCase())
      );
    }

    this.filteredData = filtered;
  }

  editUsage(id: number): void {
    const usage = this.usageData.find(u => u.id === id);
    if (usage) {
      this.toastr.info(`Edit usage record for ${usage.ul_number}`);
      // TODO: Implement edit functionality
    }
  }

  exportData(): void {
    const filters = this.filterForm.value;
    
    this.ulLabelService.exportULUsageReport(
      filters.startDate, 
      filters.endDate
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ul-usage-report-${moment().format('YYYY-MM-DD')}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.toastr.success('Usage report exported successfully');
      },
      error: (error) => {
        console.error('Export error:', error);
        this.toastr.error('Error exporting usage report');
      }
    });
  }

  refreshData(): void {
    this.loadUsageData();
    this.toastr.success('Data refreshed');
  }

  clearFilters(): void {
    this.filterForm.reset();
    const endDate = moment().format('YYYY-MM-DD');
    const startDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
    this.filterForm.patchValue({
      startDate: startDate,
      endDate: endDate
    });
  }

  // Quick filter methods
  filterByDateRange(days: number): void {
    const endDate = moment().format('YYYY-MM-DD');
    const startDate = moment().subtract(days, 'days').format('YYYY-MM-DD');
    this.filterForm.patchValue({
      startDate: startDate,
      endDate: endDate
    });
    this.loadUsageData();
  }

  getUsageSummary() {
    const totalUsages = this.filteredData.length;
    const totalQuantity = this.filteredData.reduce((sum, item) => sum + item.quantity_used, 0);
    const uniqueULNumbers = new Set(this.filteredData.map(item => item.ul_number)).size;
    const uniqueCustomers = new Set(this.filteredData.map(item => item.customer_name)).size;
    
    return {
      totalUsages,
      totalQuantity,
      uniqueULNumbers,
      uniqueCustomers
    };
  }
}
