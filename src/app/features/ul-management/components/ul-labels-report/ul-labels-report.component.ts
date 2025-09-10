import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
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
  query = '';

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
  ];

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true
  };

  // Grid Options
  gridOptions: GridOptions = {
    columnDefs: this.columnDefs,
    defaultColDef: this.defaultColDef,
    rowData: [],
    suppressMenuHide: true,
    tooltipShowDelay: 500
  };

  constructor(
    private fb: FormBuilder,
    private ulLabelService: ULLabelService,
    private toastr: ToastrService,
    private router: Router,
    private activatedRoute: ActivatedRoute
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

    // Also apply header search if exists
    if (this.query) {
      const searchTerm = this.query.toLowerCase();
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
    this.router.navigate(['/dashboard/ul-management/upload']);
  }

  // Grid data methods
  data(): ULLabel[] {
    return this.filteredData;
  }

  title(): string {
    return `UL Labels (${this.filteredData.length})`;
  }

  // Search functionality
  setFilter(searchTerm: string): void {
    this.query = searchTerm;
    this.applySearchFilter();
  }

  private applySearchFilter(): void {
    if (!this.query) {
      this.applyFilters();
      return;
    }

    const searchTerm = this.query.toLowerCase();
    const baseFiltered = this.getBaseFilteredData();

    this.filteredData = baseFiltered.filter(item =>
      item.ul_number.toLowerCase().includes(searchTerm) ||
      item.description.toLowerCase().includes(searchTerm) ||
      item.manufacturer?.toLowerCase().includes(searchTerm) ||
      item.part_number?.toLowerCase().includes(searchTerm)
    );
  }

  private getBaseFilteredData(): ULLabel[] {
    const filters = this.filterForm.value;
    let filtered = [...this.ulLabels];

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

    return filtered;
  }

  // Update getData method to use the data() method
  getData(): void {
    this.loadULLabels();
  }
}
