import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '@app/shared/shared.module';
import { ULLabelService } from '../../services/ul-label.service';
import { ULLabel } from '../../models/ul-label.model';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import moment from 'moment';
import { AgGridModule } from 'ag-grid-angular';

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule],
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
      filter: true,
      pinned: 'left',
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
      headerName: 'Category',
      field: 'category',
      sortable: true,
      filter: true,
      width: 120
    },
    {
      headerName: 'Manufacturer',
      field: 'manufacturer',
      sortable: true,
      filter: true,
      width: 150
    },
    {
      headerName: 'Part Number',
      field: 'part_number',
      sortable: true,
      filter: true,
      width: 140
    },
    {
      headerName: 'Certification Date',
      field: 'certification_date',
      sortable: true,
      filter: 'agDateColumnFilter',
      width: 140,
      valueFormatter: (params: any) => {
        return params.value ? moment(params.value).format('MM/DD/YYYY') : '';
      }
    },
    {
      headerName: 'Expiry Date',
      field: 'expiry_date',
      sortable: true,
      filter: 'agDateColumnFilter',
      width: 130,
      valueFormatter: (params: any) => {
        return params.value ? moment(params.value).format('MM/DD/YYYY') : '';
      },
      cellClassRules: {
        'text-danger': (params: any) => {
          if (!params.value) return false;
          return moment(params.value).isBefore(moment(), 'day');
        },
        'text-warning': (params: any) => {
          if (!params.value) return false;
          return moment(params.value).isBetween(moment(), moment().add(30, 'days'), 'day');
        }
      }
    },
    {
      headerName: 'Status',
      field: 'status',
      sortable: true,
      filter: true,
      width: 100,
      cellRenderer: (params: any) => {
        const statusClass = {
          'active': 'success',
          'inactive': 'secondary',
          'expired': 'danger'
        }[params.value] || 'secondary';
        
        return `<span class="badge bg-${statusClass}">${params.value || 'Unknown'}</span>`;
      }
    },
    {
      headerName: 'Created Date',
      field: 'created_at',
      sortable: true,
      filter: 'agDateColumnFilter',
      width: 130,
      valueFormatter: (params: any) => {
        return params.value ? moment(params.value).format('MM/DD/YYYY') : '';
      }
    },
    {
      headerName: 'Actions',
      width: 120,
      pinned: 'right',
      cellRenderer: (params: any) => {
        return `
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary btn-sm action-btn" data-action="use" data-id="${params.data.id}">
              <i class="mdi mdi-play"></i> Use
            </button>
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

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.ul_number.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm) ||
        item.manufacturer?.toLowerCase().includes(searchTerm) ||
        item.part_number?.toLowerCase().includes(searchTerm)
      );
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(item => item.status === filters.status);
    }

    // Date range filter
    if (filters.startDate && filters.endDate) {
      filtered = filtered.filter(item => {
        if (!item.created_at) return false;
        const itemDate = moment(item.created_at);
        return itemDate.isBetween(filters.startDate, filters.endDate, 'day', '[]');
      });
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
      // Navigate to edit form or open modal
      this.toastr.info(`Edit UL Label: ${ulLabel.ul_number}`);
      // TODO: Implement edit functionality
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
      expired: this.ulLabels.filter(l => l.status === 'expired').length
    };
    return summary;
  }
}
