import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { ULLabelService } from '../../services/ul-label.service';
import { ULLabel } from '../../models/ul-label.model';
import { ColDef, GridApi, GridReadyEvent, GridOptions } from 'ag-grid-community';
import { BreadcrumbComponent, BreadcrumbItem } from "@app/shared/components/breadcrumb/breadcrumb.component";
import { AuthenticationService } from '@app/core/services/auth.service';
import moment from 'moment';
import { AgGridModule } from 'ag-grid-angular';
import { NgApexchartsModule } from 'ng-apexcharts';
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
} from 'ng-apexcharts';
import { ULLabelActionDropdownRendererComponent } from './ul-label-action-dropdown-renderer.component';
import { SerialAssignmentUsageDetailsModalService } from '@app/shared/components/serial-assignment-usage-details-modal/serial-assignment-usage-details-modal.component';
import { SerialAssignmentsService } from '@app/features/serial-assignments/services/serial-assignments.service';

type LabelsChartOptions = {
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
  imports: [SharedModule, AgGridModule, BreadcrumbComponent, NgApexchartsModule],
  selector: 'app-ul-labels-report',
  templateUrl: './ul-labels-report.component.html',
  styleUrls: ['./ul-labels-report.component.scss']
})
export class ULLabelsReportComponent implements OnInit {
  @ViewChild('editLabelModal') editLabelModal!: TemplateRef<any>;
  @ViewChild('writeOffModal') writeOffModal!: TemplateRef<any>;
  @ViewChild('markAsUsedModal') markAsUsedModal!: TemplateRef<any>;
  @ViewChild('restoreModal') restoreModal!: TemplateRef<any>;

  filterForm: FormGroup;
  editLabelForm: FormGroup;
  ulLabels: ULLabel[] = [];
  filteredData: ULLabel[] = [];
  selectedCategoryTab: 'all' | 'New' | 'Used' = 'all';
  isLoading = false;
  isSavingEdit = false;
  selectedEditLabelId: number | null = null;
  private editModalRef: NgbModalRef | null = null;
  isWritingOff = false;
  selectedWriteOffLabelId: number | null = null;
  selectedWriteOffUlNumber = '';
  writeOffReason: 'Damaged' | 'Lost' | 'Other' = 'Damaged';
  writeOffNotes = '';
  private writeOffModalRef: NgbModalRef | null = null;
  isMarkingAsUsed = false;
  selectedMarkAsUsedLabelId: number | null = null;
  selectedMarkAsUsedUlNumber = '';
  markAsUsedReason: 'Used in Production' | 'Sample/Demo' | 'In-house Testing' | 'Other' = 'Used in Production';
  markAsUsedNotes = '';
  markAsUsedAcknowledged = false;
  isCheckingMarkAsUsedHistory = false;
  markAsUsedHistoryCount = 0;
  markAsUsedAssignmentConflictCount = 0;
  markAsUsedHistoryError = '';
  private markAsUsedModalRef: NgbModalRef | null = null;
  isRestoring = false;
  selectedRestoreLabelId: number | null = null;
  selectedRestoreUlNumber = '';
  restoreReason: 'Manual correction' | 'Wrong action selected' | 'Other' = 'Manual correction';
  restoreAcknowledged = false;
  isCheckingRestoreAssignments = false;
  restoreAssignmentConflictCount = 0;
  restoreAssignmentError = '';
  private restoreModalRef: NgbModalRef | null = null;
  gridApi!: GridApi;

  inventoryInsights = {
    qRemaining: 0,
    tRemaining: 0,
    qTotal: 0,
    tTotal: 0,
    totalRemaining: 0,
    usedCount: 0,
    lastUploadDateDisplay: 'N/A',
    qSharePct: 0,
    tSharePct: 0,
    remainingPct: 0,
    activePct: 0,
  };

