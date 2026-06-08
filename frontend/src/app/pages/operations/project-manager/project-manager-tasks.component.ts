import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { AccessControlApiService } from '@app/core/api/access-control/access-control.service';
import { AgGridModule } from 'ag-grid-angular';
import { CellValueChangedEvent, ColDef, GridApi, GridOptions, GridReadyEvent, IRowNode, RowDragEndEvent, RowSelectedEvent } from 'ag-grid-community';
import { PmTaskComment, PmTaskAttachment, PmTaskRecord, ProjectManagerTasksDataService, TaskGate, TaskStatus } from './services/project-manager-tasks-data.service';
import { ProjectDashboardItem, ProjectManagerProjectsService } from './services/project-manager-projects.service';
import { PmTaskCommentModalComponent } from './pm-task-comment-modal.component';
import { PmTaskAttachmentModalComponent } from './pm-task-attachment-modal.component';

type TaskGateFilter = 'All' | TaskGate;

type RowType = 'group' | 'subgroup' | 'task' | 'add-item';

const GROUP_PALETTE = [
  '#0073ea', '#e2445c', '#037f4c', '#ff642e', '#9c27b0',
  '#00c875', '#0f3d78', '#ff7575', '#fdab3d', '#66ccff'
];

const DEPENDS_ON_OPTIONS = ['3FS', '6FS', '8FS', '1FS', '2FS', '4FS', '5FS', '7FS', '9FS', '10FS'];

interface PmTreeRow {
  rowId: string;
  path: string[];
  rowType: RowType;
  label: string;
  groupName: string;
  subGroupName: string;
  taskId: number | null;
  gate: TaskGate | '';
  taskName: string;
  project: string;
  assignedTo: string;
  durationDays: number | null;
  startDate: string;
  finishDate: string;
  dependsOn: string;
  bucket: string;
  status: TaskStatus | '';
  completion: number | null;
  source: 'manual' | 'bulk-engineering' | '';
  _groupColor?: string;
}

@Component({
  standalone: true,
  selector: 'app-project-manager-tasks',
  imports: [SharedModule, ReactiveFormsModule, AgGridModule],
  templateUrl: './project-manager-tasks.component.html',
  styleUrls: ['./project-manager-tasks.component.scss']
})
export class ProjectManagerTasksComponent implements OnInit {
  private readonly projectManagerBaseRoute = '/project-manager';
  private readonly operationsBaseRoute = '/operations/project-manager';
  private gridApi?: GridApi<PmTreeRow>;
  private nextId = 1;
  private activeProjectId = '';
  gateContextLabel = 'All Gates';
  activeGateFilter: TaskGateFilter = 'All';
  readonly gateOptions: TaskGate[] = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'];

  moveTargetGroup = 'Engineering';
  moveTargetSubGroup = 'Backlog';
  newSubGroupGroup = 'Engineering';
  newSubGroupName = '';

  showAddTaskPanel = false; // kept for template compatibility
  showManagePanel = false;
  showBulkPanel = false;

  @ViewChild('addTaskModal') addTaskModalTpl!: TemplateRef<any>;
  @ViewChild('manageGroupsModal') manageGroupsModalTpl!: TemplateRef<any>;
  @ViewChild('bulkAddModal') bulkAddModalTpl!: TemplateRef<any>;
  private activeModalRef: any = null;

  hideDone = false;
  filterPerson = '';
  filterStatus = '';
  quickFilterText = '';
  allProjects: ProjectDashboardItem[] = [];
  private suppressFilterParamSync = false;
  private groupColorMap = new Map<string, string>();
  private groupColorIndex = 0;
  private subgroupCatalog: Record<string, Set<string>> = {};
  private readonly singleClickDropdownCols = new Set(['gate', 'status', 'dependsOn', 'startDate', 'finishDate']);
  private lastInteractedTaskId: number | null = null;
  actionMessage = '';
  actionMessageType: 'success' | 'warning' = 'success';
  currentProjectSummary: ProjectDashboardItem | null = null;

  engineeringPeople = [
    'Ankit Batra',
    'Aldo Verber',
    'Brice Cutspec',
    'Mike Bristol',
    'Temenuga Terziev',
    'Dana L.',
    'Carlos M.'
  ];

  selectedPeople = new Set<string>(['Ankit Batra', 'Aldo Verber']);
  selectedAssignees = new Set<string>();
  private assigneeDirectory: string[] = [];

  toggleTaskComplete(taskId: number): void {
    const task = this.taskRecords.find(t => t.id === taskId);
    if (!task) return;
    if (task.status === 'Completed') {
      task.status = 'Open';
      task.completion = 0;
    } else {
      task.status = 'Completed';
      task.completion = 100;
    }
    this.persistTaskState();
    this.rebuildTreeRows();
  }

  private toggleRowsComplete(rows: PmTaskRecord[]): void {
    if (!rows.length) return;

    const shouldMarkComplete = rows.some((task) => task.status !== 'Completed');
    rows.forEach((task) => {
      task.status = shouldMarkComplete ? 'Completed' : 'Open';
      task.completion = shouldMarkComplete ? 100 : 0;
    });

    this.persistTaskState();
    this.rebuildTreeRows();
  }

  private setRowsCompleteState(rows: PmTaskRecord[], shouldComplete: boolean): void {
    if (!rows.length) return;

    rows.forEach((task) => {
      task.status = shouldComplete ? 'Completed' : 'Open';
      task.completion = shouldComplete ? 100 : 0;
    });

    this.persistTaskState();
    this.rebuildTreeRows();
  }

  private getTaskRowsFromSelectedNode(node: any): PmTaskRecord[] {
    if (!node) {
      return [];
    }

    if (node.group) {
      const taskIds = new Set<number>();
      const leafChildren = node.allLeafChildren || [];
      leafChildren.forEach((child: any) => {
        const taskId = Number(child?.data?.taskId);
        if (Number.isFinite(taskId)) {
          taskIds.add(taskId);
        }
      });
      return this.taskRecords.filter((task) => taskIds.has(task.id));
    }

    const taskId = Number(node?.data?.taskId);
    if (!Number.isFinite(taskId)) {
      return [];
    }

    const task = this.taskRecords.find((item) => item.id === taskId);
    return task ? [task] : [];
  }

  private getRowsForCompleteAction(params: any): PmTaskRecord[] {
    const row = params?.data as PmTreeRow | undefined;

    if (params?.node?.group) {
      const taskIds = new Set<number>();
      const leafChildren = params.node.allLeafChildren || [];
      leafChildren.forEach((child: any) => {
        const taskId = Number(child?.data?.taskId);
        if (Number.isFinite(taskId)) {
          taskIds.add(taskId);
        }
      });

      if (taskIds.size) {
        return this.taskRecords.filter((t) => taskIds.has(t.id));
      }
    }

    // AG Grid can generate parent/group rows where data is undefined; resolve by node route.
    if (!row && params?.node?.group) {
      const route: string[] = [];
      let cursor = params.node;
      while (cursor && cursor.level >= 0) {
        const key = String(cursor.key || '').trim();
        if (key && key !== '__add_item__') {
          route.unshift(key);
        }
        cursor = cursor.parent;
      }

      const groupName = route[0] || '';
      const subgroupPath = route.slice(1).join('/');
      if (!groupName) return [];

      if (!subgroupPath) {
        return this.taskRecords.filter((t) => t.groupName === groupName);
      }

      return this.taskRecords.filter(
        (t) => t.groupName === groupName && (t.subGroupName === subgroupPath || t.subGroupName.startsWith(`${subgroupPath}/`)),
      );
    }

    if (!row) return [];

    if (row.rowType === 'task' && row.taskId !== null) {
      const task = this.taskRecords.find((t) => t.id === row.taskId);
      return task ? [task] : [];
    }

    if (row.rowType === 'group') {
      return this.taskRecords.filter((t) => t.groupName === row.groupName);
    }

    if (row.rowType === 'subgroup') {
      const subgroupPath = String(row.subGroupName || '').trim();
      if (!subgroupPath) return [];
      return this.taskRecords.filter((t) => t.groupName === row.groupName && (t.subGroupName === subgroupPath || t.subGroupName.startsWith(`${subgroupPath}/`)));
    }

    if (row.rowType === 'add-item') {
      const subgroupPath = String(row.subGroupName || '').trim();
      if (!row.groupName) return [];
      if (!subgroupPath) {
        return this.taskRecords.filter((t) => t.groupName === row.groupName);
      }
      return this.taskRecords.filter((t) => t.groupName === row.groupName && (t.subGroupName === subgroupPath || t.subGroupName.startsWith(`${subgroupPath}/`)));
    }

    return [];
  }

