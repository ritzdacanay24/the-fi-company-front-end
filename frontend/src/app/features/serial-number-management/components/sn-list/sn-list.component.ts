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
import { SnActionDropdownRendererComponent } from './sn-action-dropdown-renderer.component';

type SimpleSerialNumberStatus = 'available' | 'used' | 'voided';

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
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, AgGridModule, NgbDropdownModule, NgApexchartsModule],
  selector: 'app-sn-list',
  templateUrl: './sn-list.component.html',
  styleUrls: ['./sn-list.component.scss']
})
export class SnListComponent implements OnInit {
  serialNumbers: SerialNumber[] = [];
  filteredSerialNumbers: SerialNumber[] = [];
  quickSearchTerm = '';

  filterForm: FormGroup;
  isLoading = false;
  hasError = false;
  errorMessage = '';
  selectedSerialNumbers: Set<string> = new Set();
  gridApi!: GridApi;

  statusBarChart: Partial<ChartOptions> = {};
  statusDistributionChart: Partial<ChartOptions> = {};
  uploadTrendChart: Partial<ChartOptions> = {};

  // Filter options
  statusOptions: { value: SimpleSerialNumberStatus | 'all', label: string }[] = [
    { value: 'all', label: 'All Status' },
    { value: 'available', label: 'Available' },
    { value: 'used', label: 'Used' },
    { value: 'voided', label: 'Voided' }
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
        const status = this.getSimpleStatus(params.data);
        const badges: Record<string, string> = {
          available: 'success',
          used: 'warning',
          voided: 'secondary'
        };
        const icons: Record<string, string> = {
          available: 'check-circle',
          used: 'clock',
          voided: 'cancel'
        };
        const badgeClass = badges[status] || 'secondary';
        const icon = icons[status] || 'question';
        return `<span class="badge bg-${badgeClass} text-white">
          <i class="mdi mdi-${icon}"></i> ${status.charAt(0).toUpperCase() + status.slice(1)}
        </span>`;
      }
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
      headerName: 'Consumed Date',
      field: 'assigned_at',
      sortable: true,
      filter: 'agDateColumnFilter',
      width: 140,
      valueFormatter: (params: any) => {
        const status = this.getSimpleStatus(params.data);
        if (status !== 'used') {
          return '—';
        }
        return params.value ? moment(params.value).format('MM/DD/YYYY') : '—';
      }
    },
    {
      headerName: 'Created By',
      field: 'created_by',
      sortable: true,
      filter: true,
      width: 140,
      cellRenderer: (params: any) => {
        return params.value || '<span class="text-muted">—</span>';
      }
    },
    {
      headerName: 'Actions',
      colId: 'actions',
      width: 120,
      pinned: 'right',
      sortable: false,
      filter: false,
      floatingFilter: false,
      cellRenderer: SnActionDropdownRendererComponent,
      cellRendererParams: {
        onMarkUsed: (row: SerialNumber) => this.markSerialAsUsed(row),
        onRestoreAvailable: (row: SerialNumber) => this.restoreSerialToAvailable(row),
        onMarkVoided: (row: SerialNumber) => this.voidSerial(row),
      },
    },
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
      sortBy: ['serial_number_asc'],
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
    this.onQuickSearchChange();
  }

  onQuickSearchChange(): void {
    if (!this.gridApi) return;

    this.gridApi.setGridOption('quickFilterText', this.quickSearchTerm?.trim() || '');
  }

  clearQuickSearch(): void {
    this.quickSearchTerm = '';
    this.onQuickSearchChange();
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
    this.updateInventoryCharts(this.filteredSerialNumbers);
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
      filtered = filtered.filter(sn => this.getSimpleStatus(sn) === filters.status);
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
  async updateStatus(serialNumber: string, newStatus: SimpleSerialNumberStatus) {
    const backendStatus = this.mapSimpleToBackendStatus(newStatus);
    const reason = this.getStatusReason(newStatus);

    try {
      await this.serialNumberService.updateSerialNumberStatus(serialNumber, backendStatus, reason);
      this.toastr.success(`Status updated: ${serialNumber} -> ${newStatus}`);
      await this.loadSerialNumbers();
    } catch (error: any) {
      console.error('Error updating status:', error);
      this.toastr.error(error?.error?.message || error.message || 'Failed to update serial status');
    }
  }

  async bulkUpdateStatus(newStatus: SimpleSerialNumberStatus) {
    const selected = this.getSelectedRows();
    if (selected.length === 0) {
      this.toastr.warning('No serial numbers selected');
      return;
    }

    const backendStatus = this.mapSimpleToBackendStatus(newStatus);
    const reason = this.getStatusReason(newStatus);
    let successCount = 0;

    for (const row of selected) {
      try {
        await this.serialNumberService.updateSerialNumberStatus(row.serial_number, backendStatus, reason);
        successCount += 1;
      } catch (error) {
        console.error(`Failed to update ${row.serial_number}:`, error);
      }
    }

    if (successCount > 0) {
      this.toastr.success(`Updated ${successCount} of ${selected.length} serial numbers`);
      await this.loadSerialNumbers();
    } else {
      this.toastr.error('Failed to update selected serial numbers');
    }
  }

  async markSerialAsUsed(serialData: SerialNumber): Promise<void> {
    await this.updateStatus(serialData.serial_number, 'used');
  }

  async restoreSerialToAvailable(serialData: SerialNumber): Promise<void> {
    await this.updateStatus(serialData.serial_number, 'available');
  }

  // Mark serial as voided/dispositioned
  async voidSerial(serialData: SerialNumber) {
    await this.updateStatus(serialData.serial_number, 'voided');
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
      sortBy: 'serial_number_asc',
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
    const available = this.filteredSerialNumbers.filter(sn => this.getSimpleStatus(sn) === 'available').length;
    const used = this.filteredSerialNumbers.filter(sn => this.getSimpleStatus(sn) === 'used').length;
    const voided = this.filteredSerialNumbers.filter(sn => this.getSimpleStatus(sn) === 'voided').length;
    const uniqueModels = new Set(this.filteredSerialNumbers.map(sn => sn.product_model)).size;

    return {
      total,
      available,
      used,
      voided,
      uniqueModels
    };
  }

  private getSimpleStatus(sn: SerialNumber | undefined): SimpleSerialNumberStatus {
    const rawStatus = String(sn?.status || '').toLowerCase();
    if (rawStatus === 'available') {
      return 'available';
    }

    if (rawStatus === 'returned' || rawStatus === 'defective' || rawStatus === 'voided') {
      return 'voided';
    }

    return 'used';
  }

  private mapSimpleToBackendStatus(status: SimpleSerialNumberStatus): SerialNumber['status'] {
    if (status === 'available') {
      return 'available';
    }

    if (status === 'voided') {
      return 'defective';
    }

    return 'assigned';
  }

  private getStatusReason(status: SimpleSerialNumberStatus): string {
    if (status === 'available') {
      return 'Manual restore to available';
    }

    if (status === 'voided') {
      return 'Manual void/disposition';
    }

    return 'Manual mark as used';
  }

  private updateInventoryCharts(allData: SerialNumber[]): void {
    const available = allData.filter((r) => this.getSimpleStatus(r) === 'available').length;
    const used = allData.filter((r) => this.getSimpleStatus(r) === 'used').length;
    const voided = allData.filter((r) => this.getSimpleStatus(r) === 'voided').length;

    this.statusBarChart = {
      series: [{ name: 'Serials', data: [available, used, voided] }],
      chart: { type: 'bar', height: 240, toolbar: { show: false }, foreColor: 'var(--bs-body-color)' },
      xaxis: {
        categories: ['Available', 'Used', 'Voided'],
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
      series: [available, used, voided],
      chart: { type: 'donut', height: 240, foreColor: 'var(--bs-body-color)' },
      labels: ['Available', 'Used', 'Voided'],
      colors: ['#2e8b57', '#3b7ed4', '#6c757d'],
      dataLabels: { enabled: true, style: { colors: ['#ffffff'] }, dropShadow: { enabled: false } },
      legend: { position: 'bottom', labels: { colors: 'var(--bs-body-color)' } },
      responsive: [{ breakpoint: 480, options: { chart: { height: 220 } } }],
    };

    const monthMap = new Map<string, number>();
    allData.forEach((r) => {
      if (!r.assigned_at) return;
      const d = new Date(r.assigned_at);
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
}