  qtRemainingChart: Partial<LabelsChartOptions> = {};
  statusDistributionChart: Partial<LabelsChartOptions> = {};
  uploadTrendChart: Partial<LabelsChartOptions> = {};

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
      headerName: 'Available',
      field: 'is_consumed',
      sortable: true,
      filter: 'agSetColumnFilter',
      floatingFilter: true,
      width: 110,
      cellRenderer: (params: any) => {
        const consumed = params.value === 1 || params.value === '1' || params.value === true;
        return consumed
          ? `<span class="badge bg-secondary">Used</span>`
          : `<span class="badge bg-success">Available</span>`;
      },
      filterParams: {
        values: [0, 1],
        valueFormatter: (p: any) => p.value === 1 ? 'Used' : 'Available',
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
      headerName: 'Created By',
      field: 'created_by',
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
      width: 170,
      cellRenderer: (params: any) => {
        const value = String(params.value || '').trim();
        return value ? value : '<span class="text-muted">-</span>';
      },
      filterParams: {
        filterOptions: ['contains', 'equals', 'startsWith'],
        defaultOption: 'contains'
      }
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 200,
      pinned: 'right',
      sortable: false,
      filter: false,
      cellRenderer: ULLabelActionDropdownRendererComponent,
      cellRendererParams: {
        canEdit: this.canEditLabels(),
        onEdit: (id: number) => this.editULLabel(id),
        onToggle: (id: number, status: string) => this.toggleULLabel(String(id), status),
        onVoid: (id: number) => this.openMarkAsUsedModal(id),
        onWriteOff: (id: number) => this.openWriteOffModal(id),
        onRestore: (id: number) => this.openRestoreModal(id),
        onViewUsage: (id: number) => this.openUsageDetailsModal(id),
      },
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
    private authenticationService: AuthenticationService,
    private serialAssignmentsService: SerialAssignmentsService,
    private serialAssignmentUsageDetailsModalService: SerialAssignmentUsageDetailsModalService,
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

    this.editLabelForm = this.fb.group({
      ul_number: [''],
      description: [''],
      category: [''],
      manufacturer: [''],
      part_number: [''],
      status: ['active'],
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
  }

  loadULLabels(): void {
    this.isLoading = true;

    this.ulLabelService.listLabels().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.ulLabels = response.data || [];
          this.applyFilters();
          this.updateDashboardCharts();
        } else {
          console.warn(response.message || 'Failed to load UL Labels');
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Load error:', error);
      }
    });
  }

  applyFilters(): void {
    const filters = this.filterForm.value;
    let filtered = [...this.ulLabels];

    // Apply category tab first (All / New / Used)
    if (this.selectedCategoryTab !== 'all') {
      filtered = filtered.filter(item => item.category === this.selectedCategoryTab);
    }

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
    this.updateDashboardCharts();
  }

  onCategoryTabChange(tab: 'all' | 'New' | 'Used'): void {
    this.selectedCategoryTab = tab;
    this.applyFilters();
  }

  getCategoryInventoryCount(tab: 'all' | 'New' | 'Used'): number {
    const available = this.ulLabels.filter((label) => !this.isUsedLabel(label));

    if (tab === 'all') {
      return available.length;
    }

    return available.filter((label) => label.category === tab).length;
  }

  private isUsedLabel(label: ULLabel): boolean {
    const isConsumed = (label as ULLabel & { is_consumed?: boolean | number | string }).is_consumed;
    return isConsumed === true || isConsumed === 1 || isConsumed === '1';
  }

  private toPercentage(value: number, total: number): number {
    if (total <= 0) {
      return 0;
    }

    return Math.round((value / total) * 100);
  }

  miniPieBackground(percent: number, color: string): string {
    return `conic-gradient(${color} 0 ${percent}%, #e6edf5 ${percent}% 100%)`;
  }

  private updateDashboardCharts(): void {
    const allLabels = this.ulLabels || [];
    const activeUnUsed = allLabels.filter((label) => label.status === 'active' && !this.isUsedLabel(label));

    const qRemaining = activeUnUsed.filter((label) => (label.ul_number || '').toUpperCase().startsWith('Q')).length;
    const tRemaining = activeUnUsed.filter((label) => (label.ul_number || '').toUpperCase().startsWith('T')).length;
    const qTotal = allLabels.filter((label) => (label.ul_number || '').toUpperCase().startsWith('Q')).length;
    const tTotal = allLabels.filter((label) => (label.ul_number || '').toUpperCase().startsWith('T')).length;
    const usedCount = allLabels.filter((label) => this.isUsedLabel(label)).length;
    const totalLabels = allLabels.length;
    const totalRemaining = qRemaining + tRemaining;
    const activeCount = allLabels.filter((label) => label.status === 'active').length;
    const inactiveCount = allLabels.filter((label) => label.status === 'inactive').length;
    const expiredCount = allLabels.filter((label) => label.status === 'expired').length;

    const dates = allLabels
      .map((label) => label.created_at)
      .filter((value): value is string => !!value)
      .sort((a, b) => moment(b).valueOf() - moment(a).valueOf());

    const lastUploadDateDisplay = dates.length ? moment(dates[0]).format('MM/DD/YYYY h:mm A') : 'N/A';

    this.inventoryInsights = {
      qRemaining,
      tRemaining,
      qTotal,
      tTotal,
      totalRemaining,
      usedCount,
      lastUploadDateDisplay,
      qSharePct: this.toPercentage(qRemaining, qTotal),
      tSharePct: this.toPercentage(tRemaining, tTotal),
      remainingPct: this.toPercentage(totalRemaining, totalLabels),
      activePct: this.toPercentage(activeCount, totalLabels),
    };

    this.qtRemainingChart = {
      series: [
        {
          name: 'Remaining Labels',
          data: [qRemaining, tRemaining],
        },
      ],
      chart: {
        type: 'bar',
        height: 240,
        toolbar: { show: false },
        foreColor: 'var(--bs-body-color)',
      },
      xaxis: {
        categories: ['Q Series', 'T Series'],
        labels: { style: { colors: ['var(--bs-body-color)'] } },
      },
      yaxis: {
        title: { text: 'Count', style: { color: 'var(--bs-body-color)' } },
        labels: { style: { colors: ['var(--bs-body-color)'] } },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          borderRadius: 6,
          columnWidth: '45%',
        },
      },
      colors: ['#255f9e'],
      dataLabels: { enabled: true },
      tooltip: { enabled: true },
    };

    this.statusDistributionChart = {
      series: [activeCount, inactiveCount, expiredCount],
      chart: {
        type: 'donut',
        height: 240,
        foreColor: 'var(--bs-body-color)',
      },
      labels: ['Active', 'Inactive', 'Expired'],
      colors: ['#2e8b57', '#6c757d', '#c43d3d'],
      legend: {
        position: 'bottom',
        labels: { colors: 'var(--bs-body-color)' },
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              height: 220,
            },
          },
        },
      ],
    };

    const monthMap = new Map<string, number>();
    allLabels.forEach((label) => {
      if (!label.created_at) {
        return;
      }

      const monthKey = moment(label.created_at).format('YYYY-MM');
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
    });

    const monthly = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8);

    this.uploadTrendChart = {
      series: [
        {
          name: 'Uploaded Labels',
          data: monthly.map(([, value]) => value),
        },
      ],
      chart: {
        type: 'area',
        height: 240,
        toolbar: { show: false },
        foreColor: 'var(--bs-body-color)',
      },
      xaxis: {
        categories: monthly.map(([month]) => moment(month, 'YYYY-MM').format('MMM YY')),
        labels: { style: { colors: ['var(--bs-body-color)'] } },
      },
      yaxis: {
        title: { text: 'Labels Uploaded', style: { color: 'var(--bs-body-color)' } },
        labels: { style: { colors: ['var(--bs-body-color)'] } },
      },
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      dataLabels: { enabled: false },
      colors: ['#117a8b'],
      tooltip: { enabled: true },
    };
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
    if (!this.canEditLabels()) {
      this.toastr.warning('Only admins can edit UL labels.');
      return;
    }

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

  private canEditLabels(): boolean {
    const currentUser = this.authenticationService.currentUserValue;
    return currentUser?.isAdmin == 1;
  }

  exportData(): void {
    this.ulLabelService.exportLabels().subscribe({
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
    this.selectedCategoryTab = 'all';
    this.applyFilters();
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
    const raw = (ulLabel as ULLabel & { is_consumed?: boolean | number | string; is_used?: boolean | number | string });
    return raw.is_consumed === true || raw.is_consumed === 1 || raw.is_consumed === '1'
      || raw.is_used === true || raw.is_used === 1 || raw.is_used === '1';
  }

  openEditModal(ulLabel: ULLabel): void {
    if (!ulLabel.id) {
      this.toastr.warning('Unable to edit this UL label. Missing ID.');
      return;
    }

    this.selectedEditLabelId = ulLabel.id;
    this.editLabelForm.patchValue({
      ul_number: ulLabel.ul_number || '',
      description: ulLabel.description || '',
      category: ulLabel.category || '',
      manufacturer: ulLabel.manufacturer || '',
      part_number: ulLabel.part_number || '',
      status: ulLabel.status || 'active',
    });

    this.editModalRef = this.modalService.open(this.editLabelModal, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
    });
  }

  saveEditedLabel(): void {
    if (!this.selectedEditLabelId) {
      this.toastr.warning('Unable to save changes. Missing UL label ID.');
      return;
    }

    this.isSavingEdit = true;

    const formValue = this.editLabelForm.value;
    const payload: ULLabel = {
      ul_number: String(formValue.ul_number || '').trim(),
      description: String(formValue.description || '').trim(),
      category: String(formValue.category || '').trim(),
      manufacturer: String(formValue.manufacturer || '').trim(),
      part_number: String(formValue.part_number || '').trim(),
      status: formValue.status,
    };

    this.ulLabelService.updateLabel(this.selectedEditLabelId, payload).subscribe({
      next: () => {
        this.isSavingEdit = false;
        this.toastr.success('UL label updated successfully');
        this.closeEditModal();
        this.loadULLabels();
      },
      error: (error) => {
        this.isSavingEdit = false;
        console.error('Error updating UL label:', error);
      }
    });
  }

  closeEditModal(): void {
    this.editModalRef?.close();
    this.editModalRef = null;
    this.selectedEditLabelId = null;
    this.editLabelForm.reset({
      ul_number: '',
      description: '',
      category: '',
      manufacturer: '',
      part_number: '',
      status: 'active',
    });
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
      this.ulLabelService.updateLabelStatus(idNumber, newStatus as 'active' | 'inactive').subscribe({
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

  voidULLabel(id: string, reason: string, notes: string, performedBy: string): void {
    const idNumber = parseInt(id);
    const ulLabel = this.ulLabels.find(label => label.id === idNumber);

    if (ulLabel && this.isULLabelUsed(ulLabel)) {
      this.toastr.warning('This UL label has already been consumed.');
      return;
    }

    this.ulLabelService.voidLabel(idNumber, reason, notes, performedBy).subscribe({
      next: (response) => {
        if (response?.success === false) {
          this.toastr.warning(response?.message || 'Failed to mark UL label as used');
          return;
        }

        this.toastr.success('UL label marked as used');
        this.loadULLabels();
      },
      error: (error) => {
        console.error('Error marking UL label as used:', error);
      }
    });
  }

  openMarkAsUsedModal(id: number): void {
    const label = this.ulLabels.find(l => l.id === id);
    if (!label) return;
    if (this.isULLabelUsed(label)) {
      this.toastr.warning('This UL label has already been consumed.');
      return;
    }
    this.selectedMarkAsUsedLabelId = id;
    this.selectedMarkAsUsedUlNumber = label.ul_number;
    this.markAsUsedReason = 'Used in Production';
    this.markAsUsedNotes = '';
    this.markAsUsedAcknowledged = false;
    this.markAsUsedModalRef = this.modalService.open(this.markAsUsedModal, { centered: true, size: 'lg' });
  }

  private isVoidedRow(row: any): boolean {
    const raw = row?.is_voided;
    return raw === true || raw === 1 || raw === '1';
  }

  private async loadMarkAsUsedHistory(ulNumber: string): Promise<void> {
    if (!ulNumber) {
      return;
    }

    this.isCheckingMarkAsUsedHistory = true;
    this.markAsUsedHistoryError = '';

    try {
      const response = await this.serialAssignmentsService.getAssignmentsByUlNumber(ulNumber);
      const rows = Array.isArray(response?.data) ? response.data : [];
      this.markAsUsedHistoryCount = rows.length;
      this.markAsUsedAssignmentConflictCount = rows.filter((row) => {
        return row?.source_table === 'serial_assignments' && !this.isVoidedRow(row);
      }).length;
    } catch {
      this.markAsUsedHistoryError = 'Unable to check prior usage history right now.';
      this.markAsUsedHistoryCount = 0;
      this.markAsUsedAssignmentConflictCount = 0;
    } finally {
      this.isCheckingMarkAsUsedHistory = false;
    }
  }

  closeMarkAsUsedModal(): void {
    this.markAsUsedModalRef?.close();
    this.markAsUsedModalRef = null;
    this.markAsUsedAcknowledged = false;
    this.markAsUsedHistoryCount = 0;
    this.markAsUsedAssignmentConflictCount = 0;
    this.markAsUsedHistoryError = '';
    this.isCheckingMarkAsUsedHistory = false;
    this.markAsUsedNotes = '';
  }

  confirmMarkAsUsed(): void {
    if (!this.selectedMarkAsUsedLabelId || !this.markAsUsedAcknowledged) return;
    const currentUser = this.authenticationService.currentUserValue;
    const performedBy = (currentUser as any)?.full_name || (currentUser as any)?.username || 'system';
    this.isMarkingAsUsed = true;
    this.voidULLabel(
      String(this.selectedMarkAsUsedLabelId),
      this.markAsUsedReason,
      this.markAsUsedNotes,
      performedBy,
    );
    this.closeMarkAsUsedModal();
    this.isMarkingAsUsed = false;
  }

  openWriteOffModal(id: number): void {
    const label = this.ulLabels.find(l => l.id === id);
    if (!label) return;
    this.selectedWriteOffLabelId = id;
    this.selectedWriteOffUlNumber = label.ul_number;
    this.writeOffReason = 'Damaged';
    this.writeOffNotes = '';
    this.writeOffModalRef = this.modalService.open(this.writeOffModal, { centered: true, size: 'lg' });
  }

  closeWriteOffModal(): void {
    this.writeOffModalRef?.close();
    this.writeOffModalRef = null;
  }

  confirmWriteOff(): void {
    if (!this.selectedWriteOffLabelId) return;
    const currentUser = this.authenticationService.currentUserValue;
    const performedBy = (currentUser as any)?.full_name || (currentUser as any)?.username || 'system';

    this.isWritingOff = true;
    this.ulLabelService.writeOffLabel(this.selectedWriteOffLabelId, this.writeOffReason, this.writeOffNotes, performedBy).subscribe({
      next: () => {
        this.toastr.success(`UL label ${this.selectedWriteOffUlNumber} written off (${this.writeOffReason})`);
        this.closeWriteOffModal();
        this.isWritingOff = false;
        this.loadULLabels();
      },
      error: (error) => {
        console.error('Error writing off UL label:', error);
        this.isWritingOff = false;
      }
    });
  }

  openRestoreModal(id: number): void {
    const ulLabel = this.ulLabels.find(label => label.id === id);
    if (!ulLabel) {
      this.toastr.warning('UL label not found.');
      return;
    }

    if (!this.isULLabelUsed(ulLabel)) {
      this.toastr.info('UL label is already available.');
      return;
    }

    this.selectedRestoreLabelId = id;
    this.selectedRestoreUlNumber = ulLabel.ul_number;
    this.restoreReason = 'Manual correction';
    this.restoreAcknowledged = false;
    this.restoreAssignmentConflictCount = 0;
    this.restoreAssignmentError = '';
    this.isCheckingRestoreAssignments = true;
    this.restoreModalRef = this.modalService.open(this.restoreModal, { centered: true, size: 'lg' });

    this.serialAssignmentsService.getAssignmentsByUlNumber(ulLabel.ul_number)
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
    this.restoreModalRef?.close();
    this.restoreModalRef = null;
    this.restoreAcknowledged = false;
    this.restoreAssignmentConflictCount = 0;
    this.restoreAssignmentError = '';
    this.isCheckingRestoreAssignments = false;
  }

  confirmRestore(): void {
    if (!this.selectedRestoreLabelId || !this.restoreAcknowledged) {
      return;
    }

    const currentUser = this.authenticationService.currentUserValue;
    const performedBy = (currentUser as any)?.full_name || (currentUser as any)?.username || 'system';
    const labelId = this.selectedRestoreLabelId;
    const labelNumber = this.selectedRestoreUlNumber;

    this.isRestoring = true;

    this.ulLabelService.restoreLabelAvailability(labelId, this.restoreReason, performedBy).subscribe({
      next: () => {
        this.toastr.success(`UL label ${labelNumber} restored to available`);
        this.closeRestoreModal();
        this.isRestoring = false;
        this.loadULLabels();
      },
      error: (error) => {
        const apiMessage = error?.error?.message;
        console.error('Error restoring UL label:', error);
        if (apiMessage) {
          this.toastr.warning(apiMessage);
        }
        this.isRestoring = false;
      }
    });
  }

  async openUsageDetailsModal(id: number): Promise<void> {
    const ulLabel = this.ulLabels.find(label => label.id === id);
    if (!ulLabel) {
      this.toastr.warning('UL label not found.');
      return;
    }
    this.serialAssignmentUsageDetailsModalService.open(ulLabel.ul_number);
  }
}