  private getCompleteIconHtml(done: boolean): string {
    return done
      ? `<svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="8" fill="#00c875" stroke="#00c875" stroke-width="1.5"/><polyline points="4.5,9 7.5,12 13.5,6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="8" fill="none" stroke="#c5cad3" stroke-width="1.5"/></svg>`;
  }

  private isCompleteForParams(params: any): boolean {
    const targetRows = this.getRowsForCompleteAction(params);
    return targetRows.length > 0 && targetRows.every((task) => task.status === 'Completed');
  }

  toggleAssignee(person: string, checked: boolean): void {
    if (checked) {
      this.selectedAssignees.add(person);
    } else {
      this.selectedAssignees.delete(person);
    }
  }

  taskForm = this.fb.group({
    gate: ['G4' as TaskGate, Validators.required],
    groupName: [''],
    subGroupName: [''],
    project: ['VWL-035XX-XXX', Validators.required],
    taskName: ['', [Validators.required, Validators.maxLength(140)]],
    startDate: ['2026-03-12', Validators.required],
    finishDate: ['2026-03-29', Validators.required],
    dependsOn: [''],
    bucket: ['Overall'],
    status: ['Open' as TaskStatus],
    completion: [0]
  });

  private taskRecords: PmTaskRecord[] = [];

  rowData: PmTreeRow[] = [];

