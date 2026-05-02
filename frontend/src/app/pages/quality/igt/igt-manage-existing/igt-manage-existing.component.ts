import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { AgGridModule } from 'ag-grid-angular';
import { 
  GridApi, 
  GridReadyEvent, 
  ColDef, 
  SelectionChangedEvent,
} from 'ag-grid-community';
import { ToastrService } from 'ngx-toastr';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexResponsive,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { SerialNumberService } from '../services/serial-number.service';
import { IgtManageExistingActionDropdownRendererComponent } from '@app/pages/quality/igt/igt-manage-existing/igt-manage-existing-action-dropdown-renderer.component';
import { SerialAssignmentUsageDetailsModalService } from '@app/shared/components/serial-assignment-usage-details-modal/serial-assignment-usage-details-modal.component';
import { SerialAssignmentsService } from '@app/features/serial-assignments/services/serial-assignments.service';

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

type ChartOptions = {
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart: ApexChart;
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis;
  dataLabels?: ApexDataLabels;
  stroke?: ApexStroke;
  tooltip?: ApexTooltip;
  legend?: ApexLegend;
  plotOptions?: ApexPlotOptions;
  labels?: string[];
  colors?: string[];
  responsive?: ApexResponsive[];
};

@Component({
  selector: 'app-igt-manage-existing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AgGridModule,
    RouterModule,
    NgApexchartsModule,
  ],
  templateUrl: './igt-manage-existing.component.html',
  styleUrls: ['./igt-manage-existing.component.scss']
})
export class IgtManageExistingComponent implements OnInit {
  @ViewChild('editSerialModal', { static: false }) editSerialModal!: TemplateRef<any>;
  @ViewChild('restoreModal', { static: false }) restoreModal!: TemplateRef<any>;
  @ViewChild('writeOffModal', { static: false }) writeOffModal!: TemplateRef<any>;
  @ViewChild('markAsUsedModal', { static: false }) markAsUsedModal!: TemplateRef<any>;

  // Grid
  gridApi!: GridApi;
  rowData: IgtSerial[] = [];
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 100,
    sortable: true,
    filter: true,
    floatingFilter: true,
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

  // Restore Modal
  restoreModalRef?: NgbModalRef;
  serialToRestore: IgtSerial | null = null;
  isCheckingRestoreAssignments = false;
  restoreAssignmentConflictCount = 0;
  restoreAssignmentError = '';
  restoreAcknowledged = false;
  isRestoring = false;

  // Write-Off Modal
  writeOffModalRef?: NgbModalRef;
  serialToWriteOff: IgtSerial | null = null;
  writeOffReason = 'Damaged';
  writeOffAcknowledged = false;
  isWritingOff = false;

  // Mark-as-Used Modal
  markAsUsedModalRef?: NgbModalRef;
  serialToMarkUsed: IgtSerial | null = null;
  markAsUsedReason = 'Used in Production';
  markAsUsedAcknowledged = false;
  isMarkingAsUsed = false;

  // Loading states
  isLoading = false;

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

  statusBarChart: Partial<ChartOptions> = {};
  statusDistributionChart: Partial<ChartOptions> = {};
  uploadTrendChart: Partial<ChartOptions> = {};

  constructor(
    private fb: FormBuilder,
    private modal: NgbModal,
    private toastr: ToastrService,
    private router: Router,
    private serialNumberService: SerialNumberService,
    private serialAssignmentUsageDetailsModalService: SerialAssignmentUsageDetailsModalService,
    private serialAssignmentsService: SerialAssignmentsService,
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
    this.setupColumnDefs();
    this.loadAllData();
  }

