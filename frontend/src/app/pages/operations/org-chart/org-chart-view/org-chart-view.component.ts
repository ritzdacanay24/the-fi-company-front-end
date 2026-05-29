import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { OrgChartModule } from "../org-chart.module";
import { AgGridModule } from 'ag-grid-angular';

import { Component, OnInit, AfterViewInit, OnDestroy, Input, ViewChild, ElementRef, Inject } from "@angular/core";
import { OrgChart } from "d3-org-chart";
import { UserService } from "@app/core/api/field-service/user.service";
import { UserModalService } from "@app/pages/maintenance/user/user-modal/user-modal.component";
import { accessRight } from "@app/pages/maintenance/user/user-constant";

import { UserSearchV1Component } from "@app/shared/components/user-search-v1/user-search-v1.component";
import { DepartmentModalService } from "../department-modal/department-modal.service";
import { DepartmentService, Department } from "../services/department.service";
import { OrgChartUserModalService, OrgChartUserModalMode } from "../org-chart-user-modal/org-chart-user-modal.service";
import { NotificationService } from "@app/core/services/notification.service";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import { NgbDropdownModule } from "@ng-bootstrap/ng-bootstrap";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FormsModule } from "@angular/forms";
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexResponsive,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from "ng-apexcharts";
import moment from "moment";
import * as d3 from "d3";
import { ColDef, GridApi, GridReadyEvent, RowDragEndEvent } from 'ag-grid-community';
import { firstValueFrom } from 'rxjs';
import { OpenPositionModalComponent, OpenPositionModalResult } from '../open-position-modal/open-position-modal.component';
import { OpenPositionsListModalComponent, OpenPositionsListModalResult } from '../open-positions-list-modal/open-positions-list-modal.component';

type OrgDecisionChartOptions = {
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart: ApexChart;
  dataLabels?: ApexDataLabels;
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis;
  tooltip?: ApexTooltip;
  plotOptions?: ApexPlotOptions;
  labels?: string[];
  legend?: ApexLegend;
  stroke?: ApexStroke;
  grid?: ApexGrid;
  responsive?: ApexResponsive[];
  colors?: string[];
};