  columnDefs: ColDef<PmTreeRow>[] = [
    { field: 'groupName', rowGroup: true, hide: true },
    { field: 'subGroupName', rowGroup: true, hide: true },
    {
      headerName: '',
      colId: 'dragHandle',
      width: 34,
      pinned: 'right',
      rowDrag: params => !!params.data && (params.data.rowType === 'group' || params.data.rowType === 'subgroup' || params.data.rowType === 'task'),
      sortable: false,
      filter: false,
      resizable: false,
      suppressMovable: true,
      valueGetter: () => ''
    },
    { field: 'taskId', headerName: '#', width: 70, valueFormatter: params => params.value ?? '' },
    {
      field: 'gate',
      headerName: 'Gate',
      width: 95,
      editable: params => params.data?.rowType === 'task',
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: this.gateOptions }
    },
    {
      field: 'taskName',
      headerName: 'Task Name',
      minWidth: 320,
      flex: 2,
      hide: true,
      filter: 'agTextColumnFilter',
      editable: params => params.data?.rowType === 'task',
      cellRenderer: (params: any) => {
        const rowType = params.data?.rowType as RowType | undefined;
        const isParentRow = !!params.node?.group || rowType === 'group' || rowType === 'subgroup';
        if (isParentRow) {
          const label = String(params.data?.label ?? params.value ?? '');
          if (!label) {
            return '';
          }
          return label;
        }

        const value = String(params.value ?? '');
        if (!value) {
          return '';
        }

        if (rowType !== 'task' && rowType !== 'add-item') {
          return value;
        }

        const depth = Number(params.node?.level ?? 0);
        const indent = Math.max(0, depth) * 28;
        return `<span style="display:inline-block;padding-left:${indent}px">${value}</span>`;
      }
    },
    { field: 'project', headerName: 'Project', minWidth: 180, filter: 'agTextColumnFilter', editable: params => params.data?.rowType === 'task' },
    {
      field: 'assignedTo', headerName: 'Assigned To', minWidth: 170, filter: 'agTextColumnFilter',
      editable: params => params.data?.rowType === 'task',
      cellEditor: 'agRichSelectCellEditor',
      cellEditorParams: {
        values: () => this.getAssigneeOptions(),
        allowTyping: true,
        filterList: true,
        searchType: 'matchAny',
        highlightMatch: true,
      },
      cellRenderer: (params: any) => {
        if (!params.value) return '';
        const names: string[] = typeof params.value === 'string'
          ? params.value.split(',').map((s: string) => s.trim()).filter(Boolean)
          : params.value;
        return names.map(n => {
          const initials = n.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
          return `<span title="${n}" style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#0d6efd;color:#fff;font-size:9px;font-weight:600;margin-right:2px">${initials}</span>`;
        }).join('');
      }
    },
    {
      field: 'durationDays',
      headerName: 'Duration',
      width: 120,
      aggFunc: (params: any) => this.aggregateDurationSpan(params),
      valueFormatter: params => (params.value === null || params.value === undefined ? '' : `${params.value} days`)
    },
    {
      field: 'startDate',
      headerName: 'Start',
      width: 120,
      editable: params => params.data?.rowType === 'task',
      cellEditor: 'agDateStringCellEditor',
      aggFunc: (params: any) => this.aggregateMinDate(params?.values),
    },
    {
      field: 'finishDate',
      headerName: 'Finish',
      width: 120,
      editable: params => params.data?.rowType === 'task',
      cellEditor: 'agDateStringCellEditor',
      aggFunc: (params: any) => this.aggregateMaxDate(params?.values),
    },
    {
      field: 'dependsOn', headerName: 'Depends On', width: 120,
      editable: params => params.data?.rowType === 'task',
      cellEditor: 'agRichSelectCellEditor',
      cellEditorParams: {
        values: DEPENDS_ON_OPTIONS,
        allowTyping: true,
        filterList: true,
        searchType: 'matchAny',
        highlightMatch: true
      }
    },
    { field: 'bucket', headerName: 'Bucket', width: 120, editable: params => params.data?.rowType === 'task' },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      editable: params => params.data?.rowType === 'task',
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['Open', 'In Process', 'Review', 'Completed', 'Locked'] },
      cellRenderer: (params: any) => {
        if (!params.value) return '';
        const colors: Record<string, string> = {
          'Open': '#6c757d',
          'In Process': '#0d6efd',
          'Review': '#fd7e14',
          'Completed': '#198754',
          'Locked': '#dc3545'
        };
        const bg = colors[params.value] ?? '#6c757d';
        return `<span style="background:${bg};color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;white-space:nowrap">${params.value}</span>`;
      }
    },
    {
      field: 'completion',
      headerName: 'Progress',
      width: 150,
      pinned: 'right',
      aggFunc: (params: any) => this.aggregateCompletionPercent(params),
      editable: params => params.data?.rowType === 'task',
      cellRenderer: (params: any) => {
        if (params.data?.rowType === 'add-item' || params.value === null || params.value === undefined) return '';
        const isGroupNode = !!params.node?.group;
        if (!isGroupNode && params.data?.rowType !== 'task') return '';
        const pct = Math.max(0, Math.min(100, Number(params.value) || 0));
        const isTaskRow = params.data?.rowType === 'task';
        const barH = isTaskRow ? 8 : 6;
        const opacity = isTaskRow ? '' : 'opacity:0.85;';
        const fillColor = pct >= 100
          ? '#59b563'
          : pct >= 50
            ? '#f4b000'
            : pct >= 20
              ? '#d8df00'
              : pct > 0
                ? '#e11d2e'
                : '#adb5bd';
        const fillWidth = pct > 0 ? `max(${pct}%, 2px)` : '0%';
        return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;height:100%;${opacity}">
          <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" style="width:72px;height:${barH}px;background:#e8ecf1;border-radius:999px;overflow:hidden;">
            <div class="progress-bar" style="width:${fillWidth};height:100%;background:${fillColor};"></div>
          </div>
          <span style="font-size:11px;color:#3f4954;min-width:34px;text-align:right;line-height:1;">${pct}%</span>
        </div>`;
      }
    },
    {
      headerName: 'Comments',
      colId: 'comments',
      width: 110,
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => {
        if (!params.data || params.data.rowType !== 'task') return '';
        const count = (params.data as PmTreeRow & { _commentCount?: number })._commentCount ?? 0;
        const label = count > 0 ? `💬 ${count}` : '💬 Add';
        return `<button class="btn btn-sm btn-outline-secondary py-0 px-2" style="font-size:11px">${label}</button>`;
      },
      onCellClicked: (params: any) => {
        if (!params.data || params.data.rowType !== 'task' || params.data.taskId === null) return;
        this.openCommentModal(params.data.taskId);
      }
    },
    {
      headerName: 'Attachments',
      colId: 'attachments',
      width: 120,
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => {
        if (!params.data || params.data.rowType !== 'task') return '';
        const count = (params.data as PmTreeRow & { _attachmentCount?: number })._attachmentCount ?? 0;
        const label = count > 0 ? `📎 ${count}` : '📎 Add';
        return `<button class="btn btn-sm btn-outline-secondary py-0 px-2" style="font-size:11px">${label}</button>`;
      },
      onCellClicked: (params: any) => {
        if (!params.data || params.data.rowType !== 'task' || params.data.taskId === null) return;
        this.openAttachmentModal(params.data.taskId);
      }
    }
  ];

  gridOptions: GridOptions<PmTreeRow> = {
    animateRows: true,
    suppressAggFuncInHeader: true,
    getRowId: params => params.data.rowId,
    groupAllowUnbalanced: true,
    groupDisplayType: null,
    rowSelection: {
      mode: 'multiRow',
      checkboxLocation: 'autoGroupColumn',
      checkboxes: (params: any) => params?.data?.rowType !== 'add-item',
      groupSelects: 'descendants',
    } as any,
    rowDragMultiRow: true,
    groupDefaultExpanded: -1,
    autoGroupColumnDef: {
      headerName: 'Task Name',
      field: 'taskName',
      minWidth: 250,
      editable: (params: any) => params?.data?.rowType === 'task' && !params?.node?.group,
      cellRenderer: 'agGroupCellRenderer',
      cellRendererParams: {
        suppressCount: true,
      },
    },
    getRowStyle: (params: any) => {
      if (params.node?.group && params.node.level === 0) {
        const color = this.getGroupColor(String(params.node.key || ''));
        return { background: `${color}12`, borderLeft: `3px solid ${color}`, fontWeight: '700' };
      }
      if (params.node?.group && params.node.level > 0) {
        const route = this.getNodeGroupRoute(params.node);
        const color = this.getGroupColor(route[0] || '');
        return { background: `${color}08`, borderLeft: `3px solid ${color}99`, fontWeight: '600' };
      }
      if (!params.data) return {};
      const color = params.data._groupColor || '#0073ea';
      if (params.data.rowType === 'add-item') {
        return {
          background: `rgba(var(--vz-primary-rgb), 0.04)`,
          borderLeft: `3px solid ${color}60`,
          borderBottom: `1px dashed rgba(var(--vz-primary-rgb), 0.25)`,
          color: 'var(--vz-primary)',
          cursor: 'pointer'
        };
      }
      return { borderLeft: `3px solid transparent` };
    },
    getRowClass: (params: any) => {
      if (params.node?.group && params.node.level === 0) return 'pm-group-row';
      if (params.node?.group) return 'pm-subgroup-row';
      if (params.data?.rowType === 'add-item') return 'pm-add-item-row';
      return '';
    },
    isRowSelectable: undefined,
    singleClickEdit: true,
    stopEditingWhenCellsLoseFocus: true,
    undoRedoCellEditing: true,
    undoRedoCellEditingLimit: 20,
    suppressMoveWhenRowDragging: true,
    suppressRowClickSelection: true,
    onCellClicked: (event: any) => {
      const row = event?.data as PmTreeRow | undefined;
      if (!row) {
        return;
      }

      if (row.rowType === 'add-item') {
        this.openAddTaskPanel(row.groupName, row.subGroupName || '');
        return;
      }

      if (row.rowType !== 'task') {
        return;
      }

      this.lastInteractedTaskId = row.taskId;

      const colId = String(event.column?.getColId?.() || '');
      if (!this.singleClickDropdownCols.has(colId)) {
        return;
      }

      event.api.startEditingCell({
        rowIndex: event.rowIndex,
        colKey: colId
      });
    },
    onCellValueChanged: (event: CellValueChangedEvent<PmTreeRow>) => this.handleCellValueChanged(event),
    onRowSelected: (event: RowSelectedEvent<PmTreeRow>) => {
      if (!event?.node || event.node.data?.rowType === 'add-item') {
        return;
      }

      if (event.node.data?.rowType === 'task') {
        this.lastInteractedTaskId = event.node.data.taskId;
      }
    },
    onRowDragEnd: (event: RowDragEndEvent<PmTreeRow>) => this.handleRowDragEnd(event),
    onGridReady: (event: GridReadyEvent<PmTreeRow>) => {
      this.gridApi = event.api;
      this.gridApi.setGridOption('quickFilterText', this.quickFilterText);
      this.rebuildTreeRows();
    }
  };

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private tasksDataService: ProjectManagerTasksDataService,
    private projectsService: ProjectManagerProjectsService,
    private accessControlApi: AccessControlApiService,
    private modalService: NgbModal
  ) {
    // Initialized from query params to keep URL and local state in sync.
  }

  ngOnInit(): void {
    this.loadAssigneeDirectory();

    this.allProjects = this.projectsService.getProjects();
    this.applyProjectContext((this.route.snapshot.queryParamMap.get('projectId') || '').trim());

    this.tasksDataService.saveFallback$.subscribe((projectId) => {
      if (projectId !== this.activeProjectId) {
        return;
      }
      this.actionMessageType = 'warning';
      this.actionMessage = 'Save to DB failed. Changes are cached locally for now.';
    });

    this.projectsService.getProjects$().subscribe(projects => {
      this.allProjects = projects;
      const projectIdFromQuery = (this.route.snapshot.queryParamMap.get('projectId') || '').trim();
      this.applyProjectContext(projectIdFromQuery);
    });

    this.route.queryParamMap.subscribe(params => {
      const gateContext = (params.get('gateContext') || '').trim();
      const gate = Number(params.get('gate') || 0);
      const projectId = (params.get('projectId') || '').trim();

      this.applyGateContext(gateContext, gate);
      this.applyProjectContext(projectId);

      this.suppressFilterParamSync = true;
      this.filterPerson = (params.get('person') || '').trim();
      this.filterStatus = (params.get('status') || '').trim();
      this.hideDone = this.parseBooleanParam(params.get('hideDone'));
      this.quickFilterText = (params.get('q') || '').trim();

      const gateFilterParam = (params.get('gateFilter') || '').trim();
      if (gateFilterParam === 'All' || this.gateOptions.includes(gateFilterParam as TaskGate)) {
        this.setGateFilter(gateFilterParam as TaskGateFilter, false);
      }
      this.suppressFilterParamSync = false;

      this.rebuildTreeRows();
      this.gridApi?.setGridOption('quickFilterText', this.quickFilterText);
    });
  }

  get hasProject(): boolean {
    return !!this.activeProjectId;
  }

  get selectedProjectId(): string {
    return this.activeProjectId || this.currentProjectSummary?.id || '';
  }

  onProjectSelect(id: string): void {
    const normalizedId = String(id || '').trim();
    if (!normalizedId || normalizedId === this.selectedProjectId) return;
    const url = this.router.url.split('?')[0];
    this.router.navigate([url], { queryParams: { projectId: normalizedId }, queryParamsHandling: 'merge' });
  }

  get executionChecklistQueryParams(): { projectId: string; view: 'checklist' } {
    return {
      projectId: this.getActiveProjectId(),
      view: 'checklist'
    };
  }

  get executionChecklistRoute(): string {
    return `${this.baseRoute}/new-project`;
  }

  get dashboardRoute(): string {
    return `${this.baseRoute}/dashboard`;
  }

  private get baseRoute(): string {
    return this.router.url.startsWith(this.projectManagerBaseRoute)
      ? this.projectManagerBaseRoute
      : this.operationsBaseRoute;
  }

  get currentProjectIdLabel(): string {
    return this.currentProjectSummary?.id || this.activeProjectId || 'N/A';
  }

  get availableGroups(): string[] {
    return Object.keys(this.subgroupCatalog).sort((a, b) => a.localeCompare(b));
  }

  getAvailableSubgroups(group: string): string[] {
    const subgroups = this.subgroupCatalog[group];
    if (!subgroups) {
      return [];
    }
    return Array.from(subgroups).sort((a, b) => a.localeCompare(b));
  }

  onQuickFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.setQuickFilter(value);
  }

  toggleHideDone(): void {
    this.hideDone = !this.hideDone;
    this.syncFilterQueryParams();
    this.rebuildTreeRows();
  }

  setPersonFilter(person: string): void {
    this.filterPerson = String(person || '').trim();
    this.syncFilterQueryParams();
    this.rebuildTreeRows();
  }

  setStatusFilter(status: string): void {
    this.filterStatus = this.filterStatus === status ? '' : status;
    this.syncFilterQueryParams();
    this.rebuildTreeRows();
  }

  clearFilters(): void {
    this.filterPerson = '';
    this.filterStatus = '';
    this.hideDone = false;
    this.quickFilterText = '';
    this.setGateFilter('All', false);
    this.syncFilterQueryParams();
    this.gridApi?.setGridOption('quickFilterText', '');
    this.rebuildTreeRows();
  }

  openAddTaskPanel(group = '', subgroup = ''): void {
    this.showManagePanel = false;
    this.showBulkPanel = false;
    if (group) {
      this.taskForm.patchValue({ groupName: group, subGroupName: subgroup });
    }
    this.activeModalRef = this.modalService.open(this.addTaskModalTpl, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
      keyboard: true
    });
    this.activeModalRef.result.catch(() => {
      // dismissed — clear form
      this.taskForm.patchValue({ taskName: '' });
      this.selectedAssignees.clear();
    });
    setTimeout(() => {
      document.querySelector<HTMLInputElement>('.add-task-taskname')?.focus();
    }, 200);
  }

  closeAddTaskPanel(): void {
    this.activeModalRef?.close();
    this.activeModalRef = null;
  }

  toggleManagePanel(): void {
    this.showManagePanel = false;
    this.showAddTaskPanel = false;
    this.showBulkPanel = false;
    this.activeModalRef = this.modalService.open(this.manageGroupsModalTpl, {
      size: 'md',
      centered: true
    });
  }

  toggleBulkPanel(): void {
    this.showBulkPanel = false;
    this.showAddTaskPanel = false;
    this.showManagePanel = false;
    this.activeModalRef = this.modalService.open(this.bulkAddModalTpl, {
      size: 'md',
      centered: true
    });
  }

  togglePerson(person: string, checked: boolean): void {
    if (checked) {
      this.selectedPeople.add(person);
      return;
    }
    this.selectedPeople.delete(person);
  }

  createTask(): void {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }
    if (!this.selectedAssignees.size) {
      alert('Please select at least one assignee.');
      return;
    }

    const value = this.taskForm.getRawValue();
    const task: PmTaskRecord = {
      id: this.nextId++,
      gate: (value.gate || 'G4') as TaskGate,
      groupName: value.groupName?.trim() || '',
      subGroupName: value.subGroupName?.trim() || '',
      taskName: value.taskName || '',
      project: value.project || '',
      assignedTo: Array.from(this.selectedAssignees),
      startDate: value.startDate || '',
      finishDate: value.finishDate || '',
      durationDays: this.calculateDuration(value.startDate || '', value.finishDate || ''),
      dependsOn: value.dependsOn || '',
      bucket: value.bucket || 'Overall',
      status: (value.status || 'Open') as TaskStatus,
      completion: Number(value.completion || 0),
      source: 'manual'
    };

    if (task.groupName && task.subGroupName) {
      this.ensureSubgroup(task.groupName, task.subGroupName);
    }
    this.taskRecords = [task, ...this.taskRecords];
    this.persistTaskState();
    this.rebuildTreeRows();
    this.closeAddTaskPanel();
    this.taskForm.patchValue({ taskName: '' });
    this.selectedAssignees.clear();
  }

  openAttachmentModal(taskId: number): void {
    const task = this.taskRecords.find(t => t.id === taskId);
    if (!task) return;

    const ref = this.modalService.open(PmTaskAttachmentModalComponent, { size: 'md' });
    ref.componentInstance.task = task;
    ref.componentInstance.initialAttachments = task.attachments ? [...task.attachments] : [];

    ref.result.then((updatedAttachments: PmTaskAttachment[]) => {
      task.attachments = updatedAttachments;
      this.persistTaskState();
      this.rebuildTreeRows();
    }).catch(() => { /* dismissed — no save */ });
  }

  openCommentModal(taskId: number): void {
    const task = this.taskRecords.find(t => t.id === taskId);
    if (!task) return;

    const ref = this.modalService.open(PmTaskCommentModalComponent, { size: 'md' });
    ref.componentInstance.task = task;
    ref.componentInstance.initialComments = task.comments ? [...task.comments] : [];

    ref.result.then((updatedComments: PmTaskComment[]) => {
      task.comments = updatedComments;
      this.persistTaskState();
      this.rebuildTreeRows();
    }).catch(() => { /* dismissed — no save */ });
  }

  private applyGateContext(gateContext: string, gate: number): void {
    const selectedGate = this.resolveGateByContext(gateContext, gate);
    const hasExplicitGateSelection = /^gate[1-6]$/.test(gateContext) || (gate >= 1 && gate <= 6);

    if (gateContext === 'gate1') {
      this.taskForm.patchValue({
        gate: selectedGate,
        groupName: 'PM',
        subGroupName: 'Customer Inputs',
        bucket: 'Overall',
        dependsOn: selectedGate
      });
      this.setGateFilter(selectedGate, false);
      return;
    }

    if (gateContext === 'gate2' || gateContext === 'gate3' || gateContext === 'gate4') {
      this.taskForm.patchValue({
        gate: selectedGate,
        groupName: 'Engineering',
        subGroupName: 'Backlog',
        bucket: 'Engineering',
        dependsOn: selectedGate
      });
      this.moveTargetGroup = 'Engineering';
      this.moveTargetSubGroup = 'Backlog';
      this.setGateFilter(selectedGate, false);
      return;
    }

    if (gateContext === 'gate5' || gateContext === 'gate6') {
      this.taskForm.patchValue({
        gate: selectedGate,
        groupName: 'Quality',
        subGroupName: 'QA',
        bucket: 'Validation',
        dependsOn: selectedGate
      });
      this.moveTargetGroup = 'Quality';
      this.moveTargetSubGroup = 'QA';
      this.setGateFilter(selectedGate, false);
      return;
    }

    this.setGateFilter(hasExplicitGateSelection ? selectedGate : 'All', false);
  }

  setGateFilter(gate: TaskGateFilter, syncParams = true): void {
    this.activeGateFilter = gate;
    this.gateContextLabel = gate === 'All' ? 'All Gates' : `Gate ${gate.replace('G', '')}`;
    if (syncParams) {
      this.syncFilterQueryParams();
    }
    this.rebuildTreeRows();
  }

  onGateFilterChange(value: string): void {
    const normalized = value === 'All' ? 'All' : (value as TaskGate);
    this.setGateFilter(normalized);
  }

  setQuickFilter(value: string): void {
    this.quickFilterText = String(value || '');
    this.gridApi?.setGridOption('quickFilterText', this.quickFilterText);
    this.syncFilterQueryParams();
  }

  private resolveGateByContext(gateContext: string, gate: number): TaskGate {
    if (gateContext === 'gate1') {
      return 'G1';
    }

    if (gateContext === 'gate2') { return 'G2'; }
    if (gateContext === 'gate3') { return 'G3'; }
    if (gateContext === 'gate4') { return 'G4'; }
    if (gateContext === 'gate5') { return 'G5'; }
    if (gateContext === 'gate6') { return 'G6'; }

    if (gate >= 1 && gate <= 6) {
      return `G${gate}` as TaskGate;
    }

    return 'G4';
  }

  private parseBooleanParam(value: string | null): boolean {
    return value === '1' || String(value || '').toLowerCase() === 'true';
  }

  private syncFilterQueryParams(): void {
    if (this.suppressFilterParamSync) {
      return;
    }

    const url = this.router.url.split('?')[0];
    this.router.navigate([url], {
      queryParams: {
        person: this.filterPerson || null,
        status: this.filterStatus || null,
        hideDone: this.hideDone ? '1' : null,
        gateFilter: this.activeGateFilter !== 'All' ? this.activeGateFilter : null,
        q: this.quickFilterText.trim() || null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  createEngineeringTasksForPeople(): void {
    if (!this.selectedPeople.size) {
      return;
    }

    const value = this.taskForm.getRawValue();
    const baseTaskName = value.taskName?.trim() || 'Engineering task';
    const startDate = value.startDate || '2026-03-12';
    const finishDate = value.finishDate || '2026-03-18';
    const durationDays = this.calculateDuration(startDate, finishDate);

    const bulkTasks: PmTaskRecord[] = Array.from(this.selectedPeople).map(person => ({
      id: this.nextId++,
      gate: (value.gate || 'G4') as TaskGate,
      groupName: 'Engineering',
      subGroupName: 'Involved People',
      taskName: `${baseTaskName} - ${person}`,
      project: value.project || 'VWL-035XX-XXX',
      assignedTo: [person],
      durationDays,
      startDate,
      finishDate,
      dependsOn: value.dependsOn || 'Engineering Input',
      bucket: 'Engineering',
      status: 'Open',
      completion: 0,
      source: 'bulk-engineering'
    }));

    this.ensureSubgroup('Engineering', 'Involved People');
    this.taskRecords = [...bulkTasks, ...this.taskRecords];
    this.persistTaskState();
    this.rebuildTreeRows();
  }

  createSubgroup(): void {
    const group = this.newSubGroupGroup.trim();
    const subgroup = this.newSubGroupName.trim();
    if (!group || !subgroup) {
      return;
    }

    this.ensureSubgroup(group, subgroup);
    this.moveTargetGroup = group;
    this.moveTargetSubGroup = subgroup;
    this.newSubGroupName = '';
    this.persistTaskState();
    this.rebuildTreeRows();
  }

  moveSelectedToSubgroup(): void {
    if (!this.gridApi) {
      return;
    }

    const targetGroup = this.moveTargetGroup.trim();
    const targetSubgroup = this.moveTargetSubGroup.trim();
    if (!targetGroup || !targetSubgroup) {
      return;
    }

    const selectedTaskRows = this.gridApi.getSelectedNodes()
      .map(node => node.data)
      .filter((row): row is PmTreeRow => !!row && row.rowType === 'task' && row.taskId !== null);

    if (!selectedTaskRows.length) {
      return;
    }

    this.ensureSubgroup(targetGroup, targetSubgroup);
    const idSet = new Set(selectedTaskRows.map(row => row.taskId));

    this.taskRecords = this.taskRecords.map(task => {
      if (!idSet.has(task.id)) {
        return task;
      }
      return { ...task, groupName: targetGroup, subGroupName: targetSubgroup };
    });

    this.persistTaskState();
    this.rebuildTreeRows();
  }

  archiveSelectedTasks(): void {
    const targetTaskIds = this.getTargetTaskIds();
    if (!targetTaskIds.size) {
      this.actionMessageType = 'warning';
      this.actionMessage = 'Select or click a task first before archiving.';
      return;
    }

    this.taskRecords = this.taskRecords.map(task => {
      if (!targetTaskIds.has(task.id)) {
        return task;
      }

      return {
        ...task,
        status: 'Locked',
        completion: 100
      };
    });

    this.persistTaskState();
    this.rebuildTreeRows();
    this.actionMessageType = 'success';
    this.actionMessage = `Archived ${targetTaskIds.size} task(s) as Locked.`;
  }

  markSelectedComplete(): void {
    const selectedTaskIds = this.getSelectedTaskIds();
    if (!selectedTaskIds.size) {
      this.actionMessageType = 'warning';
      this.actionMessage = 'Check at least one task before marking complete.';
      return;
    }

    this.taskRecords = this.taskRecords.map(task => {
      if (!selectedTaskIds.has(task.id)) {
        return task;
      }

      return {
        ...task,
        status: 'Completed',
        completion: 100,
      };
    });

    this.persistTaskState();
    this.rebuildTreeRows();
    this.actionMessageType = 'success';
    this.actionMessage = `Marked ${selectedTaskIds.size} task(s) as Completed.`;
  }

  deleteSelectedTasks(): void {
    const targetTaskIds = this.getTargetTaskIds();
    if (!targetTaskIds.size) {
      this.actionMessageType = 'warning';
      this.actionMessage = 'Select or click a task first before deleting.';
      return;
    }

    const confirmed = window.confirm(`Delete ${targetTaskIds.size} task(s)? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    this.taskRecords = this.taskRecords.filter(task => !targetTaskIds.has(task.id));
    this.persistTaskState();
    this.rebuildTreeRows();
    this.actionMessageType = 'success';
    this.actionMessage = `Deleted ${targetTaskIds.size} task(s).`;
  }

  get selectedTaskCount(): number {
    return this.getSelectedTaskIds().size;
  }

  private getSelectedTaskIds(): Set<number> {
    if (!this.gridApi) {
      return new Set<number>();
    }

    const selectedTaskRows = this.gridApi.getSelectedNodes()
      .map(node => node.data)
      .filter((row): row is PmTreeRow => !!row && row.rowType === 'task' && row.taskId !== null);

    return new Set(selectedTaskRows.map(row => row.taskId as number));
  }

  private getTargetTaskIds(): Set<number> {
    const selected = this.getSelectedTaskIds();
    if (selected.size) {
      return selected;
    }

    if (!this.gridApi) {
      return selected;
    }

    const focused = this.gridApi.getFocusedCell();
    if (focused?.rowIndex === undefined || focused.rowIndex === null) {
      return selected;
    }

    const node = this.gridApi.getDisplayedRowAtIndex(focused.rowIndex);
    const row = node?.data;
    if (row && row.rowType === 'task' && row.taskId !== null) {
      return new Set<number>([row.taskId]);
    }

    if (this.lastInteractedTaskId !== null && this.taskRecords.some(task => task.id === this.lastInteractedTaskId)) {
      return new Set<number>([this.lastInteractedTaskId]);
    }

    return selected;
  }

  private handleCellValueChanged(event: CellValueChangedEvent<PmTreeRow>): void {
    const row = event.data;
    if (!row || row.rowType !== 'task' || row.taskId === null || !event.colDef.field) {
      return;
    }

    const task = this.taskRecords.find(item => item.id === row.taskId);
    if (!task) {
      return;
    }

    const field = event.colDef.field;
    if (field === 'assignedTo') {
      task.assignedTo = (row.assignedTo as string).split(',').map(s => s.trim()).filter(Boolean);
    } else {
      (task as any)[field] = (row as any)[field];
    }

    if (field === 'startDate' || field === 'finishDate') {
      task.durationDays = this.calculateDuration(task.startDate, task.finishDate);
    }

    if (field === 'completion') {
      const normalized = Number(task.completion);
      task.completion = Number.isNaN(normalized) ? 0 : Math.max(0, Math.min(100, normalized));
      if (task.completion >= 100) {
        task.status = 'Completed';
      } else if (task.completion > 0 && task.status === 'Open') {
        task.status = 'In Process';
      }
    }

    if (field === 'status') {
      const oldStatus = String(event.oldValue || '');
      const newStatus = task.status;

      if ((newStatus === 'Completed' || newStatus === 'Locked') && task.completion < 100) {
        task.completion = 100;
      }

      if ((oldStatus === 'Completed' || oldStatus === 'Locked') && newStatus !== 'Completed' && newStatus !== 'Locked') {
        task.completion = this.defaultCompletionByStatus(newStatus);
      }
    }

    this.persistTaskState();
    this.rebuildTreeRows();
  }

  private defaultCompletionByStatus(status: TaskStatus): number {
    const defaults: Record<TaskStatus, number> = {
      Open: 0,
      'In Process': 50,
      Review: 75,
      Completed: 100,
      Locked: 100
    };

    return defaults[status] ?? 0;
  }

  private handleRowDragEnd(event: RowDragEndEvent<PmTreeRow>): void {
    const dragRow = event.node?.data;
    if (!dragRow) {
      return;
    }

    const target = this.resolveTreeDropTarget(event.overNode as IRowNode<PmTreeRow> | undefined);
    if (!target) {
      return;
    }

    if (dragRow.rowType === 'task' && dragRow.taskId !== null) {
      this.moveTasksByIds(new Set([dragRow.taskId]), target.groupName, target.subGroupName);
      return;
    }

    if (dragRow.rowType === 'subgroup') {
      const moved = this.taskRecords
        .filter(task => task.groupName === dragRow.groupName && task.subGroupName === dragRow.subGroupName)
        .map(task => task.id);
      this.moveTasksByIds(new Set(moved), target.groupName, target.subGroupName);
      return;
    }

    if (dragRow.rowType === 'group') {
      const sourceGroup = dragRow.groupName;
      this.taskRecords = this.taskRecords.map(task => {
        if (task.groupName !== sourceGroup) {
          return task;
        }
        this.ensureSubgroup(target.groupName, task.subGroupName);
        return { ...task, groupName: target.groupName };
      });
      this.persistTaskState();
      this.rebuildTreeRows();
    }
  }

  private moveTasksByIds(taskIds: Set<number>, targetGroup: string, targetSubgroup: string): void {
    if (!taskIds.size) {
      return;
    }

    this.ensureSubgroup(targetGroup, targetSubgroup);
    this.taskRecords = this.taskRecords.map(task => {
      if (!taskIds.has(task.id)) {
        return task;
      }
      return { ...task, groupName: targetGroup, subGroupName: targetSubgroup };
    });
    this.persistTaskState();
    this.rebuildTreeRows();
  }

  private initializeTaskState(projectId: string): void {
    const normalizedProjectId = String(projectId || '').trim();

    if (!normalizedProjectId) {
      this.nextId = 1;
      this.taskRecords = [];
      this.subgroupCatalog = {};
      this.seedSubgroupCatalog();
      return;
    }

    this.tasksDataService.loadState$(normalizedProjectId).subscribe(state => {
      if (this.activeProjectId !== normalizedProjectId) {
        return;
      }

      this.nextId = state.nextId;
      this.taskRecords = state.taskRecords;

      const catalog: Record<string, Set<string>> = {};
      Object.keys(state.subgroupCatalog).forEach(group => {
        catalog[group] = new Set(state.subgroupCatalog[group]);
      });
      this.subgroupCatalog = catalog;
      this.seedSubgroupCatalog();
      this.rebuildTreeRows();
    });
  }

  private persistTaskState(): void {
    const subgroupCatalog: Record<string, string[]> = {};
    Object.keys(this.subgroupCatalog).forEach(group => {
      subgroupCatalog[group] = Array.from(this.subgroupCatalog[group]);
    });

    this.tasksDataService.saveState({
      nextId: this.nextId,
      taskRecords: this.taskRecords,
      subgroupCatalog
    }, this.activeProjectId);
  }

  private patchDefaultProjectFromSelection(): void {
    const projects = this.projectsService.getProjects();
    const selectedId = this.projectsService.getSelectedProjectId(projects);
    const selected = projects.find(project => project.id === selectedId);
    if (!selected) {
      return;
    }

    this.taskForm.patchValue({
      project: selected.code || selected.name
    });
  }

  private applyProjectContext(requestedProjectId: string): void {
    const projects = this.projectsService.getProjects();
    const hasRequested = !!requestedProjectId && projects.some(project => project.id === requestedProjectId);

    if (hasRequested) {
      this.projectsService.setSelectedProjectId(requestedProjectId);
    }

    let resolvedProjectId = hasRequested
      ? requestedProjectId
      : this.projectsService.getSelectedProjectId(projects);

    const hasResolved = !!resolvedProjectId && projects.some(project => project.id === resolvedProjectId);
    if (!hasResolved) {
      resolvedProjectId = '';
    }

    this.currentProjectSummary = projects.find(project => project.id === resolvedProjectId) || null;

    if (resolvedProjectId) {
      this.projectsService.setSelectedProjectId(resolvedProjectId);
    }

    if (resolvedProjectId === this.activeProjectId) {
      return;
    }

    this.activeProjectId = resolvedProjectId;
    this.initializeTaskState(this.activeProjectId);
    this.patchDefaultProjectFromSelection();

    if (!hasRequested && requestedProjectId) {
      this.taskForm.patchValue({ project: requestedProjectId });
    }

    this.rebuildTreeRows();
  }

  private getActiveProjectId(): string {
    if (this.activeProjectId) {
      return this.activeProjectId;
    }

    const projects = this.projectsService.getProjects();
    return this.projectsService.getSelectedProjectId(projects);
  }

  private resolveTreeDropTarget(overNode?: IRowNode<PmTreeRow>): { groupName: string; subGroupName: string } | null {
    if (!overNode) {
      return null;
    }

    if (overNode.group) {
      const route = this.getNodeGroupRoute(overNode);
      const groupName = route[0] || '';
      const subGroupName = route.slice(1).join('/');
      if (!groupName) {
        return null;
      }
      return { groupName, subGroupName };
    }

    if (!overNode.data) {
      return null;
    }

    const over = overNode.data;
    if (over.rowType === 'add-item') return null;
    if (over.rowType === 'task') {
      return { groupName: over.groupName, subGroupName: over.subGroupName };
    }

    if (over.rowType === 'subgroup') {
      return { groupName: over.groupName, subGroupName: over.subGroupName };
    }

    if (over.rowType === 'group') {
      const defaultSubgroup = 'Backlog';
      this.ensureSubgroup(over.groupName, defaultSubgroup);
      return { groupName: over.groupName, subGroupName: defaultSubgroup };
    }

    return null;
  }

  getInitials(person: string): string {
    return person.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  /** Display label for a slash-path subgroup in dropdowns, indented by depth */
  getSubgroupDisplayLabel(path: string): string {
    const segs = path.split('/');
    const indent = '    '.repeat(segs.length - 1);
    return `${indent}${segs[segs.length - 1]}`;
  }

  private getGroupColor(groupName: string): string {
    if (!this.groupColorMap.has(groupName)) {
      this.groupColorMap.set(groupName, GROUP_PALETTE[this.groupColorIndex % GROUP_PALETTE.length]);
      this.groupColorIndex++;
    }
    return this.groupColorMap.get(groupName)!;
  }

  private rebuildTreeRows(): void {
    const expanded = this.captureExpandedState();
    this.seedSubgroupCatalog();

    const rows: PmTreeRow[] = [];
    rows.push({
      rowId: 'add-item__root',
      path: [],
      rowType: 'add-item',
      label: '+ Add New Task',
      groupName: '',
      subGroupName: '',
      taskId: null,
      gate: '',
      taskName: '+ Add New Task',
      project: '',
      assignedTo: '',
      durationDays: null,
      startDate: '',
      finishDate: '',
      dependsOn: '',
      bucket: '',
      status: '',
      completion: null,
      source: '',
      _groupColor: '#888888'
    });

    let groupedTasks = this.taskRecords.filter(t => !!String(t.groupName || '').trim());
    if (this.hideDone) groupedTasks = groupedTasks.filter(t => t.status !== 'Completed');
    if (this.filterPerson) groupedTasks = groupedTasks.filter(t => t.assignedTo.includes(this.filterPerson));
    if (this.filterStatus) groupedTasks = groupedTasks.filter(t => t.status === this.filterStatus);
    if (this.activeGateFilter !== 'All') groupedTasks = groupedTasks.filter(t => t.gate === this.activeGateFilter);

    groupedTasks.forEach(task => {
      const groupColor = this.getGroupColor(task.groupName || 'Ungrouped');
      const projectLabel = String(task.project || '').trim()
        || String(this.currentProjectSummary?.code || '').trim()
        || String(this.currentProjectSummary?.name || '').trim()
        || String(this.activeProjectId || '').trim();
      rows.push({
        rowId: this.toTaskRowId(task.id),
        path: [],
        rowType: 'task',
        label: task.taskName,
        groupName: task.groupName,
        subGroupName: task.subGroupName || '',
        taskId: task.id,
        gate: task.gate,
        taskName: task.taskName,
        project: projectLabel,
        assignedTo: task.assignedTo.join(', '),
        durationDays: task.durationDays,
        startDate: task.startDate,
        finishDate: task.finishDate,
        dependsOn: task.dependsOn,
        bucket: task.bucket,
        status: task.status,
        completion: task.completion,
        source: task.source,
        _groupColor: groupColor,
        _commentCount: task.comments?.length ?? 0
      } as PmTreeRow & { _commentCount: number });
    });

    const visibleGroups = Array.from(new Set(groupedTasks.map(task => task.groupName).filter(Boolean)));
    visibleGroups.forEach(groupName => {
      const groupColor = this.getGroupColor(groupName || 'Ungrouped');

      rows.push({
        rowId: `add-item__${groupName}__root`,
        path: [],
        rowType: 'add-item',
        label: `+ Add New Task to ${groupName}`,
        groupName,
        subGroupName: '',
        taskId: null,
        gate: '',
        taskName: `+ Add New Task to ${groupName}`,
        project: '',
        assignedTo: '',
        durationDays: null,
        startDate: '',
        finishDate: '',
        dependsOn: '',
        bucket: '',
        status: '',
        completion: null,
        source: '',
        _groupColor: groupColor
      });

      const explicitPaths = Array.from(this.subgroupCatalog[groupName] || []).filter(path => !!String(path || '').trim());
      explicitPaths.forEach(subGroupPath => {
        rows.push({
          rowId: `add-item__${groupName}__${subGroupPath}`,
          path: [],
          rowType: 'add-item',
          label: `+ Add New Task to ${groupName} / ${subGroupPath}`,
          groupName,
          subGroupName: subGroupPath,
          taskId: null,
          gate: '',
          taskName: `+ Add New Task to ${groupName} / ${subGroupPath}`,
          project: '',
          assignedTo: '',
          durationDays: null,
          startDate: '',
          finishDate: '',
          dependsOn: '',
          bucket: '',
          status: '',
          completion: null,
          source: '',
          _groupColor: groupColor
        });
      });
    });

    // ungrouped tasks — rendered as flat top-level rows
    let ungroupedTasks = this.taskRecords.filter(t => !t.groupName);
    if (this.hideDone) ungroupedTasks = ungroupedTasks.filter(t => t.status !== 'Completed');
    if (this.filterPerson) ungroupedTasks = ungroupedTasks.filter(t => t.assignedTo.includes(this.filterPerson));
    if (this.filterStatus) ungroupedTasks = ungroupedTasks.filter(t => t.status === this.filterStatus);
    if (this.activeGateFilter !== 'All') ungroupedTasks = ungroupedTasks.filter(t => t.gate === this.activeGateFilter);

    ungroupedTasks.forEach(task => {
      const projectLabel = String(task.project || '').trim()
        || String(this.currentProjectSummary?.code || '').trim()
        || String(this.currentProjectSummary?.name || '').trim()
        || String(this.activeProjectId || '').trim();
      rows.push({
        rowId: this.toTaskRowId(task.id),
        path: [`${task.taskName} [${task.id}]`],
        rowType: 'task',
        label: task.taskName,
        groupName: '',
        subGroupName: '',
        taskId: task.id,
        gate: task.gate,
        taskName: task.taskName,
        project: projectLabel,
        assignedTo: task.assignedTo.join(', '),
        durationDays: task.durationDays,
        startDate: task.startDate,
        finishDate: task.finishDate,
        dependsOn: task.dependsOn,
        bucket: task.bucket,
        status: task.status,
        completion: task.completion,
        source: task.source,
        _groupColor: '#888888',
        _commentCount: task.comments?.length ?? 0
      } as PmTreeRow & { _commentCount: number });
    });

    this.rowData = rows;
    this.gridApi?.setGridOption('rowData', rows);

    setTimeout(() => {
      this.restoreExpandedState(expanded);
    }, 0);
  }

  private captureExpandedState(): Set<string> {
    const expanded = new Set<string>();
    if (!this.gridApi) {
      return expanded;
    }

    this.gridApi.forEachNode(node => {
      if (node.expanded) {
        const key = this.getExpansionKey(node);
        if (key) {
          expanded.add(key);
        }
      }
    });

    return expanded;
  }

  private restoreExpandedState(expanded: Set<string>): void {
    if (!this.gridApi || !expanded.size) {
      return;
    }

    this.gridApi.forEachNode(node => {
      const key = this.getExpansionKey(node);
      if (key && expanded.has(key)) {
        node.setExpanded(true);
      }
    });
  }

  private getNodeGroupRoute(node: IRowNode<PmTreeRow>): string[] {
    const route: string[] = [];
    let cursor: IRowNode<PmTreeRow> | null = node;

    while (cursor && cursor.level >= 0) {
      if (cursor.group) {
        const key = String(cursor.key || '').trim();
        if (key) {
          route.unshift(key);
        }
      }
      cursor = cursor.parent;
    }

    return route;
  }

  private getExpansionKey(node: IRowNode<PmTreeRow>): string | null {
    if (node.group) {
      const route = this.getNodeGroupRoute(node);
      return route.length ? `group__${route.join('__')}` : null;
    }

    return node.data?.rowType !== 'task' ? node.data?.rowId ?? null : null;
  }

  private seedSubgroupCatalog(): void {
    const catalog: Record<string, Set<string>> = {};
    this.taskRecords.forEach(task => {
      if (!task.groupName) return; // ungrouped tasks — not in catalog
      if (!catalog[task.groupName]) {
        catalog[task.groupName] = new Set<string>();
      }
      if (String(task.subGroupName || '').trim()) {
        catalog[task.groupName].add(task.subGroupName);
      }
    });

    // Keep manually created empty subgroups.
    Object.keys(this.subgroupCatalog).forEach(group => {
      if (!catalog[group]) {
        catalog[group] = new Set<string>();
      }
      this.subgroupCatalog[group].forEach(sub => catalog[group].add(sub));
    });

    this.subgroupCatalog = catalog;
  }

  private ensureSubgroup(group: string, subgroup: string): void {
    if (!this.subgroupCatalog[group]) {
      this.subgroupCatalog[group] = new Set<string>();
    }
    // Register the path and every ancestor so the tree is consistent
    const segs = subgroup.split('/');
    segs.forEach((_, i) => {
      this.subgroupCatalog[group].add(segs.slice(0, i + 1).join('/'));
    });
  }

  private computeDateRange(tasks: PmTaskRecord[]): { startDate: string; finishDate: string; durationDays: number | null } {
    if (!tasks.length) {
      return { startDate: '', finishDate: '', durationDays: null };
    }

    const starts = tasks.map(task => task.startDate).filter(Boolean).sort();
    const finishes = tasks.map(task => task.finishDate).filter(Boolean).sort();

    const startDate = starts[0] || '';
    const finishDate = finishes[finishes.length - 1] || '';
    const durationDays = startDate && finishDate ? this.calculateDuration(startDate, finishDate) : null;
    return { startDate, finishDate, durationDays };
  }

  private calculateDuration(startDate: string, finishDate: string): number {
    const start = new Date(startDate);
    const finish = new Date(finishDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(finish.getTime())) {
      return 0;
    }

    const ms = finish.getTime() - start.getTime();
    return Math.max(1, Math.ceil(ms / 86400000));
  }

  private normalizeDateMs(value: unknown): number | null {
    const raw = String(value || '').trim();
    if (!raw) {
      return null;
    }

    const ms = Date.parse(raw);
    if (Number.isNaN(ms)) {
      return null;
    }

    return ms;
  }

  private toIsoDate(valueMs: number): string {
    return new Date(valueMs).toISOString().slice(0, 10);
  }

  private aggregateMinDate(values: unknown[]): string {
    if (!Array.isArray(values) || !values.length) {
      return '';
    }

    let min: number | null = null;
    values.forEach((value) => {
      const ms = this.normalizeDateMs(value);
      if (ms === null) {
        return;
      }
      if (min === null || ms < min) {
        min = ms;
      }
    });

    return min === null ? '' : this.toIsoDate(min);
  }

  private aggregateMaxDate(values: unknown[]): string {
    if (!Array.isArray(values) || !values.length) {
      return '';
    }

    let max: number | null = null;
    values.forEach((value) => {
      const ms = this.normalizeDateMs(value);
      if (ms === null) {
        return;
      }
      if (max === null || ms > max) {
        max = ms;
      }
    });

    return max === null ? '' : this.toIsoDate(max);
  }

  private aggregateDurationSpan(params: any): number | null {
    const leaves = params?.rowNode?.allLeafChildren || [];
    let minStart: number | null = null;
    let maxFinish: number | null = null;

    leaves.forEach((leaf: any) => {
      const row = leaf?.data as PmTreeRow | undefined;
      if (!row || row.rowType !== 'task') {
        return;
      }

      const startMs = this.normalizeDateMs(row.startDate);
      const finishMs = this.normalizeDateMs(row.finishDate);

      if (startMs !== null && (minStart === null || startMs < minStart)) {
        minStart = startMs;
      }

      if (finishMs !== null && (maxFinish === null || finishMs > maxFinish)) {
        maxFinish = finishMs;
      }
    });

    if (minStart === null || maxFinish === null || maxFinish < minStart) {
      return null;
    }

    return Math.max(1, Math.ceil((maxFinish - minStart) / 86400000) + 1);
  }

  private aggregateCompletionPercent(params: any): number | null {
    const leaves = params?.rowNode?.allLeafChildren || [];
    let total = 0;
    let count = 0;

    leaves.forEach((leaf: any) => {
      const row = leaf?.data as PmTreeRow | undefined;
      if (!row || row.rowType !== 'task') {
        return;
      }

      const value = Number(row.completion);
      const normalized = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
      total += normalized;
      count += 1;
    });

    if (!count) {
      return null;
    }

    return Math.round(total / count);
  }

  private getAssigneeOptions(): string[] {
    const set = new Set<string>();

    this.assigneeDirectory.forEach((name) => {
      const normalized = String(name || '').trim();
      if (normalized) {
        set.add(normalized);
      }
    });

    this.taskRecords.forEach((task) => {
      (task.assignedTo || []).forEach((name) => {
        const normalized = String(name || '').trim();
        if (normalized) {
          set.add(normalized);
        }
      });
    });

    this.allProjects.forEach((project) => {
      const owner = String((project as any).owner || '').trim();
      if (owner) {
        set.add(owner);
      }
    });

    this.selectedAssignees.forEach((name) => {
      const normalized = String(name || '').trim();
      if (normalized) {
        set.add(normalized);
      }
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  private loadAssigneeDirectory(): void {
    this.accessControlApi.getUsers()
      .then((users) => {
        const names = users
          .map((user) => String(user?.name || '').trim())
          .filter(Boolean);
        this.assigneeDirectory = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
      })
      .catch(() => {
        this.assigneeDirectory = [];
      });
  }

  private toGroupRowId(groupName: string): string {
    return `g|${groupName}`;
  }

  private toSubgroupRowId(groupName: string, subgroupName: string): string {
    return `s|${groupName}|${subgroupName}`;
  }

  private toTaskRowId(taskId: number): string {
    return `t|${taskId}`;
  }
}