  loadAllData(): void {
    this.isLoading = true;
    
    // Build API parameters to get ALL records (no pagination)
    const apiParams = {
      includeInactive: true,
      search: '',
      status: this.statusFilter,
      category: this.categoryFilter,
      is_active: this.isActiveFilter
    };

    console.log('Loading all records with filters:', apiParams);

    this.serialNumberService.getAll(apiParams)
      .then((response: any) => {
        let allData: IgtSerial[] = [];

        console.log('API Response:', response);

        // Handle different API response formats
        if (response && typeof response === 'object') {
          if (response.data && Array.isArray(response.data)) {
            allData = response.data;
          } else if (Array.isArray(response)) {
            allData = response;
          }
        } else if (Array.isArray(response)) {
          allData = response;
        }

        // Set all data to rowData for client-side AG-Grid
        this.rowData = allData;

        console.log(`Loaded ${this.rowData.length} total records`);
        if (this.rowData.length > 0) {
          console.log('First record ID:', this.rowData[0].id, 'Serial:', this.rowData[0].serial_number);
          console.log('Last record ID:', this.rowData[this.rowData.length - 1].id, 'Serial:', this.rowData[this.rowData.length - 1].serial_number);
        }

        // Update statistics with all data
        this.updateStatistics(this.rowData, this.rowData.length);
        this.isLoading = false;
      })
      .catch((error) => {
        console.error('Error loading serial numbers:', error);
        this.toastr.error('Failed to load serial numbers');
        this.isLoading = false;
        this.rowData = [];
        this.updateStatistics([], 0);
      });
  }