@Component({
  standalone: true,
  imports: [SharedModule, OrgChartModule, UserSearchV1Component, NgbDropdownModule, FormsModule, AgGridModule, NgApexchartsModule],
  selector: "app-org-chart-view",
  templateUrl: "./org-chart-view.component.html",
  styleUrls: [],
  styles: [`
    :host {
      --org-metric-pill-bg: rgba(255, 255, 255, 0.08);
      --org-metric-pill-border: rgba(255, 255, 255, 0.12);
      --org-metric-pill-text: var(--vz-body-color, #212529);
      --org-analytics-panel-border: rgba(255, 255, 255, 0.12);
      --org-analytics-panel-bg: linear-gradient(180deg, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0.04));
      --org-analytics-card-border: rgba(255, 255, 255, 0.14);
      --org-analytics-card-bg: rgba(15, 23, 42, 0.45);
      --org-analytics-title-color: #dbe7ff;
    }

    .dropdown-menu {
      min-width: 300px;
      max-height: 400px;
      overflow-y: auto;
      z-index: 1050;
    }
    
    .dropdown-item {
      padding: 0.5rem 1rem;
      border-bottom: 1px solid #f8f9fa;
    }
    
    .dropdown-item:last-child {
      border-bottom: none;
    }
    
    .dropdown-item:hover {
      background-color: #f8f9fa;
    }
    
    .dropdown-header {
      font-size: 0.875rem;
      font-weight: 600;
      color: #6c757d;
      background-color: #e9ecef;
    }
    
    .fw-semibold {
      font-weight: 600;
    }

    .org-metric-pill {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 0.5rem 0.9rem;
      border: 1px solid var(--org-metric-pill-border);
      background: var(--org-metric-pill-bg);
      color: var(--org-metric-pill-text);
      font-weight: 500;
      line-height: 1;
      backdrop-filter: blur(8px);
    }

    .org-metric-action {
      border: 1px solid rgba(255, 193, 7, 0.35);
      background: linear-gradient(180deg, rgba(255, 193, 7, 0.16), rgba(255, 193, 7, 0.08));
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .org-metric-action:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(255, 193, 7, 0.18);
    }

    .org-metric-pill i {
      opacity: 0.95;
    }

    .org-page-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }

    .org-metric-strip {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-left: auto;
    }

    .org-analytics-panel {
      border-bottom: 1px solid var(--org-analytics-panel-border);
      background: var(--org-analytics-panel-bg);
      padding: 0.75rem;
      flex-shrink: 0;
    }

    .org-table-scroll-shell {
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    .org-analytics-card {
      border: 1px solid var(--org-analytics-card-border);
      border-radius: 0.75rem;
      background: var(--org-analytics-card-bg);
      height: 100%;
    }

    .org-analytics-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--org-analytics-title-color);
      letter-spacing: 0.02em;
      margin: 0;
      padding: 0.6rem 0.75rem 0 0.75rem;
    }

    .org-analytics-chart {
      padding: 0.2rem 0.4rem 0.1rem 0.4rem;
    }

    [data-bs-theme='light'] :host,
    :host-context([data-bs-theme='light']) {
      --org-metric-pill-bg: #f8fafc;
      --org-metric-pill-border: #dbe3ee;
      --org-metric-pill-text: #1f2937;
      --org-analytics-panel-border: rgba(15, 23, 42, 0.08);
      --org-analytics-panel-bg: linear-gradient(180deg, rgba(13, 110, 253, 0.04), rgba(13, 110, 253, 0.01));
      --org-analytics-card-border: rgba(15, 23, 42, 0.08);
      --org-analytics-card-bg: rgba(255, 255, 255, 0.92);
      --org-analytics-title-color: #495057;
    }

    [data-bs-theme='dark'] :host,
    :host-context([data-bs-theme='dark']) {
      --org-metric-pill-bg: rgba(255, 255, 255, 0.08);
      --org-metric-pill-border: rgba(255, 255, 255, 0.14);
      --org-metric-pill-text: #e5edf7;
      --org-analytics-panel-border: rgba(255, 255, 255, 0.12);
      --org-analytics-panel-bg: linear-gradient(180deg, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0.04));
      --org-analytics-card-border: rgba(255, 255, 255, 0.14);
      --org-analytics-card-bg: rgba(15, 23, 42, 0.45);
      --org-analytics-title-color: #dbe7ff;
    }

    /* Drag and Drop Styles */
    :host ::ng-deep .node.drop-target .node-rect {
      stroke: #4CAF50 !important;
      stroke-width: 2 !important;
      stroke-dasharray: 5,5 !important;
      animation: dash 0.5s linear infinite;
    }

    :host ::ng-deep .node.drop-target-hover .node-rect {
      stroke: #2196F3 !important;
      stroke-width: 4 !important;
      stroke-dasharray: none !important;
      filter: drop-shadow(0 0 10px rgba(33, 150, 243, 0.6));
    }

    @keyframes dash {
      to {
        stroke-dashoffset: -10;
      }
    }

  `]
})
export class OrgChartViewComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly orgMetrics = {
    totalEmployees: 0,
    activeEmployees: 0,
    departmentCount: 0,
    openPositions: 0,
    averageSpanOfControl: 0,
  };
  readonly statusFilterOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'all', label: 'All' },
  ] as const;
  readonly tableHierarchyOptions = [
    { value: 'reporting', label: 'Reports To' },
    { value: 'department', label: 'Department Group' },
  ] as const;

  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    private userService: UserService,
    private userModalService: UserModalService,
    private modalService: NgbModal,
    private departmentService: DepartmentService,
    private departmentModalService: DepartmentModalService,
    private notificationService: NotificationService,
    @Inject(OrgChartUserModalService) private orgChartUserModalService: OrgChartUserModalService,
  ) {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.query = params["username"];
      this.userId = params["userId"];
      this.user_edit = params["user_edit"];
    });
  }

  openUserProfileModal(id: number, mode: OrgChartUserModalMode = 'view'): void {
    if (!id || id < 0) {
      return;
    }

    const modalRef: any = this.orgChartUserModalService.open({
      id,
      mode,
      title: mode === 'edit' ? 'Edit User' : 'User Profile',
    });

    modalRef.componentInstance.imageUpdated.subscribe((event: { userId: string; imageUrl: string }) => {
      this.handleImageUpdate(event.userId, event.imageUrl);
    });

    modalRef.result.then(
      (data: any) => {
        if (!data) {
          return;
        }

        this.originalData = this.originalData?.map((entry) => entry.id === id ? { ...entry, ...data } : entry);
        void this.getDataWithStatePreservation();
      },
      () => {}
    );
  }

  userId;
  user_edit;

  @ViewChild("chartContainer") chartContainer: ElementRef;
  @Input() data: any[];
  @Input() readOnly: boolean = false; // New input to control read-only mode
  @Input() showSearch: boolean = true;
  @Input() set isHorizontalLayout(value: boolean) {
    this._isHorizontalLayout = value;
    if (this.chart && this.data && this.data.length > 0) {
      this.updateChartLayout();
    }
  }
  get isHorizontalLayout(): boolean {
    return this._isHorizontalLayout;
  }
  private _isHorizontalLayout = false;
  
  chart: any; // Add proper typing for the chart
  viewMode: 'table' | 'chart' = 'table';
  showAnalyticsPanel = false;
  readonly analyticsAllLocationsValue = '__all_locations__';
  analyticsLocationOptions: string[] = [];
  selectedAnalyticsLocation = this.analyticsAllLocationsValue;
  syncAnalyticsFilterToTable = true;
  statusFilter: 'active' | 'inactive' | 'all' = 'active';
  tableHierarchyMode: 'reporting' | 'department' = 'reporting';
  headcountByDepartmentChart: Partial<OrgDecisionChartOptions> = {};
  openPositionsByDepartmentChart: Partial<OrgDecisionChartOptions> = {};
  spanOfControlChart: Partial<OrgDecisionChartOptions> = {};
  locationDistributionChart: Partial<OrgDecisionChartOptions> = {};
  readonly quickEditEmploymentTypeOptions = ['FT', 'PT', 'CT'];
  readonly quickEditActiveStatusOptions = [1, 0];
  readonly quickEditActiveStatusLabels: Record<number, string> = {
    1: 'Active',
    0: 'Inactive',
  };
  readonly quickEditLocationOptions = ['Las Vegas, NV', 'Seattle, WA', 'Tijuana, Mexico'];
  readonly rootManagerOptionValue = '__no_manager__';
  readonly unassignedDepartmentOptionValue = '__unassigned_department__';
  tableRowData: any[] = [];
  private tableGridApi: GridApi | null = null;
  excludeChildrenWhenTreeDataFiltering = false;
  private suppressTableCellValueChanged = false;
  private readonly pendingDepartmentAssignments = new Set<string>();
  private readonly recentDepartmentAssignments = new Map<string, number>();
  private readonly enableOrgChartNodeDragDrop = false;
  readonly tableRowHeight = 45;
  readonly tableDefaultColDef: ColDef = {
    sortable: true,
    filter: true,
    floatingFilter: true,
    resizable: true,
    flex: 1,
    minWidth: 140,
  };
  readonly tableAutoGroupColumnDef: ColDef = {
    headerName: 'Reports To Hierarchy',
    minWidth: 320,
    pinned: 'left',
    rowDrag: (params: any) => !!params.data && !this.readOnly,
    cellRendererParams: {
      suppressCount: true,
      innerRenderer: (params: any) => {
        const imageUrl = String(params.data?.imageUrl || 'assets/images/default-user.png');
        const title = params.data?.title ? `<div class="text-muted small">${params.data.title}</div>` : '';
        const name = params.data?.employee_name || this.getHierarchyDisplayName(params.value);
        const openAction = params.data?.is_placeholder
          ? name
          : `<button type="button" data-user-open="${params.data?.id}" style="appearance:none;background:none;border:0;padding:0;margin:0;color:#0d6efd;font-weight:600;text-decoration:underline;line-height:1.2;display:block;text-align:left;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;width:100%;">${name}</button>`;
        const avatarMarkup = params.data?.is_placeholder
          ? `<div style="width:32px;height:32px;min-width:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;"><i class="mdi mdi-domain"></i></div>`
          : `<img src="${imageUrl}" alt="${name}" style="width:32px;height:32px;min-width:32px;display:block;border-radius:50%;object-fit:cover;border:1px solid #e5e7eb;background:#fff;" onerror="this.src='assets/images/default-user.png'" />`;
        return `
          <div class="d-flex align-items-center gap-2" style="min-height:40px;overflow:hidden;min-width:0;">
            ${avatarMarkup}
            <div style="line-height:1.2;overflow:hidden;display:flex;flex-direction:column;justify-content:center;min-width:0;flex:1;">
              <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${openAction}</div>
              ${title ? `<div class="text-muted small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${params.data.title}</div>` : ''}
            </div>
          </div>
        `;
      }
      },
    onCellClicked: (params: any) => {
      const target = params.event?.target as HTMLElement | null;
      const button = target?.closest('[data-user-open]') as HTMLElement | null;
      if (!button) {
        return;
      }

      const userId = Number(button.getAttribute('data-user-open'));
      if (!userId) {
        return;
      }

      this.openUserProfileModal(userId, this.readOnly ? 'view' : 'edit');
    }
  };
  readonly tableColumnDefs: ColDef[] = [
    { field: 'id', headerName: 'User ID', minWidth: 110, maxWidth: 130 },
    {
      field: 'title',
      headerName: 'Title',
      minWidth: 220,
      hide: false,
      editable: (params: any) => this.isQuickEditableRow(params),
      cellEditor: 'agTextCellEditor',
    },
    {
      field: 'active',
      headerName: 'Active Status',
      minWidth: 150,
      editable: (params: any) => !this.readOnly && !!params?.data,
      cellEditor: 'agRichSelectCellEditor',
      cellEditorParams: {
        values: this.quickEditActiveStatusOptions,
        formatValue: (value: number) => this.quickEditActiveStatusLabels[Number(value)] || 'Inactive',
      },
      cellRenderer: (params: any) => {
        const isActive = Number(params.value ?? params.data?.active ?? 0) === 1;
        const color = isActive ? '#198754' : '#dc3545';
        const background = isActive ? 'rgba(25, 135, 84, 0.12)' : 'rgba(220, 53, 69, 0.12)';
        const label = isActive ? 'Active' : 'Inactive';

        return `
          <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:${background};color:${color};font-weight:600;line-height:1;">
            <span style="width:8px;height:8px;border-radius:999px;background:${color};display:inline-block;"></span>
            ${label}
          </span>
        `;
      }
    },
    {
      field: 'employeeType1',
      headerName: 'Employment Type',
      minWidth: 170,
      editable: (params: any) => this.isQuickEditableRow(params),
      cellEditor: 'agRichSelectCellEditor',
      cellEditorParams: {
        values: this.quickEditEmploymentTypeOptions,
        searchType: 'matchAny',
      },
      valueFormatter: (params: any) => this.getEmploymentTypeLabel(params.value),
    },
    {
      field: 'location',
      headerName: 'Location',
      minWidth: 180,
      filter: 'agTextColumnFilter',
      editable: (params: any) => this.isQuickEditableRow(params),
      cellEditor: 'agRichSelectCellEditor',
      cellEditorParams: {
        values: this.quickEditLocationOptions,
      },
    },
    {
      field: 'department',
      headerName: 'Department Group',
      minWidth: 200,
      editable: (params: any) => this.isQuickEditableRow(params),
      cellEditor: 'agRichSelectCellEditor',
      cellEditorParams: {
        values: () => (this.departments || [])
          .map((department) => String(department.department_name || '').trim())
          .filter((name) => !!name),
        searchType: 'matchAny',
      },
    },
    {
      field: 'manager_id',
      headerName: 'Reports To',
      minWidth: 220,
      editable: (params: any) => this.isQuickEditableRow(params),
      cellEditor: 'agRichSelectCellEditor',
      cellEditorParams: (params: any) => ({
        values: this.getManagerSelectOptions(params?.data),
        searchType: 'matchAny',
        formatValue: (value: string | number) => this.getManagerOptionLabel(value),
      }),
      valueFormatter: (params: any) => this.getManagerOptionLabel(params.value),
    },
    {
      field: 'direct_report_count',
      headerName: 'Direct Reports',
      minWidth: 140,
      maxWidth: 170,
      type: 'numericColumn',
      cellStyle: {
        justifyContent: 'flex-end',
        textAlign: 'right',
      },
      valueFormatter: (params: any) => String(Number(params.value ?? 0)),
    },
    {
      field: 'total_team_size',
      headerName: 'Total Team Size',
      minWidth: 150,
      maxWidth: 180,
      type: 'numericColumn',
      cellStyle: {
        justifyContent: 'flex-end',
        textAlign: 'right',
      },
      valueFormatter: (params: any) => String(Number(params.value ?? 0)),
    },
    {
      field: 'hire_date',
      headerName: 'Hire Date',
      minWidth: 150,
      editable: (params: any) => this.isQuickEditableRow(params),
      cellEditor: 'agDateStringCellEditor',
      valueFormatter: (params: any) => params.value ? moment(params.value).format('MM/DD/YYYY') : 'Not Set'
    },
    {
      field: 'years_of_service_value',
      headerName: 'Years of Service',
      minWidth: 170,
      maxWidth: 210,
      type: 'numericColumn',
      cellStyle: {
        justifyContent: 'flex-end',
        textAlign: 'right',
      },
      valueFormatter: (params: any) => Number.isFinite(Number(params.value))
        ? `${Number(params.value).toFixed(1)} yrs`
        : '—',
    },
    {
      field: 'next_anniversary_date',
      headerName: 'Next Anniversary',
      minWidth: 210,
      comparator: (left: any, right: any) => {
        const leftTime = left ? moment(left).valueOf() : Number.POSITIVE_INFINITY;
        const rightTime = right ? moment(right).valueOf() : Number.POSITIVE_INFINITY;
        return leftTime - rightTime;
      },
      cellRenderer: (params: any) => {
        if (!params.value) {
          return '—';
        }

        const dateLabel = moment(params.value).format('MM/DD/YYYY');
        const daysUntil = Number(params.data?.next_anniversary_days);
        const isUpcoming = !!params.data?.next_anniversary_upcoming;

        if (!isUpcoming || !Number.isFinite(daysUntil)) {
          return dateLabel;
        }

        return `
          <div class="d-inline-flex align-items-center gap-2">
            <span>${dateLabel}</span>
            <span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:rgba(13, 202, 240, 0.14);color:#0c5460;font-size:11px;font-weight:600;">${daysUntil}d</span>
          </div>
        `;
      },
    },
    {
      field: 'hire_status',
      headerName: 'Status',
      minWidth: 170,
      cellRenderer: (params: any) => {
        const color = params.data?.hire_date_color || 'gray';
        return `
          <div class="d-inline-flex align-items-center gap-2">
            <span style="width:10px;height:10px;border-radius:999px;background:${color};display:inline-block;"></span>
            <span>${params.value || 'Unknown'}</span>
          </div>
        `;
      }
    }
  ];
  readonly tableTreeData = true;
  readonly tableGroupDefaultExpanded = -1;
  readonly tableGroupDisplayType = 'singleColumn';

  private isQuickEditableRow(params: any): boolean {
    return !this.readOnly && !!params?.data && !params.data?.is_placeholder;
  }

  setStatusFilter(filter: 'active' | 'inactive' | 'all'): void {
    if (this.statusFilter === filter) {
      return;
    }

    this.statusFilter = filter;
    void this.getDataWithStatePreservation();
  }

  setTableHierarchyMode(mode: 'reporting' | 'department'): void {
    if (this.tableHierarchyMode === mode) {
      return;
    }

    this.tableHierarchyMode = mode;
    this.tableAutoGroupColumnDef.headerName = mode === 'department' ? 'Department Hierarchy' : 'Reports To Hierarchy';
    this.buildTableRows(this.originalData || []);
  }

  private buildOrgChartFilters(): { isEmployee: number; active?: number } {
    const filters: { isEmployee: number; active?: number } = {
      isEmployee: 1,
    };

    if (this.statusFilter !== 'all') {
      filters.active = this.statusFilter === 'active' ? 1 : 0;
    }

    return filters;
  }
  
  // Layout toggle properties
  layoutIcon = 'mdi-view-sequential'; // Default icon for vertical layout

  // Department management properties
  departments: Department[] = [];
  currentDepartment: Department | null = null;

  /**
   * Deep clone array of objects, excluding functions and circular references
   * Only copies plain data properties needed for org chart
   */
  private deepCloneData(data: any[]): any[] {
    if (!data || !Array.isArray(data)) return [];
    
    return data.map(item => {
      if (!item || typeof item !== 'object') return item;
      
      const cloned: any = {};
      for (const key in item) {
        if (item.hasOwnProperty(key)) {
          const value = item[key];
          // Skip functions, circular references, and complex objects
          if (typeof value === 'function' || 
              value === null || 
              value === undefined ||
              key.startsWith('_') && (key === '_component' || key === '_readOnly')) {
            continue;
          }
          // Only copy primitive values and simple data
          if (typeof value === 'string' || 
              typeof value === 'number' || 
              typeof value === 'boolean') {
            cloned[key] = value;
          } else if (Array.isArray(value)) {
            cloned[key] = [...value];
          } else if (typeof value === 'object' && value.constructor === Object) {
            // Simple object, copy properties
            cloned[key] = { ...value };
          }
        }
      }
      return cloned;
    });
  }

  clearMark() {
    if (this.chart && this.chart.clearHighlighting) {
      this.chart.clearHighlighting();
    }
    this.currentView = null;
    this.router.navigate([`.`], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
      queryParams: {
        user_edit: null,
      },
    });
  }

  setViewMode(mode: 'table' | 'chart'): void {
    this.viewMode = mode;

    if (mode === 'chart' && this.chart) {
      setTimeout(() => {
        try {
          this.chart.render().fit();
        } catch (error) {
          console.error('Error fitting org chart after toggling chart view:', error);
        }
      }, 0);
    }
  }

  toggleLayout() {
    this.isHorizontalLayout = !this.isHorizontalLayout;
    this.layoutIcon = this.isHorizontalLayout ? 'mdi-view-parallel' : 'mdi-view-sequential';
    
    if (this.chart) {
      // Update the chart layout and re-render
      this.updateChartLayout();
    }
  }

  updateChartLayout(): void {
    if (!this.chart) return;

    // Force update nodeContent to ensure it's using our custom function
    this.chart.nodeContent(this.getNodeContent.bind(this));

    if (this.isHorizontalLayout) {
      // Horizontal layout - using 'left'
      this.chart.layout('left').render().fit();
    } else {
      // Vertical layout - using 'top'
      this.chart.layout('top').render().fit();
    }
  }

  private getOrgChartPalette(): {
    rootCardBg: string;
    rootCardText: string;
    rootCardSubtitleText: string;
    rootCardShadow: string;
    employeeCardBg: string;
    employeeCardBorder: string;
    employeeCardShadow: string;
    employeeCardHoverShadow: string;
    employeeBadgeBg: string;
    employeeBadgeText: string;
    employeeNameText: string;
    employeeTitleText: string;
    employeeChipBg: string;
    employeeChipText: string;
    metricDirectBg: string;
    metricDirectText: string;
    metricTotalBg: string;
    metricTotalText: string;
    departmentCardBg: string;
    departmentCardShadow: string;
    departmentIdBadgeBg: string;
    departmentIdBadgeText: string;
    departmentTitleText: string;
    departmentSubtitleText: string;
    departmentTotalPillBg: string;
    departmentTotalPillText: string;
    openCardBg: string;
    openCardShadow: string;
    openIdBadgeBg: string;
    openIdBadgeText: string;
    openAvatarBg: string;
    openNameText: string;
    openSubtitleText: string;
  } {
    if (this.isDarkThemeEnabled()) {
      return {
        rootCardBg: 'linear-gradient(135deg, #1f2937 0%, #334155 100%)',
        rootCardText: '#e5e7eb',
        rootCardSubtitleText: '#cbd5e1',
        rootCardShadow: 'none',
        employeeCardBg: '#111827',
        employeeCardBorder: '1px solid rgba(148, 163, 184, 0.28)',
        employeeCardShadow: 'none',
        employeeCardHoverShadow: 'none',
        employeeBadgeBg: 'rgba(148, 163, 184, 0.18)',
        employeeBadgeText: '#cbd5e1',
        employeeNameText: '#e2e8f0',
        employeeTitleText: '#94a3b8',
        employeeChipBg: 'rgba(30, 41, 59, 0.92)',
        employeeChipText: '#cbd5e1',
        metricDirectBg: 'rgba(79, 70, 229, 0.22)',
        metricDirectText: '#c7d2fe',
        metricTotalBg: 'rgba(13, 148, 136, 0.2)',
        metricTotalText: '#99f6e4',
        departmentCardBg: 'linear-gradient(135deg, #1e3a5f 0%, #1d4f74 100%)',
        departmentCardShadow: 'none',
        departmentIdBadgeBg: 'rgba(148, 163, 184, 0.2)',
        departmentIdBadgeText: '#bfdbfe',
        departmentTitleText: '#e0f2fe',
        departmentSubtitleText: '#bae6fd',
        departmentTotalPillBg: 'rgba(15, 23, 42, 0.52)',
        departmentTotalPillText: '#dbeafe',
        openCardBg: 'linear-gradient(135deg, #1e3a5f 0%, #1d4f74 100%)',
        openCardShadow: 'none',
        openIdBadgeBg: 'rgba(148, 163, 184, 0.2)',
        openIdBadgeText: '#bfdbfe',
        openAvatarBg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        openNameText: '#e0f2fe',
        openSubtitleText: '#bae6fd',
      };
    }

    return {
      rootCardBg: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
      rootCardText: '#1f2937',
      rootCardSubtitleText: '#475569',
      rootCardShadow: 'none',
      employeeCardBg: '#ffffff',
      employeeCardBorder: '1px solid rgba(15, 23, 42, 0.08)',
      employeeCardShadow: 'none',
      employeeCardHoverShadow: 'none',
      employeeBadgeBg: '#f5f5f5',
      employeeBadgeText: '#999999',
      employeeNameText: '#2c3e50',
      employeeTitleText: '#7f8c8d',
      employeeChipBg: '#f1f5f9',
      employeeChipText: '#334155',
      metricDirectBg: '#eef2ff',
      metricDirectText: '#4338ca',
      metricTotalBg: '#ecfeff',
      metricTotalText: '#0f766e',
      departmentCardBg: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
      departmentCardShadow: 'none',
      departmentIdBadgeBg: 'rgba(255,255,255,0.8)',
      departmentIdBadgeText: 'rgba(33,150,243,0.6)',
      departmentTitleText: '#1565C0',
      departmentSubtitleText: '#1976D2',
      departmentTotalPillBg: 'rgba(255,255,255,0.85)',
      departmentTotalPillText: '#1565C0',
      openCardBg: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
      openCardShadow: 'none',
      openIdBadgeBg: 'rgba(255,255,255,0.8)',
      openIdBadgeText: 'rgba(33,150,243,0.6)',
      openAvatarBg: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
      openNameText: '#1565C0',
      openSubtitleText: '#1976D2',
    };
  }

  getNodeContent(d, i, arr, state) {
    const palette = this.getOrgChartPalette();
    const imageDiffVert = 25 + 2;
    const totalTeamSize = Number(d.data.total_team_size ?? 0);
    
    // Handle virtual root node
    if (d.data.id === -1) {
      return `
        <div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
          <div style="font-family: 'Inter', sans-serif;background:${palette.rootCardBg};margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:12px;border: none;box-shadow:${palette.rootCardShadow};display:flex;align-items:center;justify-content:center;">
            <div style="color:${palette.rootCardText};text-align:center;">
              <div style="font-size:15px;font-weight:bold;letter-spacing:0.5px;">${d.data.name || d.data.first}</div>
              <div style="font-size:10px;color:${palette.rootCardSubtitleText};margin-top:2px;">Organization Structure</div>
            </div>
          </div>
        </div>
      `;
    }

    // Handle "Unassigned" section node
    if (d.data.id === -2) {
      return `
        <div style="width:${d.width}px;height:${d.height}px;background:linear-gradient(135deg, #FFD26F 0%, #FF9800 100%);border:none;border-radius:12px;position:relative;box-shadow:0 4px 12px rgba(255, 152, 0, 0.3);text-align:center;padding:8px 6px 30px 6px;">
          <div style="position:absolute;top:5px;right:8px;font-size:8px;color:rgba(0,0,0,0.4);background:rgba(255,255,255,0.3);padding:2px 6px;border-radius:10px;font-weight:600;">#${d.data.id}</div>
          <div style="margin-top:6px;">
            <div style="width:45px;height:45px;border-radius:50%;border:none;display:block;margin:0 auto;background:rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
              <span style="font-size:22px;">⚠️</span>
            </div>
          </div>
          <div style="font-size:11px;font-weight:bold;color:#fff;margin-top:6px;line-height:1.2;padding:0 4px;text-shadow:0 1px 2px rgba(0,0,0,0.2);">
            ${d.data.name || d.data.first}
          </div>
          <div style="font-size:9px;color:rgba(255,255,255,0.9);margin-top:2px;line-height:1.1;padding:0 4px;">
            ${d.data.title || ""}
          </div>
        </div>
      `;
    }

    // Determine if this is a department placeholder or regular user
    const isDepartment = d.data.orgChartPlaceHolder === 1;
    const isOpenPosition = !isDepartment && d.data.openPosition === 1;
    
    // PROFESSIONAL MODERN CARDS
    if (isDepartment) {
      return `
        <div style="width:${d.width}px;height:${d.height}px;background:${palette.departmentCardBg};border:none;border-radius:12px;position:relative;text-align:center;padding:20px 10px 30px 10px;box-shadow:${palette.departmentCardShadow};transition:all 0.3s ease;display:flex;flex-direction:column;justify-content:center;">
          <div style="position:absolute;top:5px;right:8px;font-size:8px;color:${palette.departmentIdBadgeText};background:${palette.departmentIdBadgeBg};padding:2px 6px;border-radius:10px;font-weight:600;">#${d.data.id}</div>
          <div style="font-size:13px;font-weight:700;color:${palette.departmentTitleText};line-height:1.3;padding:0 6px;letter-spacing:0.4px;text-align:center;">
            ${d.data.department || d.data.first}
          </div>
          <div style="font-size:10px;color:${palette.departmentSubtitleText};margin-top:6px;line-height:1.1;padding:0 6px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
            Department
          </div>
          <div style="margin-top:8px;display:flex;justify-content:center;gap:6px;flex-wrap:wrap;">
            <span style="display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;background:${palette.departmentTotalPillBg};color:${palette.departmentTotalPillText};font-size:8px;font-weight:700;letter-spacing:0.2px;">
              ${totalTeamSize} total
            </span>
          </div>
        </div>
      `;
    }
    
    // Open position card (no photo)
    if (isOpenPosition) {
      return `
        <div style="width:${d.width}px;height:${d.height}px;background:${palette.openCardBg};border:none;border-radius:12px;position:relative;text-align:center;padding:8px 6px 30px 6px;box-shadow:${palette.openCardShadow};transition:all 0.3s ease;">
          <div style="position:absolute;top:5px;right:8px;font-size:8px;color:${palette.openIdBadgeText};background:${palette.openIdBadgeBg};padding:2px 6px;border-radius:10px;font-weight:600;">#${d.data.id}</div>
          <div style="margin-top:6px;">
            <div style="width:45px;height:45px;border-radius:50%;border:none;display:block;margin:0 auto;background:${palette.openAvatarBg};display:flex;align-items:center;justify-content:center;box-shadow:none;">
              <i class="mdi mdi-account-plus" style="font-size:24px;color:#fff;"></i>
            </div>
          </div>
          <div style="font-size:11px;font-weight:700;color:${palette.openNameText};margin-top:6px;line-height:1.2;padding:0 4px;letter-spacing:0.2px;">
            ${d.data.first} ${d.data.last}
          </div>
          <div style="font-size:9px;color:${palette.openSubtitleText};margin-top:3px;line-height:1.1;padding:0 4px;font-weight:600;">
            OPEN POSITION
          </div>
        </div>
      `;
    }
    
    // Regular employee card
    return `
      <div style="width:${d.width}px;height:${d.height}px;background:${palette.employeeCardBg};border:${palette.employeeCardBorder};border-radius:12px;position:relative;text-align:center;padding:8px 6px 30px 6px;box-shadow:${palette.employeeCardShadow};transition:all 0.3s ease;cursor:pointer;" 
           onmouseover="this.style.boxShadow='${palette.employeeCardHoverShadow}';this.style.transform='translateY(-2px)';" 
           onmouseout="this.style.boxShadow='${palette.employeeCardShadow}';this.style.transform='translateY(0)';">
        <div style="position:absolute;top:5px;right:8px;font-size:8px;color:${palette.employeeBadgeText};background:${palette.employeeBadgeBg};padding:2px 6px;border-radius:10px;font-weight:600;">#${d.data.id}</div>
        <div style="margin-top:6px;">
          <img src="${d.data.imageUrl}" 
               style="width:45px;height:45px;border-radius:50%;border:3px solid #f0f0f0;display:block;margin:0 auto;object-fit:cover;box-shadow:none;" 
               onerror="this.src='assets/images/default-user.png'" />
        </div>
        <div style="font-size:11px;font-weight:700;color:${palette.employeeNameText};margin-top:6px;line-height:1.2;padding:0 4px;letter-spacing:0.2px;">
          ${d.data.first} ${d.data.last}
        </div>
        <div style="font-size:9px;color:${palette.employeeTitleText};margin-top:3px;line-height:1.1;padding:0 4px;font-weight:500;">
          ${d.data.title || "Employee"}
        </div>

      </div>
    `;
  }

  ngAfterViewInit() {
    this.chart = new OrgChart();
  }

  expandImmediate() {
    if (!this.chart) {
      console.warn('Chart not initialized yet');
      return;
    }
    
    const data = this.chart.data();
    if (!data || !Array.isArray(data)) {
      console.warn('Chart data not available');
      return;
    }

    // Mark all previously expanded nodes for collapse
    data.forEach((d) => (d._expanded = false));
    
    // Loop over data and check if input value matches any name
    data.forEach((d) => {
      if (d.org_chart_expand === 1) {
        d._expanded = true;
        this.chart.setExpanded(d.id, true).render();
      }
    });
  }

  addNode() {
    const modalRef: any = this.userModalService.open(null);
    modalRef.result.then(
      (data: any) => {
        const newNodeData = {
          ...data,
          name: data.first + " " + data.last || "",
          imageUrl: data.image || "assets/images/default-user.png",
          bgColor: this.bgColor(data),
        };

        // Add to original data
        this.originalData.push(newNodeData);
        
        // Add to chart and render
        this.chart.addNode(newNodeData).setCentered(newNodeData.id).render();
      },
      () => { }
    );
  }

  async openOpenPositionModal(): Promise<void> {
    if (this.readOnly) {
      return;
    }

    const modalRef: any = this.modalService.open(OpenPositionsListModalComponent, {
      size: 'lg',
      backdrop: 'static',
    });

    modalRef.result.then(
      async (result: OpenPositionsListModalResult | undefined) => {
        if (!result) {
          return;
        }

        if (result.action === 'create') {
          await this.openOpenPositionModalWithMode('create');
          return;
        }

        if (result.action === 'manage' && result.position) {
          await this.openOpenPositionManageModal(result.position);
        }
      },
      () => {},
    );
  }

  private async openOpenPositionManageModal(positionNode: any): Promise<void> {
    const positionId = this.resolveOpenPositionId(positionNode);
    if (this.readOnly || positionId == null) {
      return;
    }

    await this.openOpenPositionModalWithMode('manage', {
      ...positionNode,
      openPositionId: positionId,
    });
  }

  private async openOpenPositionModalWithMode(mode: 'create' | 'manage', positionNode?: any): Promise<void> {
    const fillUsers = mode === 'manage'
      ? (await this.userService.getList(1))
          .filter((entry) => Number(entry?.id) > 0)
          .map((entry) => ({
            id: Number(entry.id),
            label: `${entry.first || ''} ${entry.last || ''}`.trim() || `Employee ${entry.id}`,
          }))
      : [];

    const modalRef: any = this.modalService.open(OpenPositionModalComponent, {
      size: 'md',
      backdrop: 'static',
    });

    modalRef.componentInstance.mode = mode;
    modalRef.componentInstance.positionId = this.resolveOpenPositionId(positionNode);
    modalRef.componentInstance.managerOptions = (this.originalData || [])
      .filter((entry) => !entry?.orgChartPlaceHolder && !entry?.openPosition)
      .map((entry) => ({
        id: Number(entry.id),
        label: `${entry.first || ''} ${entry.last || ''}`.trim() || `Employee ${entry.id}`,
      }))
      .filter((entry) => Number.isFinite(entry.id) && entry.id > 0);

    modalRef.componentInstance.departmentOptions = (this.departments || [])
      .map((department) => String(department.department_name || '').trim())
      .filter((name) => !!name);

    modalRef.componentInstance.locationOptions = [...this.quickEditLocationOptions];
    modalRef.componentInstance.fillUserOptions = fillUsers;

    if (positionNode) {
      modalRef.componentInstance.initialValue = {
        title: positionNode.title || positionNode.first || '',
        managerId: this.normalizeTableParentId(positionNode.parentId ?? positionNode.reports_to_user_id),
        department: positionNode.department || null,
        location: [positionNode.city, positionNode.state].filter(Boolean).join(', ') || null,
      };
    }

    modalRef.result.then(
      async (result: OpenPositionModalResult | undefined) => {
        if (!result) {
          return;
        }

        try {
          const locationParts = this.getLocationParts(result.location || null);

          if (result.action === 'create') {
            if (!result.title) {
              this.notificationService.error('Position title is required.', false);
              return;
            }
            await this.userService.createOpenPosition({
              title: result.title,
              reportsToUserId: result.managerId,
              department: result.department,
              city: locationParts.city,
              state: locationParts.state,
            });
            this.notificationService.success('Open position created successfully.');
          } else if (result.action === 'fill' && positionNode?.openPositionId) {
            await this.userService.fillOpenPosition(Number(positionNode.openPositionId), {
              filledByUserId: result.filledByUserId ?? null,
            });
            this.notificationService.success('Open position filled successfully.');
          } else if (result.action === 'close' && positionNode?.openPositionId) {
            await this.userService.closeOpenPosition(Number(positionNode.openPositionId));
            this.notificationService.success('Open position closed successfully.');
          } else if (positionNode?.openPositionId) {
            if (!result.title) {
              this.notificationService.error('Position title is required.', false);
              return;
            }
            await this.userService.updateOpenPosition(Number(positionNode.openPositionId), {
              title: result.title,
              reportsToUserId: result.managerId,
              department: result.department,
              city: locationParts.city,
              state: locationParts.state,
            });
            this.notificationService.success('Open position updated successfully.');
          }

          await this.getDataWithStatePreservation();
        } catch (error) {
          this.notificationService.error('Failed to save open position.', false);
        }
      },
      () => {},
    );
  }

  private resolveOpenPositionId(positionNode: any): number | null {
    const rawId =
      positionNode?.openPositionId ??
      positionNode?.open_position_id ??
      positionNode?.positionId ??
      positionNode?.position_id ??
      positionNode?.id;
    const parsedId = Number(rawId);
    return Number.isFinite(parsedId) ? parsedId : null;
  }

  orgChart;

  query = null;

  notifyParent($event) {
    this.query = $event?.username;

    this.router.navigate([`.`], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
      queryParams: {
        username: $event?.username,
        userId: $event?.id,
      },
    });

    this.filterChart($event?.id || null);

    if (!$event?.id) {
      this.expandImmediate();
    }
  }

  filterChart(id) {
    if (!this.chart) {
      console.warn('Chart not initialized yet');
      return;
    }

    // Get input value
    const value = id;

    // Clear previous highlighting
    this.chart.clearHighlighting();

    // Get chart nodes
    if (!value || Number(value) === 0) {
      this.chart.data(this.deepCloneData(this.originalData)).render().fit();
    } else {
      let data = this.viewOnlyTree(Number(value) === 0 ? null : Number(value));
      this.chart.data(data).render().fit();
    }
  }

  expandAllNodes() {
    if (!this.chart) {
      console.warn('Chart not initialized yet');
      return;
    }

    const data = this.chart.data();
    if (!data || !Array.isArray(data)) {
      console.warn('Chart data not available');
      return;
    }

    data.forEach((d: any) => {
      if (!d || d.id === -1) return;
      d._expanded = true;
      this.chart.setExpanded(d.id, true);
    });

    this.chart.render().fit();
  }

  defaultExpand() {
    if (!this.chart) {
      console.warn('Chart not initialized yet');
      return;
    }
    
    const data = this.chart.data();
    if (!data || !Array.isArray(data)) {
      console.warn('Chart data not available');
      return;
    }

    // Loop over data and check if input value matches any name
    data.forEach((d) => {
      if (d._directSubordinates === 1 || d.org_chart_expand === 1) {
        // If matches, mark node as highlighted
        d._expanded = true;
        this.chart.setExpanded(d.id, true).render();
      }
    });
  }
  isMoreThan6MonthsAgo = (dateString: string) => {
    if (!dateString) return "gray"; // No hire date set
    
    const inputDate = moment(dateString);
    if (!inputDate.isValid()) {
      return "gray"; // Invalid date
    }

    const now = moment();
    const oneMonthAgo = moment().subtract(1, 'months');
    const sixMonthsAgo = moment().subtract(6, 'months');
    const twelveMonthsAgo = moment().subtract(12, 'months');

    if (inputDate.isAfter(oneMonthAgo)) {
      // Less than 1 month - New Position
      return 'orange';
    } else if (inputDate.isAfter(sixMonthsAgo)) {
      // 1-6 months - Less than 6 months
      return "rgb(0, 195, 255)";
    } else if (inputDate.isAfter(twelveMonthsAgo)) {
      // 6-12 months - Less than 12 months
      return "#4B0082";
    } else {
      // More than 12 months - 12+ months
      return "#002D62";
    }
  }
  currentView;
  onNodeClick = (d) => {
    // Prevent clicking on virtual root node
    if (d.data.id === -1) {
      return;
    }

    // Prevent clicking on "Unassigned" section node
    if (d.data.id === -2) {
      return;
    }

    // If in read-only mode, only highlight the node, don't open modal
    if (this.readOnly) {
      this.chart.clearHighlighting();
      d.data._highlighted = true;
      this.currentView = d.data.id;
      
      try {
        this.chart.render();
      } catch (error) {
        console.error('Error rendering chart after node click:', error);
      }
      return;
    }

    // Don't set the user_edit query parameter to avoid triggering reopening
    // this.router.navigate([`.`], {
    //   relativeTo: this.activatedRoute,
    //   queryParamsHandling: "merge",
    //   queryParams: {
    //     user_edit: d.data.id,
    //   },
    // });

    this.chart.clearHighlighting();
    d.data._highlighted = true;
    this.currentView = d.data.id;
    
    try {
      this.chart.render();
    } catch (error) {
      console.error('Error rendering chart after node click:', error);
      if (error.message && error.message.includes('missing:')) {
        const missingId = error.message.split('missing:')[1].trim();
        console.error(`Missing node ID: ${missingId}. This usually means a user references a parent that doesn't exist in the dataset.`);
        this.notificationService.error(`Chart data integrity issue: Missing user ID ${missingId}. Please contact support.`, false);
      } else {
        this.notificationService.error('Chart rendering error. Please refresh the page.', false);
      }
    }

    if (d.data.orgChartPlaceHolder) {
      return;
    }

    if (d.data.openPosition === 1) {
      void this.openOpenPositionManageModal(d.data);
      return;
    }

    const modalMode: OrgChartUserModalMode = this.readOnly ? 'view' : 'edit';
    const modalRef: any = this.orgChartUserModalService.open({ id: d.data.id, mode: modalMode, title: modalMode === 'edit' ? 'Edit User' : 'User Profile' });
    
    // Listen for image upload success events
    modalRef.componentInstance.imageUpdated.subscribe((event: {userId: string, imageUrl: string}) => {
      console.log('Org Chart received imageUpdated event:', event);
      this.handleImageUpdate(event.userId, event.imageUrl);
    });
    
    modalRef.result.then(
      (data: any) => {
        console.log(data, 'data from modal');
        // Update node data first
        const updatedNodeData = {
          ...d.data,
          ...data,
          name: (data.first || "") + " " + (data.last || ""),
          imageUrl: data.image || "assets/images/default-user.png",
          bgColor: this.bgColor(data),
          hire_date_color: this.bgColor(data)
        };
        
        // Update the original data array
        this.originalData = this.originalData.map((e) => {
          return d.data.id == e.id ? { ...e, ...data } : e;
        });

        // Handle removal cases first
        if (data.access == 100 || data.active == 0) {
          this.chart.removeNode(d.data.id).render();
          this.currentView = null;
          return;
        }

        // Get current chart data and update it
        let chartData = this.chart.data().map((node) => {
          if (node.id == d.data.id) {
            return { ...node, ...updatedNodeData };
          }
          return node;
        });

        // Apply the updated data
        this.chart.data(chartData);
        
        // Handle position changes
        if (d.data.parentId != data.parentId) {
          this.chart.setCentered(d.data.id);
        }
        
        // Render the chart with updated data
        this.chart.render();
        
        // Re-apply highlighting to the updated node
        setTimeout(() => {
          const updatedNode = this.chart.data().find(n => n.id === d.data.id);
          if (updatedNode) {
            updatedNode._highlighted = true;
            this.chart.render();
          }
        }, 100);
      },
      () => {
        console.log('modal dismissed');
        // Modal cancelled - do nothing
      }
    );
  };

  onNodeDrop = (draggedNode, targetNode) => {
    // Prevent dropping on virtual root or unassigned nodes
    if (targetNode.data.id === -1 || targetNode.data.id === -2) {
      console.log('Cannot drop on virtual nodes');
      return false;
    }

    // Prevent dropping on self
    if (draggedNode.data.id === targetNode.data.id) {
      console.log('Cannot drop node on itself');
      return false;
    }

    // Check if target is a department placeholder or regular user
    const isDepartmentTarget = targetNode.data.type === 3 && targetNode.data.orgChartPlaceHolder === 1;
    const isUserTarget = targetNode.data.type !== 3 && !targetNode.data.orgChartPlaceHolder;

    if (!isDepartmentTarget && !isUserTarget) {
      console.log('Can only drop on departments or users');
      return false;
    }

    // Get department name based on target type
    let departmentName = '';
    let departmentId = null;

    if (isDepartmentTarget) {
      // Target is a department placeholder
      departmentName = targetNode.data.department || targetNode.data.first;
      departmentId = targetNode.data.id;
    } else if (isUserTarget) {
      // Target is a user - assign to their department
      departmentName = targetNode.data.department;
      // Find the department placeholder for this department
      const deptPlaceholder = this.originalData.find(d => 
        d.type === 3 && d.orgChartPlaceHolder === 1 && 
        d.department === departmentName
      );
      departmentId = deptPlaceholder?.id;
    }

    if (!departmentName || !departmentId) {
      console.log('Could not determine target department');
      return false;
    }

    void this.confirmAction(
      `Assign ${draggedNode.data.first} ${draggedNode.data.last} to department "${departmentName}"?`,
      'Assign Department',
    ).then((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.departmentService.assignUser({
        user_id: draggedNode.data.id,
        department_id: departmentId
      }).subscribe({
        next: (response) => {
          if (response.success) {
            const nodeIndex = this.originalData.findIndex(d => d.id === draggedNode.data.id);
            if (nodeIndex !== -1) {
              this.originalData[nodeIndex] = {
                ...this.originalData[nodeIndex],
                department: departmentName
              };
            }

            draggedNode.data.department = departmentName;
            this.chart.render();
            this.notificationService.success(`${draggedNode.data.first} ${draggedNode.data.last} assigned to ${departmentName}.`);
          } else {
            this.notificationService.error((response as any).error || 'Assignment failed', false);
          }
        },
        error: (error) => {
          console.error('Error assigning user to department:', error);
          this.notificationService.error(error, false);
        }
      });
    });

    return false;
  };

  bgColor(data) {
    if (!data) {
      return "#002D62"; // Default color for missing data
    }
    
    return this.isMoreThan6MonthsAgo(data.hire_date);
    // for (let ii = 0; ii < accessRight.length; ii++) {
    //   if (accessRight[ii].value == data.employeeType) {
    //     return accessRight[ii].bgColor;
    //   }
    // }

    // return "#3AB6E3"; // This is unreachable code but keeping for reference
  }

  locations = ["All", "Seattle", "Las Vegas"];

  getChildren = (array, idToFind) => {
    return array.reduce((r, { id, parentId }) => {
      if (parentId === idToFind) {
        r.push(id, ...this.getChildren(array, id));
      }
      return r;
    }, []);
  };

  findParent(id) {
    let ddd = this.deepCloneData(this.originalData);
    for (let i = 0; i < ddd.length; i++) {
      if (id == ddd[i].id) {
        return ddd[i];
      }
    }
  }

  viewOnlyTree(userIdSearch = null) {
    let ddd = this.deepCloneData(this.originalData);
    let allParentsAndChilds = this.getChildren(ddd, userIdSearch);

    allParentsAndChilds.push(userIdSearch);

    let data = [];
    for (let i = 0; i < ddd.length; i++) {
      if (ddd[i].parentId == null && userIdSearch != null) {
        ddd[i].parentId = -1;
      }
      if (userIdSearch == ddd[i].id) {
        if (ddd[i].orgChartPlaceHolder) {
          let parentId = this.findParent(ddd[i].parentId);
          parentId.parentId = null;
          data.push(parentId);
        } else {
          ddd[i].parentId = null;
        }
      }
    }
    this.chart.data(data).compact(false).render();

    let alot = false;
    for (let i = 0; i < ddd.length; i++) {
      if (allParentsAndChilds.includes(ddd[i]?.id)) {
        ddd[i]._expanded = true;
        if (ddd[i]._directSubordinates > 5) {
          alot = true;
        }
        data.push(ddd[i]);
      }
    }

    if (alot) this.chart.data(data).compact(true).render();

    return data;
  }

  checkHireColor(yourMoment) {
    if (!yourMoment) {
      return "gray";
    }

    let A = moment();
    let B = moment(yourMoment);
    let months = A.diff(B, "months");

    if (months > 12) {
      return "#002D62";
    } else if (months > 6) {
      return "#4B0082";
    } else if (months >= 1) {
      return "rgb(0, 195, 255)";
    } else {
      return "orange";
    }
  }

  shouldShowItem = (item: any, value = true): any => {
    // if (value) {
    //   item?.forEach((d) => {
    //     d?._children?.forEach((e) => {
    //       e.data._expanded = true;
    //       this.chart.setExpanded(e.data.id, true).render();

    //       if (e._children) {
    //         this.shouldShowItem(e._children, false);
    //       }
    //     });
    //   });
    // } else {
    //   // item.forEach((d) => {
    //   //   d.data._expanded = true;
    //   //   this.chart.setExpanded(d.data.id, true).render();
    //   //   if (d._children) {
    //   //     this.shouldShowItem(d._children, false);
    //   //   }
    //   // });
    // }
    // // Logic to display the item here based on result
  };

  async hasSubordinates(id?) {
    return await this.userService.hasSubordinates(id);
  }

  handleMultipleRoots(data: any[]): any[] {
    // Find all root nodes (nodes without parents)
    const rootNodes = data.filter(node => 
      node.parentId === null || 
      node.parentId === undefined || 
      node.parentId === 0
    );

    // If there's only one root, return data as is
    if (rootNodes.length <= 1) {
      return data;
    }

    // Create a virtual root node
    const virtualRoot = {
      id: -1,
      name: "Organization",
      title: "Root",
      parentId: null,
      bgColor: "#f8f9fa",
      imageUrl: "assets/images/organization-icon.png",
      orgChartPlaceHolder: true,
      showImage: false,
      openPosition: false,
      hire_date_color: "#6c757d",
      org_chart_expand: 1,
      first: "Organization",
      last: "",
      access: null
    };

    // Update all root nodes to point to the virtual root
    const updatedData = data.map(node => {
      if (rootNodes.some(root => root.id === node.id)) {
        return { ...node, parentId: -1 };
      }
      return node;
    });

    // Add the virtual root to the beginning of the array
    return [virtualRoot, ...updatedData];
  }

  findAndFixOrphanNodes(data: any[]): any[] {
    const nodeIds = new Set(data.map(node => node.id));
    
    return data.map(node => {
      // If parentId exists but parent node doesn't exist in data, make it a root
      if (node.parentId && !nodeIds.has(node.parentId)) {
        console.warn(`Orphan node detected: ${node.name} (ID: ${node.id}) has invalid parentId: ${node.parentId}`);
        return { ...node, parentId: null };
      }
      return node;
    });
  }

  originalData;

  private readonly hierarchyPathSeparator = '::';

  private createHierarchySegment(node: any): string {
    const employeeName = `${node?.first || ''} ${node?.last || ''}`.trim() || `Employee ${node?.id}`;
    return `${this.formatOrgChartOrder(node?.org_chart_order)}${this.hierarchyPathSeparator}${employeeName}${this.hierarchyPathSeparator}${node?.id}`;
  }

  private getHierarchyDisplayName(segment?: string): string {
    if (!segment) {
      return '';
    }

    const parts = String(segment).split(this.hierarchyPathSeparator);
    if (parts.length >= 3) {
      return parts[1] || String(segment);
    }

    return parts[0] || String(segment);
  }

  private formatOrgChartOrder(value: unknown): string {
    const numericValue = Number(value);
    const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
    return String(Math.max(0, safeValue)).padStart(6, '0');
  }

  private normalizeOrgChartData(data: any[]): any[] {
    const normalizedNodes = (data || []).map((node) => {
      const normalizedId = node?.id === null || node?.id === undefined || node?.id === '' ? node?.id : Number(node.id);
      const rawParentId = node?.parentId;
      const normalizedParentId = rawParentId === null || rawParentId === undefined || rawParentId === ''
        ? null
        : Number(rawParentId);
      const rawOrder = node?.org_chart_order;
      const normalizedOrder = rawOrder === null || rawOrder === undefined || rawOrder === ''
        ? 0
        : Number(rawOrder);

      return {
        ...node,
        id: normalizedId,
        parentId: Number.isNaN(normalizedParentId) ? null : normalizedParentId,
        org_chart_order: Number.isNaN(normalizedOrder) ? 0 : normalizedOrder,
      };
    });

    const nodesById = new Map<number, any>(normalizedNodes.map((node) => [Number(node.id), node]));

    return normalizedNodes.map((node) => {
      if (node?.orgChartPlaceHolder) {
        return node;
      }

      const visited = new Set<number>();
      let resolvedParentId = node.parentId;

      while (resolvedParentId !== null && resolvedParentId !== undefined && resolvedParentId !== '') {
        const numericParentId = Number(resolvedParentId);
        if (!Number.isFinite(numericParentId) || visited.has(numericParentId)) {
          resolvedParentId = null;
          break;
        }

        visited.add(numericParentId);

        const parentNode = nodesById.get(numericParentId);
        if (!parentNode) {
          resolvedParentId = null;
          break;
        }

        if (!parentNode.orgChartPlaceHolder) {
          break;
        }

        resolvedParentId = parentNode.parentId;
      }

      return {
        ...node,
        parentId: resolvedParentId,
      };
    });
  }

  private getHireStatusLabel(hireDate?: string | null, openPosition?: boolean): string {
    if (openPosition) {
      return 'Open Position';
    }

    if (!hireDate) {
      return 'Hire date not set';
    }

    const color = this.checkHireColor(hireDate);
    if (color === 'orange') return 'New Position';
    if (color === 'rgb(0, 195, 255)') return 'Less than 6 months';
    if (color === '#4B0082') return 'Less than 12 months';
    if (color === '#002D62') return '12+ months';
    return 'Hire date not set';
  }

  private getLocationLabel(node: any): string {
    if (node?.orgChartPlaceHolder) {
      return '—';
    }

    const city = String(node?.city || '').trim();
    const state = String(node?.state || '').trim();
    const area = String(node?.area || '').trim();
    const department = String(node?.department || '').trim();
    const combined = `${city} ${state} ${area} ${department}`.toLowerCase();

    if (combined.includes('seattle')) {
      return 'Seattle';
    }

    if (combined.includes('tijuana') || combined.includes(' tj') || combined.startsWith('tj ') || combined.includes('mexico')) {
      return 'Tijuana, Mexico';
    }

    if (combined.includes('las vegas') || state.toLowerCase() === 'nv') {
      return 'Las Vegas';
    }

    const cityState = [city, state].filter(Boolean).join(', ');
    if (cityState) {
      return cityState;
    }

    return 'Unassigned';
  }

  private getEmploymentTypeLabel(value: unknown): string {
    const employeeType = String(value || '').trim().toUpperCase();

    switch (employeeType) {
      case 'FT':
        return 'Permanent';
      case 'PT':
        return 'Part Time';
      case 'CT':
        return 'Contract';
      default:
        return 'Unspecified';
    }
  }

  private getLocationParts(locationLabel?: string | null): { city: string; state: string } {
    switch (String(locationLabel || '').trim()) {
      case 'Las Vegas, NV':
        return { city: 'Las Vegas', state: 'NV' };
      case 'Seattle, WA':
        return { city: 'Seattle', state: 'WA' };
      case 'Tijuana, Mexico':
        return { city: 'Tijuana', state: 'Mexico' };
      default:
        return { city: '', state: '' };
    }
  }

  private getManagerOptionLabel(value: string | number | null | undefined): string {
    if (value === this.rootManagerOptionValue || value === null || value === undefined || value === '') {
      return 'No Manager';
    }

    const managerId = Number(value);
    if (!Number.isFinite(managerId)) {
      return 'No Manager';
    }

    const manager = (this.originalData || []).find((entry) => Number(entry.id) === managerId);
    if (!manager) {
      return 'No Manager';
    }

    return `${manager.first || ''} ${manager.last || ''}`.trim() || `Employee ${managerId}`;
  }

  private normalizeDepartmentName(value: unknown): string {
    return String(value ?? '').trim().toLocaleLowerCase();
  }

  private findDepartmentByName(name: unknown): Department | undefined {
    const normalizedName = this.normalizeDepartmentName(name);
    if (!normalizedName) {
      return undefined;
    }

    return (this.departments || []).find(
      (department) => this.normalizeDepartmentName(department.department_name) === normalizedName,
    );
  }

  private findDepartmentById(id: unknown): Department | undefined {
    const departmentId = Number(id);
    if (!Number.isFinite(departmentId)) {
      return undefined;
    }

    return (this.departments || []).find((department) => Number(department.id) === departmentId);
  }

  private resolveDepartmentSelection(value: unknown): Department | undefined {
    return this.findDepartmentById(value) || this.findDepartmentByName(value);
  }

  private getDepartmentSelectOptions(): number[] {
    return Array.from(new Set(
      (this.departments || [])
        .map((department) => Number(department.id))
        .filter((id) => Number.isFinite(id))
    ));
  }

  private getDepartmentEditorOptions(): Array<number | string> {
    return [this.unassignedDepartmentOptionValue, ...this.getDepartmentSelectOptions()];
  }

  private getDepartmentNameEditorOptions(): string[] {
    return [
      this.unassignedDepartmentOptionValue,
      ...(this.departments || []).map((department) => String(department.department_name || '').trim()).filter((name) => !!name),
    ];
  }

  private getDepartmentOptionLabel(value: string | number | null | undefined): string {
    if (value === this.unassignedDepartmentOptionValue || value === null || value === undefined || value === '') {
      return 'Unassigned';
    }

    const departmentByName = this.findDepartmentByName(value);
    if (departmentByName) {
      return departmentByName.department_name;
    }

    const departmentId = Number(value);
    if (!Number.isFinite(departmentId)) {
      return 'Unassigned';
    }

    const department = this.departments.find((entry) => Number(entry.id) === departmentId);
    return department?.department_name || 'Unassigned';
  }

  isDepartmentActive(department: Department | null | undefined): boolean {
    return Number(department?.is_active ?? 0) === 1;
  }

  onTableGridReady(event: GridReadyEvent): void {
    this.tableGridApi = event.api;
    this.onTableFilterChanged();
    void this.applyAnalyticsLocationFilterToGrid();
  }

  onTableFilterChanged(): void {
    if (!this.tableGridApi) {
      this.excludeChildrenWhenTreeDataFiltering = false;
      return;
    }

    const filterModel: any = this.tableGridApi.getFilterModel() || {};
    // Keep location filtering strict; allow hierarchy searches to include children.
    this.excludeChildrenWhenTreeDataFiltering = !!filterModel.location;
  }

  private refreshDepartmentGridState(): void {
    if (!this.tableGridApi) {
      return;
    }

    this.tableGridApi.refreshCells({ columns: ['department'], force: true });
  }

  private async confirmAction(text: string, confirmButtonText = 'Continue'): Promise<boolean> {
    const result = await SweetAlert.confirmV1({
      title: 'Are you sure?',
      text,
      confirmButtonText,
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });

    return !!result.isConfirmed;
  }

  private async maybeMoveUserToDepartmentLead(userId: number, departmentId: number, currentManagerId: unknown): Promise<boolean> {
    const department = this.departments.find((entry) => Number(entry.id) === departmentId);
    const leadUserId = Number(department?.department_head_user_id);
    const existingManagerId = currentManagerId === this.rootManagerOptionValue ? null : Number(currentManagerId);

    if (!department || !Number.isFinite(leadUserId) || leadUserId <= 0 || leadUserId === userId || leadUserId === existingManagerId) {
      return false;
    }

    const leadName = department.department_head_name || this.getManagerOptionLabel(leadUserId);
    const shouldMove = await this.confirmAction(
      `Assigned this person to ${department.department_name}. Also move Reports To under ${leadName}?`,
      'Move Reports To',
    );

    if (!shouldMove) {
      return false;
    }

    await this.moveOrgChartNode(userId, { parentId: leadUserId });
    return true;
  }

  private getManagerSelectOptions(rowData: any): Array<number | string> {
    const rowId = Number(rowData?.id);
    const invalidIds = new Set<number>([rowId, ...this.getDescendantIds(rowId)]);
    const options: Array<number | string> = [this.rootManagerOptionValue];

    for (const entry of this.originalData || []) {
      const candidateId = Number(entry?.id);
      if (!Number.isFinite(candidateId) || invalidIds.has(candidateId) || entry?.orgChartPlaceHolder) {
        continue;
      }

      options.push(candidateId);
    }

    return options;
  }

  private getDescendantIds(parentId: number): number[] {
    if (!Number.isFinite(parentId)) {
      return [];
    }

    const descendants: number[] = [];
    const queue = [parentId];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!Number.isFinite(currentId)) {
        continue;
      }

      for (const entry of this.originalData || []) {
        if (Number(entry?.parentId) !== currentId) {
          continue;
        }

        const childId = Number(entry?.id);
        if (!Number.isFinite(childId) || descendants.includes(childId)) {
          continue;
        }

        descendants.push(childId);
        queue.push(childId);
      }
    }

    return descendants;
  }

  private getDirectReportEntries(managerId: number): any[] {
    if (!Number.isFinite(managerId)) {
      return [];
    }

    return (this.originalData || []).filter((entry) =>
      !entry?.orgChartPlaceHolder && Number(entry?.parentId) === managerId,
    );
  }

  private getEmployeeDisplayName(entry: any): string {
    const fullName = `${entry?.first || ''} ${entry?.last || ''}`.trim();
    if (fullName) {
      return fullName;
    }

    return String(entry?.employee_name || '').trim() || `Employee ${entry?.id}`;
  }

  private async promptDirectReportReassignment(rowData: any, directReports: any[]): Promise<number | null | undefined> {
    const managerOptions = this.getManagerSelectOptions(rowData);
    const inputOptions = Object.fromEntries(
      managerOptions.map((option) => [String(option), this.getManagerOptionLabel(option)]),
    );
    const reportCount = directReports.length;
    const employeeName = this.getEmployeeDisplayName(rowData);
    const defaultManagerValue = rowData?.manager_id ?? this.rootManagerOptionValue;
    const directReportItems = directReports
      .slice(0, 8)
      .map((entry) => `<li>${this.getEmployeeDisplayName(entry)}</li>`)
      .join('');
    const remainingCount = Math.max(directReports.length - 8, 0);
    const summaryHtml = [
      `<p class="mb-2 text-start">${employeeName} has <strong>${reportCount}</strong> direct report${reportCount === 1 ? '' : 's'}.</p>`,
      '<p class="mb-2 text-start">Select who should inherit these reports before this person is marked inactive.</p>',
      directReportItems ? `<ul class="text-start mb-2 ps-3">${directReportItems}</ul>` : '',
      remainingCount > 0 ? `<p class="mb-0 text-start text-muted">And ${remainingCount} more.</p>` : '',
    ].join('');

    const result = await SweetAlert.fire({
      title: 'Reassign Direct Reports',
      icon: 'warning',
      html: summaryHtml,
      input: 'select',
      inputOptions,
      inputValue: String(defaultManagerValue),
      inputPlaceholder: 'Select replacement manager',
      showCancelButton: true,
      confirmButtonText: 'Reassign and Inactivate',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      inputValidator: (value) => {
        if (!Object.prototype.hasOwnProperty.call(inputOptions, String(value))) {
          return 'Select where the direct reports should move before continuing.';
        }

        return null;
      },
      preConfirm: (value) => {
        if (!Object.prototype.hasOwnProperty.call(inputOptions, String(value))) {
          return false;
        }

        return value;
      },
    });

    if (!result.isConfirmed) {
      return undefined;
    }

    return result.value === this.rootManagerOptionValue ? null : Number(result.value);
  }

  private async confirmInactivationWorkflow(
    rowData: any,
    directReports: any[],
    nextManagerId: number | null,
  ): Promise<boolean> {
    const employeeName = this.getEmployeeDisplayName(rowData);
    const replacementManagerLabel = this.getManagerOptionLabel(nextManagerId ?? this.rootManagerOptionValue);
    const directReportItems = directReports
      .slice(0, 8)
      .map((entry) => `<li>${this.getEmployeeDisplayName(entry)}</li>`)
      .join('');
    const remainingCount = Math.max(directReports.length - 8, 0);

    const result = await SweetAlert.confirmV1({
      title: 'Confirm Inactivation',
      icon: 'warning',
      html: [
        `<p class="mb-2 text-start"><strong>${employeeName}</strong> will be marked inactive.</p>`,
        directReports.length > 0
          ? `<p class="mb-2 text-start"><strong>${directReports.length}</strong> direct report${directReports.length === 1 ? '' : 's'} will move to <strong>${replacementManagerLabel}</strong>.</p>`
          : '<p class="mb-2 text-start">This person has no direct reports.</p>',
        directReportItems ? `<ul class="text-start mb-2 ps-3">${directReportItems}</ul>` : '',
        remainingCount > 0 ? `<p class="mb-0 text-start text-muted">And ${remainingCount} more.</p>` : '',
      ].join(''),
      confirmButtonText: 'Confirm Inactivation',
      cancelButtonText: 'Review Again',
      reverseButtons: true,
    });

    return !!result.isConfirmed;
  }

  private async reassignDirectReports(managerId: number, nextManagerId: number | null): Promise<void> {
    const directReports = this.getDirectReportEntries(managerId);

    for (const directReport of directReports) {
      await this.userService.updateOrgChartPosition(Number(directReport.id), { parentId: nextManagerId });
    }
  }

  private normalizeHireDateValue(value: unknown): string | null {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      return null;
    }

    const parsed = moment(normalized, moment.ISO_8601, true);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
  }

  private getYearsOfService(hireDate: unknown): number | null {
    const normalizedHireDate = this.normalizeHireDateValue(hireDate);
    if (!normalizedHireDate) {
      return null;
    }

    const parsedDate = moment(normalizedHireDate, 'YYYY-MM-DD', true);
    if (!parsedDate.isValid()) {
      return null;
    }

    const years = moment().diff(parsedDate, 'years', true);
    return years >= 0 ? years : 0;
  }

  private getNextAnniversaryInfo(hireDate: unknown): { date: string | null; daysUntil: number | null; isUpcoming: boolean } {
    const normalizedHireDate = this.normalizeHireDateValue(hireDate);
    if (!normalizedHireDate) {
      return { date: null, daysUntil: null, isUpcoming: false };
    }

    const parsedDate = moment(normalizedHireDate, 'YYYY-MM-DD', true);
    if (!parsedDate.isValid()) {
      return { date: null, daysUntil: null, isUpcoming: false };
    }

    const today = moment().startOf('day');
    let nextAnniversary = parsedDate.clone().year(today.year()).startOf('day');

    if (nextAnniversary.isBefore(today)) {
      nextAnniversary = nextAnniversary.add(1, 'year');
    }

    const daysUntil = nextAnniversary.diff(today, 'days');
    return {
      date: nextAnniversary.format('YYYY-MM-DD'),
      daysUntil,
      isUpcoming: daysUntil >= 0 && daysUntil <= 30,
    };
  }

  private buildTableRows(data: any[]): void {
    const allNodes = (data || []).filter((node) => node?.id !== null && node?.id !== undefined);
    const users = allNodes.filter((node) => !node?.orgChartPlaceHolder);
    const allNodesById = new Map<number, any>(allNodes.map((node) => [Number(node.id), node]));
    const usersById = new Map<number, any>(users.map((node) => [Number(node.id), node]));
    const hasExplicitZeroUser = allNodesById.has(0);
    const getEmployeeName = (node: any) => `${node.first || ''} ${node.last || ''}`.trim() || `Employee ${node.id}`;
    const getNodeLabel = (node: any): string => {
      if (node?.orgChartPlaceHolder) {
        return String(node?.department || node?.first || node?.title || `Department ${node?.id}`).trim();
      }

      return getEmployeeName(node);
    };
    const isCeoNode = (node: any): boolean => {
      const fullName = getEmployeeName(node).toLowerCase();
      const title = String(node?.title || '').toLowerCase();
      return fullName === 'joe bianchi' || fullName === 'joe banachi' || title === 'ceo' || title.includes('chief executive officer');
    };
    const resolveManager = (node: any): any => {
      const visited = new Set<number>();
      let currentParentId = node?.parentId;

      while (currentParentId !== null && currentParentId !== undefined && currentParentId !== '') {
        const numericParentId = Number(currentParentId);
        if (visited.has(numericParentId)) {
          break;
        }

        visited.add(numericParentId);

        if (numericParentId === 0 && !hasExplicitZeroUser) {
          return null;
        }

        const parentNode = allNodesById.get(numericParentId);
        if (!parentNode) {
          return null;
        }

        if (!parentNode.orgChartPlaceHolder) {
          return parentNode;
        }

        currentParentId = parentNode.parentId;
      }

      return null;
    };
    const directReportsByManagerId = new Map<number, number>();
    for (const user of users) {
      const manager = resolveManager(user);
      const managerId = Number(manager?.id);
      if (!Number.isFinite(managerId)) {
        continue;
      }

      directReportsByManagerId.set(managerId, (directReportsByManagerId.get(managerId) || 0) + 1);
    }
    const childrenByParentId = new Map<number, number[]>();
    for (const node of allNodes) {
      const parentId = Number(node?.parentId);
      if (!Number.isFinite(parentId)) {
        continue;
      }

      if (!childrenByParentId.has(parentId)) {
        childrenByParentId.set(parentId, []);
      }

      childrenByParentId.get(parentId)?.push(Number(node.id));
    }
    const totalTeamSizeById = new Map<number, number>();
    const getTotalTeamSize = (nodeId: number): number => {
      if (totalTeamSizeById.has(nodeId)) {
        return totalTeamSizeById.get(nodeId) || 0;
      }

      const childIds = childrenByParentId.get(nodeId) || [];
      let total = 0;

      for (const childId of childIds) {
        const childNode = allNodesById.get(childId);
        if (!childNode) {
          continue;
        }

        if (!childNode.orgChartPlaceHolder) {
          total += 1;
        }

        total += getTotalTeamSize(childId);
      }

      totalTeamSizeById.set(nodeId, total);
      return total;
    };
    const buildHierarchyPath = (node: any): string[] => {
      const path: string[] = [];
      const visited = new Set<number>();
      let current = node;

      while (current && !visited.has(Number(current.id))) {
        visited.add(Number(current.id));
        path.unshift(this.createHierarchySegment({ ...current, first: getNodeLabel(current), last: '' }));

        if (current.parentId === null || current.parentId === undefined || current.parentId === '') {
          break;
        }

        const parentId = Number(current.parentId);
        if (parentId === 0 && (!hasExplicitZeroUser || isCeoNode(current))) {
          break;
        }

        current = allNodesById.get(parentId);

        if (!current) {
          break;
        }
      }

      return path;
    };

    const buildDepartmentHierarchyPath = (node: any): string[] => {
      const departmentLabel = String(
        node?.department || (node?.orgChartPlaceHolder ? getNodeLabel(node) : 'Unassigned')
      ).trim() || 'Unassigned';

      if (node?.orgChartPlaceHolder) {
        return ['Departments', departmentLabel, 'Department Node'];
      }

      return ['Departments', departmentLabel, getNodeLabel(node)];
    };

    const sourceNodes = this.tableHierarchyMode === 'department'
      ? allNodes.filter((node) => !node?.orgChartPlaceHolder)
      : allNodes;

    const tableRows = sourceNodes.map((node) => {
      const manager = resolveManager(node);
      const isPlaceholder = !!node.orgChartPlaceHolder;
      const nodeLabel = getNodeLabel(node);
      const department = this.findDepartmentById(node.department_id) || this.findDepartmentByName(node.department);
      const yearsOfService = isPlaceholder ? null : this.getYearsOfService(node.hire_date);
      const anniversaryInfo = isPlaceholder
        ? { date: null, daysUntil: null, isUpcoming: false }
        : this.getNextAnniversaryInfo(node.hire_date);
      return {
        id: node.id,
        employee_name: nodeLabel,
        title: node.title || (isPlaceholder ? 'Department' : 'Employee'),
        active: Number(node.active ?? 0) === 1 ? 1 : 0,
        employeeType1: node.employeeType1 || '',
        direct_report_count: isPlaceholder ? 0 : (directReportsByManagerId.get(Number(node.id)) || 0),
        total_team_size: getTotalTeamSize(Number(node.id)),
        location: this.getLocationLabel(node),
        department_id: department?.id ?? (Number.isFinite(Number(node.department_id)) ? Number(node.department_id) : null),
        department: department?.department_name
          || node.department
          || (isPlaceholder ? nodeLabel : 'Unassigned'),
        manager_id: manager?.id ?? this.rootManagerOptionValue,
        manager_name: manager ? `${manager.first || ''} ${manager.last || ''}`.trim() : '—',
        hire_date: node.hire_date || null,
        years_of_service_value: yearsOfService,
        next_anniversary_date: anniversaryInfo.date,
        next_anniversary_days: anniversaryInfo.daysUntil,
        next_anniversary_upcoming: anniversaryInfo.isUpcoming,
        hire_date_color: isPlaceholder ? '#1d4ed8' : (node.openPosition ? 'red' : this.checkHireColor(node.hire_date)),
        hire_status: isPlaceholder ? 'Department Node' : this.getHireStatusLabel(node.hire_date, !!node.openPosition),
        openPosition: !!node.openPosition,
        imageUrl: isPlaceholder ? 'assets/images/default-user.png' : (node.image || 'assets/images/default-user.png'),
        orgHierarchy: buildHierarchyPath(node),
        departmentHierarchy: buildDepartmentHierarchyPath(node),
        org_chart_order: Number(node.org_chart_order ?? 0) || 0,
        parentId: node.parentId ?? null,
        is_ceo: isCeoNode(node),
        is_placeholder: isPlaceholder,
      };
    }).sort((left, right) => {
      const leftPath = this.tableHierarchyMode === 'department'
        ? (left.departmentHierarchy || [])
        : (left.orgHierarchy || []);
      const rightPath = this.tableHierarchyMode === 'department'
        ? (right.departmentHierarchy || [])
        : (right.orgHierarchy || []);

      if (left.is_ceo && !right.is_ceo) return -1;
      if (!left.is_ceo && right.is_ceo) return 1;

      const leftKey = leftPath.join('/');
      const rightKey = rightPath.join('/');
      return leftKey.localeCompare(rightKey);
    });

    this.suppressTableCellValueChanged = true;
    this.tableRowData = tableRows;
    this.updateOrgMetrics(tableRows);
    this.refreshDecisionCharts(tableRows);
    void this.applyAnalyticsLocationFilterToGrid();

    queueMicrotask(() => {
      this.suppressTableCellValueChanged = false;
    });
  }

  readonly getTableDataPath = (data: any): string[] => {
    if (this.tableHierarchyMode === 'department') {
      return data.departmentHierarchy || ['Departments', data.department || 'Unassigned', data.employee_name || 'Employee'];
    }

    return data.orgHierarchy || [data.employee_name || 'Employee'];
  };

  readonly getTableRowId = (params: any): string => String(params.data?.id ?? '');

  async onTableCellValueChanged(event: any): Promise<void> {
    if (this.suppressTableCellValueChanged) {
      return;
    }

    const rowData = event?.data;
    const userId = Number(rowData?.id);
    const field = String(event?.colDef?.field || '');

    if (!userId || !field || event?.newValue === event?.oldValue) {
      return;
    }

    const supportedFields = new Set(['title', 'employeeType1', 'active', 'location', 'hire_date', 'manager_id', 'department']);
    if (!supportedFields.has(field)) {
      return;
    }

    if (field === 'department') {
      const nextDepartment = this.resolveDepartmentSelection(event.newValue);
      const previousDepartment = this.resolveDepartmentSelection(event.oldValue);
      const isClearingDepartment = event.newValue === this.unassignedDepartmentOptionValue || event.newValue === null || event.newValue === '';
      const nextDepartmentId = Number(nextDepartment?.id);
      const previousDepartmentName = previousDepartment
        ? String(previousDepartment.department_name || '').trim()
        : (event.oldValue === this.unassignedDepartmentOptionValue || event.oldValue === null || event.oldValue === ''
            ? ''
            : String(event.oldValue || '').trim());
      const nextDepartmentName = isClearingDepartment ? '' : String(nextDepartment?.department_name || '').trim();
      const assignmentKey = `${userId}:${nextDepartmentName}`;
      const now = Date.now();
      const lastAttemptAt = this.recentDepartmentAssignments.get(assignmentKey) || 0;

      if (!isClearingDepartment && (!nextDepartment || !Number.isFinite(nextDepartmentId))) {
        event.node?.setDataValue(field, event.oldValue);
        return;
      }

      if ((isClearingDepartment && !previousDepartmentName) || (!isClearingDepartment && nextDepartmentName === previousDepartmentName)) {
        return;
      }

      if (this.pendingDepartmentAssignments.has(assignmentKey) || now - lastAttemptAt < 2000) {
        return;
      }

      try {
        this.pendingDepartmentAssignments.add(assignmentKey);
        this.recentDepartmentAssignments.set(assignmentKey, now);

        await this.userService.update(userId, {
          department: isClearingDepartment ? null : String(nextDepartment?.department_name || '').trim(),
        });

        this.originalData = this.originalData.map((entry) =>
          Number(entry.id) === userId
            ? {
                ...entry,
                department: isClearingDepartment ? null : nextDepartment?.department_name || null,
              }
            : entry,
        );

        const movedToLead = !isClearingDepartment && nextDepartment
          ? await this.maybeMoveUserToDepartmentLead(userId, nextDepartmentId, rowData?.manager_id)
          : false;

        if (!movedToLead) {
          this.suppressTableCellValueChanged = true;
          try {
            this.buildTableRows(this.originalData);
            const updatedEntry = this.originalData.find((entry) => Number(entry.id) === userId);
            if (updatedEntry) {
              const updatedDepartment = isClearingDepartment ? null : nextDepartment;
              event.node?.setData({
                ...event.data,
                department: updatedDepartment?.department_name || 'Unassigned',
              });
            }
          } finally {
            queueMicrotask(() => {
              this.suppressTableCellValueChanged = false;
            });
          }
        }
      } catch (error) {
        event.node?.setDataValue(field, event.oldValue);
      } finally {
        this.pendingDepartmentAssignments.delete(assignmentKey);
      }

      return;
    }

    if (field === 'manager_id') {
      const nextManagerId = event.newValue === this.rootManagerOptionValue ? null : Number(event.newValue);
      const previousManagerId = event.oldValue === this.rootManagerOptionValue ? null : Number(event.oldValue);

      if (nextManagerId === previousManagerId) {
        return;
      }

      try {
        await this.moveOrgChartNode(userId, { parentId: nextManagerId });
      } catch (error) {
        event.node?.setDataValue(field, event.oldValue);
      }

      return;
    }

    const normalizedValue = field === 'active'
      ? Number(event.newValue) === 1 ? 1 : 0
      : field === 'hire_date'
        ? this.normalizeHireDateValue(event.newValue)
      : event.newValue;

    if (field === 'active' && rowData?.is_placeholder) {
      const department = this.findDepartmentByName(rowData?.department);
      if (!department?.id) {
        event.node?.setDataValue(field, event.oldValue);
        return;
      }

      try {
        const response = await firstValueFrom(this.departmentService.setDepartmentActive(Number(department.id), normalizedValue === 1));

        if (!response?.success) {
          throw new Error(response?.message || 'Failed to update department status');
        }

        this.originalData = this.originalData.map((entry) =>
          Number(entry.id) === userId
            ? {
                ...entry,
                active: normalizedValue,
              }
            : entry,
        );

        await this.getDataWithStatePreservation();
      } catch (error) {
        event.node?.setDataValue(field, event.oldValue);
      }

      return;
    }

    if (field === 'active' && normalizedValue === 0) {
      const directReports = this.getDirectReportEntries(userId);
      let nextManagerId: number | null = null;

      if (directReports.length > 0) {
        nextManagerId = await this.promptDirectReportReassignment(rowData, directReports);

        if (nextManagerId === undefined) {
          event.node?.setDataValue(field, event.oldValue);
          return;
        }

        const confirmed = await this.confirmInactivationWorkflow(rowData, directReports, nextManagerId);
        if (!confirmed) {
          event.node?.setDataValue(field, event.oldValue);
          return;
        }

        try {
          await this.reassignDirectReports(userId, nextManagerId);
          this.notificationService.success(
            `${directReports.length} direct report${directReports.length === 1 ? '' : 's'} reassigned to ${this.getManagerOptionLabel(nextManagerId ?? this.rootManagerOptionValue)}.`,
          );
        } catch (error) {
          event.node?.setDataValue(field, event.oldValue);
          return;
        }
      } else {
        const confirmed = await this.confirmInactivationWorkflow(rowData, [], nextManagerId);
        if (!confirmed) {
          event.node?.setDataValue(field, event.oldValue);
          return;
        }
      }
    }

    try {
      const payload = field === 'location'
        ? this.getLocationParts(String(normalizedValue || ''))
        : { [field]: normalizedValue };

      await this.userService.update(userId, payload);

      if (field === 'active') {
        await this.getDataWithStatePreservation();
        return;
      }

      this.originalData = this.originalData.map((entry) =>
        Number(entry.id) === userId
          ? {
              ...entry,
              ...(field === 'location'
                ? {
                    city: payload.city,
                    state: payload.state,
                  }
                : {
                    [field]: normalizedValue,
                    ...(field === 'hire_date'
                      ? {
                          hire_status: this.getHireStatusLabel(normalizedValue, !!entry.openPosition),
                          hire_date_color: entry.openPosition ? 'red' : this.checkHireColor(normalizedValue),
                        }
                      : {}),
                  }),
            }
          : entry,
      );

      const updatedEntry = this.originalData.find((entry) => Number(entry.id) === userId);
      if (updatedEntry) {
        event.node?.setData({
          ...event.data,
          title: updatedEntry.title || event.data?.title,
          active: Number(updatedEntry.active ?? 0) === 1 ? 1 : 0,
          employeeType1: updatedEntry.employeeType1 || '',
          location: this.getLocationLabel(updatedEntry),
          hire_date: updatedEntry.hire_date || null,
          hire_status: updatedEntry.hire_status || this.getHireStatusLabel(updatedEntry.hire_date, !!updatedEntry.openPosition),
          hire_date_color: updatedEntry.hire_date_color || (updatedEntry.openPosition ? 'red' : this.checkHireColor(updatedEntry.hire_date)),
        });
      }
    } catch (error) {
      event.node?.setDataValue(field, event.oldValue);
    }
  }

  onTableRowDragEnd(event: RowDragEndEvent<any>): void {
    const draggedNodeId = Number(event.node?.data?.id);
    const targetNode = this.resolveTableDropTarget(event.overNode as any);

    if (!draggedNodeId || !targetNode?.id || draggedNodeId === targetNode.id) {
      return;
    }

    void this.handleTableRowMove(event, targetNode);
  }

  private resolveTableDropTarget(overNode: any): { id: number; data: any; rowTop: number; rowHeight: number } | null {
    if (!overNode) {
      return null;
    }

    if (overNode.data?.id !== null && overNode.data?.id !== undefined) {
      return {
        id: Number(overNode.data.id),
        data: overNode.data,
        rowTop: Number(overNode.rowTop ?? 0),
        rowHeight: Number(overNode.rowHeight ?? this.tableRowHeight),
      };
    }

    const key = typeof overNode.key === 'string' ? overNode.key : '';
    if (!key.includes(this.hierarchyPathSeparator)) {
      return null;
    }

    const rawId = key.split(this.hierarchyPathSeparator).pop();
    const parsedId = Number(rawId);
    if (Number.isNaN(parsedId)) {
      return null;
    }

    const data = this.tableRowData?.find((row) => Number(row.id) === parsedId);
    if (!data) {
      return null;
    }

    return {
      id: parsedId,
      data,
      rowTop: Number(overNode.rowTop ?? 0),
      rowHeight: Number(overNode.rowHeight ?? this.tableRowHeight),
    };
  }

  private async handleTableRowMove(
    event: RowDragEndEvent<any>,
    targetNode: { id: number; data: any; rowTop: number; rowHeight: number },
  ): Promise<void> {
    const draggedData = event.node?.data;
    if (!draggedData) {
      return;
    }

    const dropPosition = this.getTableDropPosition(event, targetNode);
    const targetParentId = this.normalizeTableParentId(targetNode.data?.parentId);
    const targetId = Number(targetNode.id);
    const draggedId = Number(draggedData.id);

    if (dropPosition === 'inside') {
      await this.moveOrgChartNode(draggedId, {
        parentId: targetId,
      });
      return;
    }

    const parentId = targetParentId;
    await this.moveOrgChartNode(draggedId, dropPosition === 'before'
      ? { parentId, beforeId: targetId }
      : { parentId, afterId: targetId });
  }

  private getTableDropPosition(
    event: RowDragEndEvent<any>,
    targetNode: { rowTop: number; rowHeight: number },
  ): 'before' | 'after' | 'inside' {
    const mouseEvent = event.event as MouseEvent | undefined;
    const pointerY = typeof mouseEvent?.clientY === 'number' ? mouseEvent.clientY : null;
    if (pointerY === null) {
      return 'inside';
    }

    const rowTop = Number(targetNode.rowTop ?? 0);
    const rowHeight = Math.max(Number(targetNode.rowHeight ?? this.tableRowHeight), 1);
    const offset = pointerY - rowTop;

    if (offset <= rowHeight * 0.25) {
      return 'before';
    }

    if (offset >= rowHeight * 0.75) {
      return 'after';
    }

    return 'inside';
  }

  private normalizeTableParentId(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private async moveOrgChartNode(
    nodeId: number,
    payload: { parentId?: number | null; beforeId?: number | null; afterId?: number | null },
  ): Promise<void> {
    const result = await this.userService.updateOrgChartPosition(nodeId, payload);

    if (result) {
      const nodeIndex = this.originalData.findIndex((node) => Number(node.id) === nodeId);
      if (nodeIndex !== -1) {
        this.originalData[nodeIndex] = {
          ...this.originalData[nodeIndex],
          parentId: payload.parentId ?? this.originalData[nodeIndex].parentId,
        };
      }

      await this.getDataWithStatePreservation();
    }
  }
  
  // Simplified state management - just track basic state
  private currentZoom = 1;
  private currentPan = { x: 0, y: 0 };
  private themeObserver: MutationObserver | null = null;

  // Methods for leadership insights
  getNewHires(): number {
    if (!this.originalData) return 0;
    return this.originalData.filter(emp => {
      if (!emp.hire_date) return false;
      const hireDate = moment(emp.hire_date);
      const oneMonthAgo = moment().subtract(1, 'months');
      return hireDate.isAfter(oneMonthAgo);
    }).length;
  }

  getOpenPositions(): number {
    if (!this.originalData) return 0;
    return this.originalData.filter(emp => emp.openPosition).length;
  }

  private updateOrgMetrics(rows: any[]): void {
    const employeeRows = rows.filter((row) => !row.is_placeholder);
    const managerRows = employeeRows.filter((row) => Number(row.direct_report_count ?? 0) > 0);

    this.orgMetrics.totalEmployees = employeeRows.length;
    this.orgMetrics.activeEmployees = employeeRows.filter((row) => Number(row.active ?? 0) === 1).length;
    this.orgMetrics.departmentCount = rows.filter((row) => row.is_placeholder).length;
    this.orgMetrics.openPositions = employeeRows.filter((row) => !!row.openPosition).length;
    this.orgMetrics.averageSpanOfControl = managerRows.length
      ? Math.round((managerRows.reduce((sum, row) => sum + Number(row.direct_report_count ?? 0), 0) / managerRows.length) * 10) / 10
      : 0;
  }

  toggleAnalyticsPanel(): void {
    this.showAnalyticsPanel = !this.showAnalyticsPanel;
    if (!this.showAnalyticsPanel) {
      void this.clearAnalyticsLocationFilterFromGrid();
      return;
    }

    this.refreshDecisionCharts(this.tableRowData || []);
    void this.applyAnalyticsLocationFilterToGrid();
  }

  onAnalyticsLocationChange(location: string): void {
    this.selectedAnalyticsLocation = location || this.analyticsAllLocationsValue;
    this.refreshDecisionCharts(this.tableRowData || []);
    void this.applyAnalyticsLocationFilterToGrid();
  }

  onSyncAnalyticsFilterToTableChange(enabled: boolean): void {
    this.syncAnalyticsFilterToTable = !!enabled;
    if (this.syncAnalyticsFilterToTable) {
      void this.applyAnalyticsLocationFilterToGrid();
      return;
    }

    void this.clearAnalyticsLocationFilterFromGrid();
  }

  private async applyAnalyticsLocationFilterToGrid(): Promise<void> {
    if (!this.tableGridApi || !this.syncAnalyticsFilterToTable || !this.showAnalyticsPanel) {
      return;
    }

    const locationFilterModel = this.selectedAnalyticsLocation === this.analyticsAllLocationsValue
      ? null
      : {
          filterType: 'text',
          type: 'contains',
          filter: this.selectedAnalyticsLocation,
        };

    const apiWithColumnFilter = this.tableGridApi as any;
    if (typeof apiWithColumnFilter.setColumnFilterModel === 'function') {
      await apiWithColumnFilter.setColumnFilterModel('location', locationFilterModel);
      this.tableGridApi.onFilterChanged();
      return;
    }

    const currentFilterModel: any = { ...(this.tableGridApi.getFilterModel() || {}) };
    if (this.selectedAnalyticsLocation === this.analyticsAllLocationsValue) {
      delete currentFilterModel.location;
    } else {
      currentFilterModel.location = {
        filterType: 'text',
        type: 'contains',
        filter: this.selectedAnalyticsLocation,
      };
    }

    this.tableGridApi.setFilterModel(currentFilterModel);
    this.tableGridApi.onFilterChanged();
    this.onTableFilterChanged();
  }

  private async clearAnalyticsLocationFilterFromGrid(): Promise<void> {
    if (!this.tableGridApi) {
      return;
    }

    const apiWithColumnFilter = this.tableGridApi as any;
    if (typeof apiWithColumnFilter.setColumnFilterModel === 'function') {
      await apiWithColumnFilter.setColumnFilterModel('location', null);
      this.tableGridApi.onFilterChanged();
      return;
    }

    const currentFilterModel: any = { ...(this.tableGridApi.getFilterModel() || {}) };
    if (!currentFilterModel.location) {
      return;
    }

    delete currentFilterModel.location;
    this.tableGridApi.setFilterModel(currentFilterModel);
    this.tableGridApi.onFilterChanged();
    this.onTableFilterChanged();
  }

  private refreshDecisionCharts(rows: any[]): void {
    const chartTheme = this.getDecisionChartTheme();
    const employeeRows = (rows || []).filter((row) => !row.is_placeholder);
    const activeEmployees = employeeRows.filter((row) => Number(row.active ?? 0) === 1);

    const availableLocations = Array.from(
      new Set(
        activeEmployees
          .map((row) => String(row.location || 'Unassigned').trim() || 'Unassigned')
          .filter((location) => !!location),
      ),
    ).sort((left, right) => left.localeCompare(right));

    this.analyticsLocationOptions = availableLocations;

    if (
      this.selectedAnalyticsLocation !== this.analyticsAllLocationsValue
      && !availableLocations.includes(this.selectedAnalyticsLocation)
    ) {
      this.selectedAnalyticsLocation = this.analyticsAllLocationsValue;
    }

    const scopedRows = this.selectedAnalyticsLocation === this.analyticsAllLocationsValue
      ? activeEmployees
      : activeEmployees.filter(
          (row) => (String(row.location || 'Unassigned').trim() || 'Unassigned') === this.selectedAnalyticsLocation,
        );

    const departmentCounts = new Map<string, number>();
    const openPositionCounts = new Map<string, number>();
    const locationCounts = new Map<string, number>();

    for (const row of scopedRows) {
      const department = String(row.department || 'Unassigned').trim() || 'Unassigned';
      departmentCounts.set(department, (departmentCounts.get(department) || 0) + 1);

      if (row.openPosition) {
        openPositionCounts.set(department, (openPositionCounts.get(department) || 0) + 1);
      }

      const location = String(row.location || 'Unassigned').trim() || 'Unassigned';
      locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
    }

    const topDepartments = Array.from(departmentCounts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8);
    const topOpenDepartments = Array.from(openPositionCounts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8);
    const topLocations = Array.from(locationCounts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6);
    const managersBySpan = scopedRows
      .filter((row) => Number(row.direct_report_count ?? 0) > 0)
      .sort((left, right) => Number(right.direct_report_count ?? 0) - Number(left.direct_report_count ?? 0))
      .slice(0, 10);

    this.headcountByDepartmentChart = {
      series: [{ name: 'Headcount', data: topDepartments.map((entry) => entry[1]) }],
      chart: { type: 'bar', height: 240, toolbar: { show: false }, background: 'transparent', foreColor: chartTheme.foreColor },
      yaxis: { labels: { style: { colors: chartTheme.axisLabelColors } } },
      grid: { borderColor: chartTheme.gridColor },
      plotOptions: { bar: { borderRadius: 4, horizontal: true, barHeight: '58%' } },
      xaxis: {
        categories: topDepartments.map((entry) => entry[0]),
        labels: { trim: true, maxHeight: 80, style: { colors: chartTheme.axisLabelColors } },
      },
      dataLabels: { enabled: true },
      colors: ['#2563eb'],
      tooltip: { theme: chartTheme.tooltipTheme, y: { formatter: (value: number) => `${value} employees` } },
    };

    this.openPositionsByDepartmentChart = {
      series: [{ name: 'Open Positions', data: topOpenDepartments.map((entry) => entry[1]) }],
      chart: { type: 'bar', height: 240, toolbar: { show: false }, background: 'transparent', foreColor: chartTheme.foreColor },
      yaxis: { labels: { style: { colors: chartTheme.axisLabelColors } } },
      grid: { borderColor: chartTheme.gridColor },
      plotOptions: { bar: { borderRadius: 4, horizontal: false, columnWidth: '50%' } },
      xaxis: {
        categories: topOpenDepartments.map((entry) => entry[0]),
        labels: { rotate: -20, trim: true, style: { colors: chartTheme.axisLabelColors } },
      },
      dataLabels: { enabled: true },
      colors: ['#f59e0b'],
      tooltip: { theme: chartTheme.tooltipTheme, y: { formatter: (value: number) => `${value} open` } },
    };

    this.spanOfControlChart = {
      series: [{ name: 'Direct Reports', data: managersBySpan.map((row) => Number(row.direct_report_count ?? 0)) }],
      chart: { type: 'bar', height: 240, toolbar: { show: false }, background: 'transparent', foreColor: chartTheme.foreColor },
      yaxis: { labels: { style: { colors: chartTheme.axisLabelColors } } },
      grid: { borderColor: chartTheme.gridColor },
      plotOptions: { bar: { borderRadius: 4, horizontal: true, barHeight: '58%' } },
      xaxis: {
        categories: managersBySpan.map((row) => String(row.employee_name || `Manager ${row.id}`)),
        labels: { trim: true, maxHeight: 100, style: { colors: chartTheme.axisLabelColors } },
      },
      dataLabels: { enabled: true },
      colors: ['#10b981'],
      tooltip: { theme: chartTheme.tooltipTheme, y: { formatter: (value: number) => `${value} direct reports` } },
    };

    this.locationDistributionChart = {
      series: topLocations.map((entry) => entry[1]),
      chart: { type: 'donut', height: 240, toolbar: { show: false }, background: 'transparent', foreColor: chartTheme.foreColor },
      labels: topLocations.map((entry) => entry[0]),
      dataLabels: {
        enabled: true,
        style: { colors: ['#ffffff'], fontWeight: '700' },
        dropShadow: {
          enabled: chartTheme.labelDropShadowEnabled,
          top: 1,
          left: 1,
          blur: chartTheme.labelDropShadowBlur,
          color: chartTheme.labelDropShadowColor,
          opacity: chartTheme.labelDropShadowOpacity,
        },
      },
      legend: { position: 'bottom', labels: { colors: chartTheme.axisLabelColors } },
      stroke: { width: 1 },
      colors: ['#1d4ed8', '#06b6d4', '#22c55e', '#f97316', '#8b5cf6', '#ef4444'],
      responsive: [{ breakpoint: 1200, options: { legend: { position: 'bottom' } } }],
      tooltip: { theme: chartTheme.tooltipTheme, y: { formatter: (value: number) => `${value} employees` } },
    };
  }

  private isDarkThemeEnabled(): boolean {
    const rootTheme = String(document.documentElement?.getAttribute('data-bs-theme') || '').toLowerCase();
    const bodyTheme = String(document.body?.getAttribute('data-bs-theme') || '').toLowerCase();
    if (rootTheme === 'dark' || bodyTheme === 'dark') {
      return true;
    }

    if (rootTheme === 'light' || bodyTheme === 'light') {
      return false;
    }

    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
  }

  private getDecisionChartTheme(): {
    foreColor: string;
    axisLabelColors: string;
    gridColor: string;
    tooltipTheme: 'dark' | 'light';
    labelDropShadowEnabled: boolean;
    labelDropShadowBlur: number;
    labelDropShadowColor: string;
    labelDropShadowOpacity: number;
  } {
    if (this.isDarkThemeEnabled()) {
      return {
        foreColor: '#dbe7ff',
        axisLabelColors: '#dbe7ff',
        gridColor: 'rgba(148, 163, 184, 0.28)',
        tooltipTheme: 'dark',
        labelDropShadowEnabled: true,
        labelDropShadowBlur: 2,
        labelDropShadowColor: '#000000',
        labelDropShadowOpacity: 0.28,
      };
    }

    return {
      foreColor: '#334155',
      axisLabelColors: '#475569',
      gridColor: 'rgba(100, 116, 139, 0.24)',
      tooltipTheme: 'light',
      labelDropShadowEnabled: false,
      labelDropShadowBlur: 0,
      labelDropShadowColor: '#000000',
      labelDropShadowOpacity: 0,
    };
  }

  private setupThemeObserver(): void {
    this.themeObserver?.disconnect();

    const refreshChartsForTheme = () => {
      if (this.showAnalyticsPanel) {
        this.refreshDecisionCharts(this.tableRowData || []);
      }
    };

    this.themeObserver = new MutationObserver(() => {
      refreshChartsForTheme();
    });

    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-bs-theme', 'class'],
    });

    if (document.body) {
      this.themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-bs-theme', 'class'],
      });
    }
  }

  getEstablishedEmployees(): number {
    if (!this.originalData) return 0;
    return this.originalData.filter(emp => {
      if (!emp.hire_date) return false;
      const hireDate = moment(emp.hire_date);
      const sixMonthsAgo = moment().subtract(6, 'months');
      return hireDate.isBefore(sixMonthsAgo);
    }).length;
  }

  getPendingData(): number {
    if (!this.originalData) return 0;
    return this.originalData.filter(emp => !emp.hire_date).length;
  }

  private ensureSingleChartRoot(nodes: any[]): any[] {
    const working = (nodes || []).map((node) => ({ ...node }));
    if (working.length <= 1) {
      return working;
    }

    const nodeIds = new Set<number>(working.map((node) => Number(node.id)).filter((id) => Number.isFinite(id)));

    for (const node of working) {
      const parentId = node?.parentId;
      if (parentId === undefined || parentId === '' || parentId === 0) {
        node.parentId = null;
        continue;
      }

      const normalizedParentId = Number(parentId);
      if (!Number.isFinite(normalizedParentId) || !nodeIds.has(normalizedParentId)) {
        node.parentId = null;
      } else {
        node.parentId = normalizedParentId;
      }
    }

    const roots = working.filter((node) => node.parentId === null || node.parentId === undefined);
    if (roots.length <= 1) {
      return working;
    }

    let syntheticRootId = -1;
    while (nodeIds.has(syntheticRootId)) {
      syntheticRootId -= 1;
    }

    for (const root of roots) {
      root.parentId = syntheticRootId;
    }

    const syntheticRoot = {
      id: syntheticRootId,
      first: 'Organization',
      last: '',
      name: 'Organization',
      title: 'Root',
      parentId: null,
      image: 'assets/images/organization-icon.png',
      imageUrl: 'assets/images/organization-icon.png',
      active: 1,
      access: null,
      employeeType1: '',
      city: '',
      state: '',
      area: '',
      department: '',
      hire_date: null,
      orgChartPlaceHolder: true,
      showImage: false,
      openPosition: false,
      hire_date_color: '#6c757d',
      org_chart_expand: 1,
      _readOnly: this.readOnly,
      _component: this,
    };

    return [syntheticRoot, ...working];
  }

  async getData(id?) {
    try {
      // Use original user-based org chart (simple and working)
      let data: any = await this.userService.getOrgchart(this.buildOrgChartFilters());

      data = this.normalizeOrgChartData(data);
      data = this.fixDataStructure(data);
      this.originalData = this.deepCloneData(data);
      this.buildTableRows(data);

      data.sort((a, b) => {
        let username = (a.first || "") + " " + (a.last || "");
        let username1 = (b.first || "") + " " + (b.last || "");
        return username.localeCompare(username1);
      });

      let e = [];
      
      for (let i = 0; i < data.length; i++) {
        if (data[i].orgChartPlaceHolder) {
          continue;
        }

        data[i].bgColor = this.bgColor(data[i]);

        // Add cache-busting to image URLs to prevent browser caching issues
        let imageUrl = data[i].image || "assets/images/default-user.png";
        if (data[i].image && !data[i].image.startsWith("assets/")) {
          imageUrl = data[i].image + "?t=" + new Date().getTime();
        }

        e.push({
          id: data[i].id,
          bgColor: data[i].bgColor,
          name: (data[i].first || "") + " " + (data[i].last || ""),
          first: data[i].first || "",
          last: data[i].last || "",
          active: data[i].active,
          access: data[i].access,
          parentId: data[i].parentId,
          title: data[i].title || "",
          employeeType1: data[i].employeeType1 || "",
          city: data[i].city || "",
          state: data[i].state || "",
          area: data[i].area || "",
          department: data[i].department || "",
          hire_date: data[i].hire_date || null,
          image: data[i].image || "assets/images/default-user.png",
          imageUrl: imageUrl,
          orgChartPlaceHolder: data[i].orgChartPlaceHolder,
          showImage: data[i].showImage,
          openPosition: data[i].openPosition,
          hire_date_color: data[i].openPosition
            ? "red"
            : this.checkHireColor(data[i].hire_date),
          org_chart_expand: data[i].org_chart_expand,
          _readOnly: this.readOnly,  // Pass read-only flag to data
          _component: this,  // Pass component reference for drag and drop
        });
      }

      // Validate data integrity - check for missing parent references
      const allIds = new Set(e.map(node => node.id));
      const invalidNodes = [];
      
      e.forEach(node => {
        if (node.parentId && !allIds.has(node.parentId)) {
          invalidNodes.push(node);
          console.warn(`Node ${node.id} (${node.name}) references missing parent ${node.parentId}. Setting parentId to null.`);
          node.parentId = null; // Fix the invalid reference
        }
      });
      
      if (invalidNodes.length > 0) {
        console.warn(`Fixed ${invalidNodes.length} invalid parent references:`, invalidNodes.map(n => `${n.id}->${n.parentId}`));
      }

      e = this.ensureSingleChartRoot(e);

      if (!id) {
        this.chart
          .container(this.chartContainer?.nativeElement)
          .data(e)
          .onNodeClick(this.onNodeClick)
          .nodeContent(this.getNodeContent.bind(this))

          .nodeHeight((d) => {
            if (d.data.id === -1 || d.data.id === -2) return 110;
            if (d.data.orgChartPlaceHolder) return 110;
            return 110;
          })
          .nodeWidth((d) => {
            if (d.data.id === -1 || d.data.id === -2) return 180;
            if (d.data.orgChartPlaceHolder) return 180;
            return 180;
          })
          .childrenMargin((d) => 80)
          .compactMarginBetween((d) => 35)
          .compactMarginPair((d) => 30)
          .compact(false)
          .onExpandOrCollapse((d) => {
            let children = d.children;

            this.shouldShowItem(children);
            // children.forEach((d) => {
            //   // d?._children?.forEach((e) => {
            //   //   e.data._expanded = true;
            //   //   this.chart.setExpanded(e.data.id, true).render();
            //   // });
            // });
          })
          .buttonContent(({ node, state }) => {
            // Don't show expand/collapse button for virtual root only
            if (node.data.id === -1) {
              return '';
            }
            
            return `<div style="color:#fff;border-radius:3px;padding:2px 6px;font-size:10px;margin:auto auto;background-color:${node.data.hire_date_color
              };border: 1px solid #E4E2E9;white-space:nowrap;min-width:25px;"> <span style="font-size:10px">${node.children
                ? `<i class="mdi mdi-chevron-up"></i>`
                : `<i class="mdi mdi-chevron-down"></i>`
              }</span> ${node.data._directSubordinates} </div>`;
          })

          .linkUpdate(function (d, i, arr) {
            d3.select(this)
              .attr("stroke", (d) =>
                d.data._upToTheRootHighlighted ? "#318CE7" : "#2CAAE5"
              )
              .attr("stroke-width", (d) =>
                d.data._upToTheRootHighlighted ? 10 : 2
              );

            if (d.data._upToTheRootHighlighted) {
              d3.select(this).raise();
            }
          })
          .nodeUpdate(function (d, i, arr) {
            const node = d3.select(this);
            
            // Apply stroke styling
            node
              .select(".node-rect")
              .attr("stroke", (d) =>
                d.data._highlighted || d.data._upToTheRootHighlighted
                  ? "#318CE7"
                  : "none"
              )
              .attr(
                "stroke-width",
                d.data._highlighted || d.data._upToTheRootHighlighted ? 3 : 1
              );
            
            // Setup drag and drop only if explicitly enabled, not read-only, and not a virtual node.
            if (this.enableOrgChartNodeDragDrop && !d.data._readOnly && d.data.id !== -1 && d.data.id !== -2) {
              let draggedNode = null;
              
              const dragHandler = d3.drag()
                .on('start', function(event, dragData) {
                  draggedNode = this;
                  d3.select(this).raise();
                  d3.select(this).style('cursor', 'grabbing');
                  d3.select(this).attr('opacity', 0.7);
                  
                  // Add visual class to all potential drop targets
                  d3.selectAll('.node')
                    .filter(function(targetData: any) {
                      return targetData.data.id !== dragData.data.id && 
                             targetData.data.id !== -1 && 
                             targetData.data.id !== -2;
                    })
                    .classed('drop-target', true);
                })
                .on('drag', function(event) {
                  d3.select(this)
                    .attr('transform', `translate(${event.x}, ${event.y})`);
                  
                  // Highlight nodes we're hovering over
                  const elements = document.elementsFromPoint(event.sourceEvent.clientX, event.sourceEvent.clientY);
                  d3.selectAll('.node').classed('drop-target-hover', false);
                  
                  for (const el of elements) {
                    const nodeData = d3.select(el).datum();
                    if (nodeData && nodeData.data && nodeData.data.id && 
                        nodeData.data.id !== d.data.id && 
                        nodeData.data.id !== -1 && 
                        nodeData.data.id !== -2) {
                      d3.select(el.closest('.node')).classed('drop-target-hover', true);
                      break;
                    }
                  }
                })
                .on('end', function(event) {
                  d3.select(this).style('cursor', 'grab');
                  d3.select(this).attr('opacity', 1);
                  
                  // Remove drop target classes
                  d3.selectAll('.node').classed('drop-target', false).classed('drop-target-hover', false);
                  
                  // Find the node we're hovering over
                  const elements = document.elementsFromPoint(event.sourceEvent.clientX, event.sourceEvent.clientY);
                  let targetNode = null;
                  
                  for (const el of elements) {
                    const nodeData = d3.select(el).datum();
                    if (nodeData && nodeData.data && nodeData.data.id && 
                        nodeData.data.id !== d.data.id && 
                        nodeData.data.id !== -1 && 
                        nodeData.data.id !== -2) {
                      targetNode = nodeData;
                      break;
                    }
                  }
                  
                  if (targetNode) {
                    // Call the component's method to handle the parent change
                    const component = arr[0].__data__.data._component;
                    if (component && component.handleNodeDrop) {
                      component.handleNodeDrop(d.data.id, targetNode.data.id);
                    }
                  } else {
                    // If no valid drop target, reset position by re-rendering
                    const component = arr[0].__data__.data._component;
                    if (component && component.chart) {
                      component.chart.render();
                    }
                  }
                });
              
              // Apply drag handler to the node
              dragHandler(node);
              
              // Change cursor to indicate draggable
              node.style('cursor', 'grab');
            }
          })
          .render()
          .fit();


      } else {
        this.chart.data(e).setCentered(id).render();
      }
      // .expandAll()
      // this.defaultExpand();

      let d = this.chart.data();
      // Deep clone without functions and circular refs
      this.originalData = this.deepCloneData(d);
      
      // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
      setTimeout(() => {
        this.expandImmediate();
      }, 0);

      if (this.query) {
        this.filterChart(this.userId);
      }

      // if (this.user_edit) {
      //   this.currentView = this.user_edit;
      //   this.chart
      //     .data(e)
      //     .setHighlighted(this.user_edit)
      //     .setCentered(this.user_edit)
      //     .render();
      // }

      this.compact()

    } catch (error) {
      console.error('Error loading org chart data:', error);
    }
  }

  horizontal() {
    this.chart
      .childrenMargin((d) => {
        if (d.data.orgChartPlaceHolder) return 190;
        return 190;
      })
      .nodeHeight((d) => {
        if (d.data.orgChartPlaceHolder) return 135;
        return 190;
      })
      .compact(false)
      .setCentered()
      .render()
      .fit();
  }

  compact() {
    this.chart
      .nodeWidth((d) => 180)
      .childrenMargin((d) => 70)
      .nodeHeight((d) => 110)
      .compactMarginBetween((d) => 25)
      .compactMarginPair((d) => 20)
      .compact(true)
      .render()
  }

  ngOnInit() {
    this.getData();
    this.loadDepartments();
    this.setupThemeObserver();
  }

  fixDataStructure(data: any[]): any[] {
    console.log('Original data length:', data.length);
    console.log('Sample data:', data.slice(0, 3));

    // Step 1: Find the CEO FIRST (before we modify anything)
    const ceo = data.find(node => 
      !node.parentId || 
      node.parentId === null || 
      node.parentId === undefined || 
      node.parentId === 0 ||
      node.parentId === ""
    );
    console.log('CEO identified:', ceo ? `${ceo.first} ${ceo.last} (ID: ${ceo.id})` : 'No CEO found');

    // Step 2: Identify orphan nodes and collect them
    const nodeIds = new Set(data.map(node => node.id));
    console.log('All node IDs:', Array.from(nodeIds));
    
    const orphanNodes = [];
    console.log('Processing nodes for orphans...');
    
    data = data.map(node => {
      if (node.parentId && !nodeIds.has(node.parentId)) {
        console.warn(`Orphan node detected: ${node.first} ${node.last} (ID: ${node.id}) has invalid parentId: ${node.parentId}`);
        orphanNodes.push(node);
        // Assign orphaned nodes to a special "Unassigned" parent that we'll create
        return { ...node, parentId: -2 };
      }
      return node;
    });

    console.log(`Total orphan nodes found: ${orphanNodes.length}`);

    // Step 3: If we have orphaned nodes, create ONE "Unassigned" section under the CEO
    if (orphanNodes.length > 0) {
      // Check if unassigned section already exists
      const existingUnassigned = data.find(node => node.id === -2);
      
      if (!existingUnassigned) {
        console.log(`Creating "Unassigned" section for ${orphanNodes.length} orphaned employees`);

        const unassignedSection = {
          id: -2,
          first: "Unassigned",
          last: "Employees",
          name: "Unassigned Employees",
          title: "No Current Manager",
          parentId: ceo ? ceo.id : null, // Put under CEO if found, otherwise root
          image: "assets/images/unassigned-icon.png",
          orgChartPlaceHolder: true,
          showImage: false,
          openPosition: false,
          org_chart_expand: 1,
          access: null,
          active: 1,
          isEmployee: 0, // Not a real employee
          hire_date: null,
          bgColor: "#ffc107" // Warning yellow color
        };

        // Add the unassigned section to the data
        data.push(unassignedSection);
        console.log(`Added "Unassigned" section under ${ceo ? `${ceo.first} ${ceo.last}` : 'root'} for orphaned employees:`, orphanNodes.map(n => `${n.first} ${n.last}`));
      } else {
        console.log(`"Unassigned" section already exists, using existing one for ${orphanNodes.length} orphaned employees`);
      }
    }

    // Step 4: Handle multiple roots (including the "Unassigned" section if created)
    const rootNodes = data.filter(node => 
      node.parentId === null || 
      node.parentId === undefined || 
      node.parentId === 0 ||
      node.parentId === ""
    );

    console.log(`Found ${rootNodes.length} root nodes:`, rootNodes.map(n => `${n.first} ${n.last} (ID: ${n.id})`));

    if (rootNodes.length > 1) {
      console.log('Multiple roots detected (including CEO and/or Unassigned section), creating virtual root...');
      
      // Create a virtual root node
      const virtualRoot = {
        id: -1,
        first: "Organization",
        last: "",
        name: "Organization",
        title: "Root",
        parentId: null,
        image: "assets/images/organization-icon.png",
        orgChartPlaceHolder: true,
        showImage: false,
        openPosition: false,
        org_chart_expand: 1,
        access: null,
        active: 1,
        isEmployee: 1,
        hire_date: null,
        bgColor: "#f8f9fa"
      };

      // Update all root nodes to point to the virtual root
      data = data.map(node => {
        if (rootNodes.some(root => root.id === node.id)) {
          console.log(`Connecting root node ${node.first} ${node.last} (ID: ${node.id}) to virtual root`);
          return { ...node, parentId: -1 };
        }
        return node;
      });

      // Add the virtual root to the beginning of the array
      data = [virtualRoot, ...data];
      console.log('Virtual root added. New data length:', data.length);
    } else if (rootNodes.length === 0) {
      console.error('No root nodes found! This will cause issues.');
    } else {
      console.log('Single root node found:', rootNodes[0].first, rootNodes[0].last);
    }

    return data;
  }

  // Department Management Methods
  loadDepartments() {
    console.log('Loading departments...');
    this.departmentService.getDepartments(true).subscribe({
      next: (response) => {
        console.log('Departments response:', response);
        if (response.success) {
          this.departments = [...(response.data || [])].sort((left, right) => {
            const leftOrder = Number(left?.display_order);
            const rightOrder = Number(right?.display_order);
            const normalizedLeftOrder = Number.isFinite(leftOrder) ? leftOrder : 9999;
            const normalizedRightOrder = Number.isFinite(rightOrder) ? rightOrder : 9999;
            if (normalizedLeftOrder !== normalizedRightOrder) {
              return normalizedLeftOrder - normalizedRightOrder;
            }

            return String(left?.department_name || '').localeCompare(String(right?.department_name || ''));
          });
          console.log('Loaded departments:', this.departments);

          if (this.originalData?.length) {
            this.buildTableRows(this.originalData);
          }

          this.refreshDepartmentGridState();
        } else {
          console.error('Failed to load departments:', response);
        }
      },
      error: (error) => {
        console.error('Error loading departments:', error);
      }
    });
  }

  openDepartmentModal(department: Department | null = null) {
    const modalRef: any = this.departmentModalService.open({ department });
    modalRef.result.then(
      (result: { saved?: boolean; deleted?: boolean } | undefined) => {
        if (result?.saved) {
          this.onDepartmentSaved();
        }

        if (result?.deleted) {
          this.onDepartmentDeleted();
        }
      },
      () => {},
    );
  }

  openShareModal() {
    import('../org-chart-share-modal/org-chart-share-modal.component').then(m => {
      const modalRef = this.userModalService.modalService.open(m.OrgChartShareModalComponent, {
        size: 'lg',
        backdrop: 'static'
      });
    });
  }

  closeDepartmentModal() {
    this.currentDepartment = null;
  }

  onDepartmentSaved() {
    this.loadDepartments();
    // Refresh the org chart data while preserving expansion state
    this.getDataWithStatePreservation();
  }

  onDepartmentDeleted() {
    this.loadDepartments();
    // Refresh the org chart data while preserving expansion state
    this.getDataWithStatePreservation();
  }

  /**
   * Build org chart data from department structure
   */
  buildOrgChartData(orgData: any) {
    const chartData = [];
    
    // Add departments as nodes
    if (orgData.departments && orgData.departments.length > 0) {
      orgData.departments.forEach(dept => {
        chartData.push({
          id: `dept_${dept.id}`,
          name: dept.department_name,
          first: dept.department_name,
          last: '',
          title: 'Department',
          parentId: null, // Simplified - no department hierarchy
          imageUrl: 'assets/images/department-icon.png',
          isDepartment: true,
          bgColor: '#e3f2fd',
          access: null,
          orgChartPlaceHolder: false,
          showImage: true,
          openPosition: false,
          org_chart_expand: false
        });
      });
    }
    
    // Add users as nodes under their departments
    if (orgData.users && orgData.users.length > 0) {
      orgData.users.forEach(user => {
        chartData.push({
          id: user.user_id,
          name: user.display_name,
          first: user.display_name.split(' ')[0] || '',
          last: user.display_name.split(' ').slice(1).join(' ') || '',
          title: 'Employee',
          parentId: user.department_id ? `dept_${user.department_id}` : null,
          imageUrl: 'assets/images/default-user.png',
          isDepartment: false,
          bgColor: '#ffffff',
          access: null,
          orgChartPlaceHolder: false,
          showImage: true,
          openPosition: false,
          org_chart_expand: false
        });
      });
    }
    
    // If no departments exist, add a placeholder message
    if (chartData.length === 0) {
      chartData.push({
        id: -1,
        name: 'No Departments Created',
        first: 'No Departments',
        last: 'Created',
        title: 'Create your first department to get started',
        parentId: null,
        imageUrl: 'assets/images/department-icon.png',
        isDepartment: true,
        bgColor: '#f5f5f5',
        access: null,
        orgChartPlaceHolder: true,
        showImage: true,
        openPosition: false,
        org_chart_expand: false
      });
    }
    
    return chartData;
  }

  /**
   * Fallback to original user-based org chart if departments aren't available
   */
  async getOriginalUserData() {
    try {
      console.log('Loading original user-based org chart...');
      
      let data: any = await this.userService.getOrgchart(this.buildOrgChartFilters());

      data = this.fixDataStructure(data);

      data.sort((a, b) => {
        let username = (a.first || "") + " " + (a.last || "");
        let username1 = (b.first || "") + " " + (b.last || "");
        return username.localeCompare(username1);
      });

      let e = [];
      
      for (let i = 0; i < data.length; i++) {
        data[i].bgColor = this.bgColor(data[i]);

        e.push({
          id: data[i].id,
          bgColor: data[i].bgColor,
          name: (data[i].first || "") + " " + (data[i].last || ""),
          first: data[i].first || "",
          last: data[i].last || "",
          active: data[i].active,
          access: data[i].access,
          parentId: data[i].parentId,
          title: data[i].title || "",
          employeeType1: data[i].employeeType1 || "",
          city: data[i].city || "",
          state: data[i].state || "",
          area: data[i].area || "",
          department: data[i].department || "",
          hire_date: data[i].hire_date || null,
          image: data[i].image || "assets/images/default-user.png",
          imageUrl: data[i].image || "assets/images/default-user.png",
          orgChartPlaceHolder: data[i].orgChartPlaceHolder,
          showImage: data[i].showImage,
          openPosition: data[i].openPosition,
          isDepartment: false,
          hire_date_color: data[i].openPosition
            ? "red"
            : this.checkHireColor(data[i].hire_date),
          org_chart_expand: data[i].org_chart_expand,
          _readOnly: this.readOnly,  // Pass read-only flag to data
          _component: this,  // Pass component reference for drag and drop
        });
      }

      // Continue with chart rendering...
      this.renderChart(e);

    } catch (error) {
      console.error('Error loading original user data:', error);
    }
  }

  /**
   * Render the org chart with the provided data
   */
  renderChart(chartData: any[]) {
    if (!this.chart || !this.chartContainer) {
      console.error('Chart or container not initialized');
      return;
    }

    this.chart
      .container(this.chartContainer?.nativeElement)
      .data(chartData)
      .onNodeClick(this.onNodeClick)
      .nodeContent(this.getNodeContent.bind(this))
      .nodeHeight((d) => {
        if (d.data.id === -1 || d.data.id === -2) return 90;
        if (d.data.orgChartPlaceHolder) return 90;
        return 90;
      })
      .nodeWidth((d) => {
        if (d.data.id === -1 || d.data.id === -2) return 180;
        if (d.data.orgChartPlaceHolder) return 180;
        return 180;
      })
      .childrenMargin((d) => 80)
      .compactMarginBetween((d) => 35)
      .compactMarginPair((d) => 30)
      .compact(false)
      .render()
      .fit();

    console.log('Chart rendered with data:', chartData);
    
    // Add drag and drop listeners after render
    setTimeout(() => {
      this.addDragAndDropListeners();
    }, 100);
  }

  private addDragAndDropListeners() {
    if (!this.enableOrgChartNodeDragDrop) {
      return;
    }

    const container = this.chart.container();
    if (!container) return;

    // Remove existing listeners first
    container.selectAll('[data-node-id]').on('dragstart', null).on('dragover', null).on('drop', null);

    // Add dragstart listeners to draggable nodes
    container.selectAll('[data-can-drag="true"]')
      .on('dragstart', (event: DragEvent, d: any) => {
        const element = event.target as HTMLElement;
        const nodeId = element.getAttribute('data-node-id');
        if (nodeId && event.dataTransfer) {
          event.dataTransfer.setData('text/plain', nodeId);
          event.dataTransfer.effectAllowed = 'move';
          
          // Add visual feedback
          element.style.opacity = '0.5';
          
          console.log('Drag started for user:', nodeId);
        }
      })
      .on('dragend', (event: DragEvent) => {
        // Reset visual feedback
        const element = event.target as HTMLElement;
        element.style.opacity = '1';
      });

    // Add drop listeners to drop zones
    container.selectAll('[data-can-drop="true"]')
      .on('dragover', (event: DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        // Visual feedback for drop zone
        const target = event.currentTarget as HTMLElement;
        target.style.backgroundColor = '#e8f5e8';
        target.style.borderColor = '#4caf50';
      })
      .on('dragleave', (event: DragEvent) => {
        // Remove visual feedback
        const target = event.currentTarget as HTMLElement;
        const isDepartment = target.getAttribute('data-is-department') === 'true';
        target.style.backgroundColor = isDepartment ? '#e3f2fd' : 'white';
        target.style.borderColor = isDepartment ? '#2196f3' : '#ddd';
      })
      .on('drop', (event: DragEvent, d: any) => {
        event.preventDefault();
        
        const draggedNodeId = event.dataTransfer?.getData('text/plain');
        const element = event.currentTarget as HTMLElement;
        const targetNodeId = element.getAttribute('data-node-id');
        const isDepartment = element.getAttribute('data-is-department') === 'true';
        
        // Reset visual feedback
        element.style.backgroundColor = isDepartment ? '#e3f2fd' : 'white';
        element.style.borderColor = isDepartment ? '#2196f3' : '#ddd';
        
        if (draggedNodeId && targetNodeId && draggedNodeId !== targetNodeId) {
          console.log('Dropped user', draggedNodeId, 'on target', targetNodeId, 'isDepartment:', isDepartment);
          
          // Department assignment is now handled by the new drag and drop implementation
        }
      });
  }

  // Method to preserve expansion state and refresh chart data
  async getDataWithStatePreservation() {
    console.log('Refreshing chart data while preserving expansion state');
    
    try {
      // Capture current expansion state
      const expansionState = new Map();
      if (this.chart) {
        try {
          const currentData = this.chart.data();
          if (currentData && Array.isArray(currentData)) {
            currentData.forEach((node: any) => {
              if (node._expanded !== undefined) {
                expansionState.set(node.id, node._expanded);
              }
            });
          }
          console.log('Preserved expansion state for', expansionState.size, 'nodes');
        } catch (expansionError) {
          console.error('Error capturing expansion state:', expansionError);
        }
      }
      
      // Reload the data
      await this.getData();
      
      // Validate data integrity after loading
      this.validateAndFixDataIntegrity();
      
      // Restore expansion state after data is loaded
      if (this.chart && expansionState.size > 0) {
        setTimeout(() => {
          try {
            expansionState.forEach((expanded, nodeId) => {
              if (expanded) {
                this.chart.setExpanded(nodeId, true);
              }
            });
            this.chart.render();
            console.log('Restored expansion state for', expansionState.size, 'nodes');
          } catch (restoreError) {
            console.error('Error restoring expansion state:', restoreError);
          }
        }, 100); // Small delay to ensure data is loaded
      }
    } catch (error) {
      console.error('Error in getDataWithStatePreservation:', error);
      // Fallback to regular getData if state preservation fails
      try {
        await this.getData();
      } catch (fallbackError) {
        console.error('Error in fallback getData:', fallbackError);
        this.notificationService.error('Error refreshing chart data. Please try refreshing the page.', false);
      }
    }
  }

  handleImageUpdate(userId: string, imageUrl: string) {
    console.log('handleImageUpdate called with:', userId, imageUrl);
    
    // Update the local data with the new image URL
    const userIdNum = parseInt(userId);
    const userNode = this.originalData.find(user => Number(user.id) === userIdNum);
    
    console.log('Found user node:', userNode);
    
    if (userNode) {
      // Add cache-busting parameter to force browser to reload image
      const cacheBustUrl = imageUrl + '?t=' + new Date().getTime();
      
      console.log('Cache bust URL:', cacheBustUrl);
      
      // Update the user's image in the local data used by both chart and table views
      this.originalData = this.originalData.map((user) =>
        Number(user.id) === userIdNum
          ? { ...user, image: cacheBustUrl, imageUrl: cacheBustUrl }
          : user,
      );

      this.buildTableRows(this.originalData);
      
      // Try to update the image directly in the DOM without full re-render
      if (this.chart) {
        console.log('Attempting direct DOM image update');
        
        // Update the chart data first
        const currentData = this.chart.data();
        if (currentData && Array.isArray(currentData)) {
          const chartNode = currentData.find((node: any) => node.id === userIdNum);
          if (chartNode) {
            chartNode.image = cacheBustUrl;
            chartNode.imageUrl = cacheBustUrl;
          }
        }
        
        // Try to find and update the image element directly
        try {
          // Look for the image in the SVG DOM
          const svgContainer = this.chartContainer?.nativeElement?.querySelector('svg');
          if (svgContainer) {
            const images = svgContainer.querySelectorAll('img');
            let imageUpdated = false;
            
            images.forEach((img: HTMLImageElement) => {
              const currentSrc = img.src;
              // Check if this image belongs to our user (contains the base URL)
              if (currentSrc && currentSrc.includes(imageUrl.split('?')[0])) {
                console.log('Found matching image, updating src:', currentSrc, '->', cacheBustUrl);
                img.src = cacheBustUrl;
                imageUpdated = true;
              }
            });
            
            if (imageUpdated) {
              console.log('Successfully updated image via direct DOM manipulation');
              return; // Exit early, no need to re-render
            }
          }
        } catch (error) {
          console.log('Direct DOM update failed:', error);
        }
        
        // Fallback: Force a minimal re-render only if direct update failed
        console.log('Fallback: updating chart data and re-rendering');
        
        try {
          // Validate data integrity before rendering
          this.validateAndFixDataIntegrity();
          this.chart.data(this.originalData).render();
        } catch (error) {
          console.error('Error in chart re-render after image update:', error);
          if (error.message && error.message.includes('missing:')) {
            const missingId = error.message.split('missing:')[1].trim();
            console.error(`Missing node ID during image update: ${missingId}`);
            // Try to reload data to fix integrity issues
            this.getDataWithStatePreservation();
          }
        }
      }
    } else {
      console.log('User node not found for ID:', userIdNum);
    }
  }

  // Validate and fix data integrity issues
  validateAndFixDataIntegrity() {
    if (!this.originalData || !Array.isArray(this.originalData)) {
      console.warn('No data to validate');
      return;
    }

    // Check for missing parent references
    const allIds = new Set(this.originalData.map(node => node.id));
    const invalidNodes = [];
    
    this.originalData.forEach(node => {
      if (node.parentId && !allIds.has(node.parentId)) {
        invalidNodes.push(node);
        console.warn(`Node ${node.id} (${node.name}) references missing parent ${node.parentId}. Setting parentId to null.`);
        node.parentId = null; // Fix the invalid reference
      }
    });
    
    if (invalidNodes.length > 0) {
      console.warn(`Fixed ${invalidNodes.length} invalid parent references:`, invalidNodes.map(n => `${n.id}->${n.parentId}`));
    }
  }

  /**
   * Handle drag and drop of nodes to change parent relationships
   * @param nodeId - ID of the node being dragged  
   * @param newParentId - ID of the node it's being dropped on
   */
  async handleNodeDrop(nodeId: number, newParentId: number) {
    if (!this.enableOrgChartNodeDragDrop) {
      return;
    }

    // Safety check - ensure data is loaded
    if (!this.originalData || !Array.isArray(this.originalData) || this.originalData.length === 0) {
      console.warn('Chart data not yet loaded, cannot process drag and drop');
      this.chart?.render(); // Reset visual state
      return;
    }

    if (this.readOnly) {
      console.warn('Cannot update org chart in read-only mode');
      return;
    }

    // Prevent circular references
    if (nodeId === newParentId) {
      this.notificationService.warning('Cannot assign a node as its own parent.');
      return;
    }

    // Check if the new parent is a descendant of the node being moved
    const isDescendant = this.isNodeDescendant(nodeId, newParentId);
    if (isDescendant) {
      this.notificationService.warning('Cannot move a node under one of its descendants. This would create a circular reference.');
      return;
    }

    // Find the dragged user and target in the original data
    const draggedUser = this.originalData.find(user => user.id === nodeId);
    const targetNode = this.originalData.find(user => user.id === newParentId);
    
    if (!draggedUser) {
      console.error('Dragged user not found:', nodeId);
      return;
    }
    
    if (!targetNode) {
      console.error('Target node not found:', newParentId);
      return;
    }

    // Confirm the action
    const draggedName = draggedUser.name || `${draggedUser.first} ${draggedUser.last}`;
    const targetName = targetNode.name || targetNode.department || `${targetNode.first} ${targetNode.last}`;
    const confirmMsg = `Move "${draggedName}" under "${targetName}"?`;
    
    const confirmed = await this.confirmAction(confirmMsg, 'Move Person');
    if (!confirmed) {
      // Refresh chart to reset visual state
      this.chart.render();
      return;
    }

    try {
      // Update the parent relationship in the backend
      const result = await this.userService.updateOrgChartPosition(nodeId, {
        parentId: newParentId,
      });

      if (result) {
        // Update local data
        const nodeIndex = this.originalData.findIndex(n => n.id === nodeId);
        if (nodeIndex !== -1) {
          this.originalData[nodeIndex].parentId = newParentId;
        }

        // Refresh the chart while preserving expansion state
        await this.getDataWithStatePreservation();
        
        // alert('Org chart updated successfully');
      } else {
        this.notificationService.error('Failed to update org chart', false);
        this.chart.render(); // Reset visual state
      }
    } catch (error) {
      console.error('Error updating org chart:', error);
      this.notificationService.error(error, false);
      this.chart.render(); // Reset visual state
    }
  }

  /**
   * Check if potentialDescendantId is a descendant of ancestorId
   */
  private isNodeDescendant(ancestorId: number, potentialDescendantId: number): boolean {
    // Safety check
    if (!this.originalData || !Array.isArray(this.originalData)) {
      console.warn('originalData not available for circular reference check. Assuming no circular reference but should be verified now. This is iimportant to check now. w');
      return false;
    }
    
    const findParent = (nodeId: number): number | null => {
      const node = this.originalData.find(n => n.id === nodeId);
      return node?.parentId || null;
    };

    let currentId = potentialDescendantId;
    const visited = new Set<number>();

    while (currentId !== null && currentId !== undefined) {
      if (currentId === ancestorId) {
        return true; // Found the ancestor, so it's a descendant
      }

      if (visited.has(currentId)) {
        // Circular reference detected, break to prevent infinite loop
        break;
      }

      visited.add(currentId);
      currentId = findParent(currentId);
    }

    return false;
  }

  ngOnDestroy() {
    // Component cleanup
    this.themeObserver?.disconnect();
    this.themeObserver = null;
  }
}