  private setupColumnDefs(): void {
    this.columnDefs = [
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
      // {
      //   headerName: 'Category',
      //   field: 'category',
      //   width: 130,
      //   cellRenderer: (params: any) => {
      //     const categoryMap: Record<string, { label: string; icon: string; color: string }> = {
      //       gaming: { label: 'Gaming', icon: 'mdi-gamepad-variant', color: 'text-primary' },
      //       peripheral: { label: 'Peripheral', icon: 'mdi-usb', color: 'text-info' },
      //       system: { label: 'System', icon: 'mdi-desktop-tower', color: 'text-success' },
      //       other: { label: 'Other', icon: 'mdi-package-variant', color: 'text-secondary' }
      //     };
          
      //     const cat = categoryMap[params.value] || categoryMap['other'];
      //     return `
      //       <div class="d-flex align-items-center">
      //         <i class="mdi ${cat.icon} ${cat.color} me-1"></i>
      //         <span>${cat.label}</span>
      //       </div>
      //     `;
      //   }
      // },
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
      // {
      //   headerName: 'Manufacturer',
      //   field: 'manufacturer',
      //   width: 120
      // },
      // {
      //   headerName: 'Model',
      //   field: 'model',
      //   width: 120
      // },
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
        width: 130,
        pinned: 'right',
        sortable: false,
        filter: false,
        floatingFilter: false,
        resizable: false,
        cellRenderer: IgtManageExistingActionDropdownRendererComponent,
        cellRendererParams: {
          canManage: this.canManageSerials,
          onViewAssignmentDetails: (serial: IgtSerial) => this.openAssignmentDetails(serial),
          onEdit: (serial: IgtSerial) => this.editSerial(serial),
          onMarkUsed: (serial: IgtSerial) => this.markSerialAsUsed(serial),
          onRestoreAvailable: (serial: IgtSerial) => this.restoreSerialToAvailable(serial),
          onWriteOff: (serial: IgtSerial) => this.writeOffSerial(serial),
        },
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.onSearchChange();
  }

  onSelectionChanged(event: SelectionChangedEvent): void {
    this.selectedSerials = event.api.getSelectedRows();
  }

  getRowId = (params: any) => params.data.id;

  private updateStatistics(allData?: IgtSerial[], totalCount?: number): void {
    const sourceData = Array.isArray(allData) ? allData : this.rowData;

    if (sourceData.length > 0) {
      this.statistics = {
        total: totalCount || sourceData.length,
        available: sourceData.filter(s => s.status === 'available' && s.is_active === 1).length,
        reserved: sourceData.filter(s => s.status === 'reserved' && s.is_active === 1).length,
        used: sourceData.filter(s => s.status === 'used' && s.is_active === 1).length,
        inactive: sourceData.filter(s => s.is_active === 0).length
      };
    } else {
      this.statistics = {
        total: 0,
        available: 0,
        reserved: 0,
        used: 0,
        inactive: 0
      };
    }

    this.updateInventoryCharts(sourceData);
  }

  private updateInventoryCharts(allData: IgtSerial[]): void {
    const available = allData.filter((r) => r.status === 'available' && r.is_active === 1).length;
    const used = allData.filter((r) => r.status === 'used' && r.is_active === 1).length;
    const reserved = allData.filter((r) => r.status === 'reserved' && r.is_active === 1).length;
    const inactive = allData.filter((r) => r.is_active === 0).length;

    const barCategories = ['Available', 'Used'];
    const barData = [available, used];
    if (reserved > 0) {
      barCategories.push('Reserved');
      barData.push(reserved);
    }

    const donutLabels = ['Available', 'Used'];
    const donutSeries = [available, used];
    const donutColors = ['#2e8b57', '#3b7ed4'];
    if (reserved > 0) {
      donutLabels.push('Reserved');
      donutSeries.push(reserved);
      donutColors.push('#f7b84b');
    }
    if (inactive > 0) {
      donutLabels.push('Inactive');
      donutSeries.push(inactive);
      donutColors.push('#6c757d');
    }

    this.statusBarChart = {
      series: [{ name: 'Serials', data: barData }],
      chart: { type: 'bar', height: 240, toolbar: { show: false }, foreColor: 'var(--bs-body-color)' },
      xaxis: {
        categories: barCategories,
        labels: { style: { colors: ['var(--bs-body-color)'] } },
      },
      yaxis: {
        title: { text: 'Count', style: { color: 'var(--bs-body-color)' } },
        labels: { style: { colors: ['var(--bs-body-color)'] } },
      },
      plotOptions: { bar: { horizontal: false, borderRadius: 6, columnWidth: '45%' } },
      colors: ['#0ab39c'],
      dataLabels: { enabled: true },
      tooltip: { enabled: true },
    };

    this.statusDistributionChart = {
      series: donutSeries,
      chart: { type: 'donut', height: 240, foreColor: 'var(--bs-body-color)' },
      labels: donutLabels,
      colors: donutColors,
      dataLabels: { enabled: true, style: { colors: ['#ffffff'] }, dropShadow: { enabled: false } },
      legend: { position: 'bottom', labels: { colors: 'var(--bs-body-color)' } },
      responsive: [{ breakpoint: 480, options: { chart: { height: 220 } } }],
    };

    const monthMap = new Map<string, number>();
    allData.forEach((r) => {
      if (!r.used_at) return;
      const d = new Date(r.used_at);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
    });

    const now = new Date();
    const last8Months: string[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last8Months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const monthly = last8Months.map((key) => [key, monthMap.get(key) ?? 0] as [string, number]);

    this.uploadTrendChart = {
      series: [{ name: 'Serials Used', data: monthly.map(([, v]) => v) }],
      chart: { type: 'area', height: 240, toolbar: { show: false }, foreColor: 'var(--bs-body-color)' },
      xaxis: {
        categories: monthly.map(([m]) => {
          const [y, mo] = m.split('-');
          return new Date(Number(y), Number(mo) - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
        }),
        labels: { style: { colors: ['var(--bs-body-color)'] } },
      },
      yaxis: {
        title: { text: 'Serials Used', style: { color: 'var(--bs-body-color)' } },
        labels: { style: { colors: ['var(--bs-body-color)'] } },
      },
      stroke: { curve: 'smooth', width: 2 },
      dataLabels: { enabled: false },
      colors: ['#117a8b'],
      tooltip: { enabled: true },
    };
  }

  // Filter methods
  onFilterChange(): void {
    this.loadAllData();
  }

  onSearchChange(): void {
    this.gridApi?.setGridOption('quickFilterText', this.searchTerm?.trim() || '');
  }

  onIsActiveFilterChange(): void {
    this.loadAllData();
  }

  clearFilters(): void {
    this.categoryFilter = '';
    this.statusFilter = '';
    this.isActiveFilter = '';
    this.searchTerm = '';
    this.loadAllData();
  }

  hasActiveFilters(): boolean {
    return !!(this.categoryFilter || this.statusFilter || this.isActiveFilter !== '' || this.searchTerm);
  }

  getFilteredCount(): number {
    return this.gridApi?.getDisplayedRowCount() || 0;
  }

  openAssignmentDetails(serial: IgtSerial): void {
    if (!serial?.serial_number) {
      this.toastr.warning('IGT serial number is missing.');
      return;
    }

    this.serialAssignmentUsageDetailsModalService.openByIgtSerialNumber(serial.serial_number);
  }

  refreshData(): void {
    this.loadAllData();
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
      
      // Use real API to update the serial number
      if (updatedSerial.id) {
        this.serialNumberService.update(updatedSerial.id, updatedSerial)
          .then((response) => {
            // Handle different response formats and extract the actual data
            let serialData = response;
            if (response && typeof response === 'object' && !Array.isArray(response)) {
              if (response.data) {
                serialData = response.data;
              } else if (response.serial) {
                serialData = response.serial;
              }
            }
            
            // Update local data
            const index = this.rowData.findIndex(s => s.id === updatedSerial.id);
            if (index !== -1) {
              this.rowData[index] = { ...this.rowData[index], ...serialData };
              this.gridApi.setGridOption('rowData', this.rowData);
              this.updateStatistics();
            }
            this.toastr.success('Serial number updated successfully');
            this.editModalRef?.close();
          })
          .catch((error) => {
            console.error('Error updating serial number:', error);
            this.toastr.error('Failed to update serial number');
          });
      } else {
        // Create new serial if no ID exists
        this.serialNumberService.create(updatedSerial)
          .then((response) => {
            // Handle different response formats and extract the actual data
            let serialData = response;
            if (response && typeof response === 'object' && !Array.isArray(response)) {
              if (response.data) {
                serialData = response.data;
              } else if (response.serial) {
                serialData = response.serial;
              }
            }
            
            this.rowData.push(serialData);
            this.gridApi.setGridOption('rowData', this.rowData);
            this.updateStatistics();
            this.toastr.success('Serial number created successfully');
            this.editModalRef?.close();
          })
          .catch((error) => {
            console.error('Error creating serial number:', error);
            this.toastr.error('Failed to create serial number');
          });
      }
    }
  }

  deleteSerial(serial: IgtSerial): void {
    if (confirm(`Are you sure you want to delete serial number "${serial.serial_number}"?`)) {
      this.performDelete([serial]);
    }
  }

  private normalizeSerialStatus(status: unknown): string {
    return String(status ?? '').trim().toLowerCase();
  }

  markSerialAsUsed(serial: IgtSerial): void {
    if (this.normalizeSerialStatus(serial.status) === 'used') {
      this.toastr.info('This serial is already marked as used.');
      return;
    }

    this.serialToMarkUsed = serial;
    this.markAsUsedReason = 'Used in Production';
    this.markAsUsedAcknowledged = false;
    this.markAsUsedModalRef = this.modal.open(this.markAsUsedModal, { centered: true, backdrop: 'static' });
  }

  closeMarkAsUsedModal(): void {
    this.markAsUsedModalRef?.dismiss();
    this.serialToMarkUsed = null;
    this.markAsUsedAcknowledged = false;
  }

  confirmMarkAsUsed(): void {
    if (!this.serialToMarkUsed || !this.markAsUsedAcknowledged) return;

    this.isMarkingAsUsed = true;
    this.serialNumberService.update(this.serialToMarkUsed.id, { status: 'used' })
      .then(() => {
        this.toastr.success(`Serial ${this.serialToMarkUsed!.serial_number} marked as used`);
        this.markAsUsedModalRef?.close();
        this.serialToMarkUsed = null;
        this.refreshData();
      })
      .catch((error: any) => {
        const msg = error?.error?.message || error?.message || 'Failed to mark serial as used';
        this.toastr.error(msg);
      })
      .finally(() => {
        this.isMarkingAsUsed = false;
      });
  }

  restoreSerialToAvailable(serial: IgtSerial): void {
    const status = this.normalizeSerialStatus(serial.status);
    if (status === 'available') {
      this.toastr.info('This serial is already available.');
      return;
    }

    if (status !== 'used' && status !== 'reserved') {
      this.toastr.warning('Only used or reserved serials can be restored to available.');
      return;
    }

    this.serialToRestore = serial;
    this.restoreAcknowledged = false;
    this.restoreAssignmentConflictCount = 0;
    this.restoreAssignmentError = '';
    this.isCheckingRestoreAssignments = true;

    this.restoreModalRef = this.modal.open(this.restoreModal, { centered: true, backdrop: 'static' });

    this.serialAssignmentsService.getAssignmentsByIgtSerialNumber(serial.serial_number)
      .then((response: any) => {
        const rows: any[] = Array.isArray(response?.data) ? response.data : [];
        this.restoreAssignmentConflictCount = rows.filter((r: any) => !r.is_voided).length;
      })
      .catch(() => {
        this.restoreAssignmentError = 'Could not check serial assignment records.';
      })
      .finally(() => {
        this.isCheckingRestoreAssignments = false;
      });
  }

  closeRestoreModal(): void {
    this.restoreModalRef?.dismiss();
    this.serialToRestore = null;
    this.restoreAcknowledged = false;
  }

  confirmRestore(): void {
    if (!this.serialToRestore || !this.restoreAcknowledged || this.restoreAssignmentConflictCount > 0) return;

    this.isRestoring = true;
    this.serialNumberService.update(this.serialToRestore.id, { status: 'available', is_active: 1 })
      .then(() => {
        this.toastr.success(`Serial ${this.serialToRestore!.serial_number} restored to available`);
        this.restoreModalRef?.close();
        this.serialToRestore = null;
        this.refreshData();
      })
      .catch((error: any) => {
        const msg = error?.error?.message || error?.message || 'Failed to restore serial to available';
        this.toastr.error(msg);
      })
      .finally(() => {
        this.isRestoring = false;
      });
  }

  writeOffSerial(serial: IgtSerial): void {
    const status = this.normalizeSerialStatus(serial.status);
    if (status === 'used') {
      this.toastr.info('Used serials cannot be written off. Use Restore to Available first if this was a mistake.');
      return;
    }

    this.serialToWriteOff = serial;
    this.writeOffReason = 'Damaged';
    this.writeOffAcknowledged = false;
    this.writeOffModalRef = this.modal.open(this.writeOffModal, { centered: true, backdrop: 'static' });
  }

  closeWriteOffModal(): void {
    this.writeOffModalRef?.dismiss();
    this.serialToWriteOff = null;
    this.writeOffAcknowledged = false;
  }

  confirmWriteOff(): void {
    if (!this.serialToWriteOff || !this.writeOffAcknowledged) return;

    const existingNotes = (this.serialToWriteOff.notes || '').trim();
    const writeOffNote = `Write-off: ${this.writeOffReason}`;
    const mergedNotes = existingNotes ? `${existingNotes}\n${writeOffNote}` : writeOffNote;

    this.isWritingOff = true;
    this.serialNumberService.update(this.serialToWriteOff.id, { is_active: 0, notes: mergedNotes })
      .then(() => {
        this.toastr.success(`Serial ${this.serialToWriteOff!.serial_number} written off`);
        this.writeOffModalRef?.close();
        this.serialToWriteOff = null;
        this.refreshData();
      })
      .catch((error: any) => {
        const msg = error?.error?.message || error?.message || 'Failed to write off serial';
        this.toastr.error(msg);
      })
      .finally(() => {
        this.isWritingOff = false;
      });
  }

  bulkDelete(): void {
    if (this.selectedSerials.length === 0) return;

    if (confirm(`Are you sure you want to delete ${this.selectedSerials.length} selected serial numbers?`)) {
      this.performDelete(this.selectedSerials);
    }
  }

  private performDelete(serials: IgtSerial[]): void {
    // Use real API to delete serial numbers (bulk delete if multiple)
    const deletePromises = serials.map(serial => {
      return this.serialNumberService.delete(serial.id);
    });

    Promise.all(deletePromises)
      .then(() => {
        // Remove deleted items from local data
        const idsToDelete = serials.map(s => s.id);
        this.rowData = this.rowData.filter(s => !idsToDelete.includes(s.id));
        this.gridApi.setGridOption('rowData', this.rowData);
        this.updateStatistics();
        this.selectedSerials = [];
        this.toastr.success(`${serials.length} serial number(s) deleted successfully`);
      })
      .catch((error) => {
        console.error('Error deleting serial numbers:', error);
        this.toastr.error('Failed to delete some serial numbers');
        // Reload data to ensure consistency
        this.refreshData();
      });
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
    this.router.navigate(['/quality/igt']);
  }
}
