import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { AccessControlApiService } from '@app/core/api/access-control/access-control.service';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { CommentsService } from '@app/core/api/comments/comments.service';
import { FeatureType } from '@app/shared/enums/feature.enum';
import { CommentOffcanvasComponent } from '@app/shared/components/comment-offcanvas/comment-offcanvas.component';
import { AgGridModule } from 'ag-grid-angular';
import { CellValueChangedEvent, ColDef, GridApi, GridOptions, GridReadyEvent, IRowNode, RowDragEndEvent, RowSelectedEvent } from 'ag-grid-community';
import { PmTaskRecord, ProjectManagerTasksDataService, ProjectManagerTasksState, TaskGate, TaskStatus } from './services/project-manager-tasks-data.service';
import { ProjectDashboardItem, ProjectManagerProjectsService } from './services/project-manager-projects.service';
import { PmTaskAttachmentModalComponent } from './pm-task-attachment-modal.component';
import { PmTaskActionsRendererComponent } from './pm-task-actions-renderer.component';
import { PmDateCellEditorComponent } from './pm-date-cell-editor.component';

type TaskGateFilter = 'All' | TaskGate;

type RowType = 'group' | 'subgroup' | 'task' | 'add-item';

const GROUP_PALETTE = [
  '#0073ea', '#e2445c', '#037f4c', '#ff642e', '#9c27b0',
  '#00c875', '#0f3d78', '#ff7575', '#fdab3d', '#66ccff'
];

const DEFAULT_PROJECT_TASK_TEMPLATES = [
  'DFM completed / checkbox',
  'Pixel Mapping / software files',
  'Installation Instructions',
  'Work Instruction',
  'PDC',
  'Quality Documents',
];

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
  _commentCount?: number;
  _attachmentCount?: number;
}

@Component({
  standalone: true,
  selector: 'app-project-manager-tasks',
  imports: [SharedModule, ReactiveFormsModule, AgGridModule, CommentOffcanvasComponent, PmTaskActionsRendererComponent],
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
  @ViewChild('moveProjectModal') moveProjectModalTpl!: TemplateRef<any>;
  private activeModalRef: any = null;
  private pendingMoveTaskIds: Set<number> = new Set<number>();
  pendingMoveTaskCount = 0;
  moveTargetProjectId = '';
  copyKeepOriginalStatus = false;

  hideDone = false;
  filterPerson = '';
  filterStatus = '';
  quickFilterText = '';
  allProjects: ProjectDashboardItem[] = [];
  projectDropdownSelectedId = '';
  private suppressFilterParamSync = false;
  private groupColorMap = new Map<string, string>();
  private groupColorIndex = 0;
  private subgroupCatalog: Record<string, Set<string>> = {};
  private readonly singleClickDropdownCols = new Set(['gate', 'status', 'startDate', 'finishDate']);
  private lastInteractedTaskId: number | null = null;
  private requestedTaskBoardFromQuery = '';
  actionMessage = '';
  actionMessageType: 'success' | 'warning' = 'success';
  currentProjectSummary: ProjectDashboardItem | null = null;
  readonly attachmentFeature = FeatureType.PROJECT_MANAGER_TASK;
  readonly commentType = 'Project Manager Task';
  private taskAttachmentCountMap = new Map<number, number>();
  private taskCommentCountMap = new Map<number, number>();
  isCommentPanelOpen = false;
  selectedCommentOrderNum: string | null = null;
  selectedCommentTaskId: number | null = null;
  focusedCommentId: number | null = null;
  commentViewMode: 'offcanvas' | 'modal' = 'offcanvas';
  commentPanelWidth = 420;
  private pendingDeepLinkTaskId: number | null = null;

  get commentPanelPushWidth(): number {
    if (!this.isCommentPanelOpen || window.innerWidth <= 991.98) {
      return 0;
    }

    return this.commentPanelWidth;
  }

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
  selectedAssignee = '';
  private assigneeDirectory: string[] = [];
  projectTaskBoardName = 'Project Tasks';
  projectTaskBoardNameDraft = 'Project Tasks';
  taskBoardNames: string[] = ['Project Tasks'];
  newTaskBoardName = '';
  showTaskBoardCreator = false;
  defaultTaskTemplates: string[] = [...DEFAULT_PROJECT_TASK_TEMPLATES];
  defaultTaskTemplateDraft: string[] = [...DEFAULT_PROJECT_TASK_TEMPLATES];
  newDefaultTaskTemplateName = '';

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
        return this.getActiveBoardTasks().filter((t) => taskIds.has(t.id));
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
        return this.getActiveBoardTasks().filter((t) => t.groupName === groupName);
      }

      return this.getActiveBoardTasks().filter(
        (t) => t.groupName === groupName && (t.subGroupName === subgroupPath || t.subGroupName.startsWith(`${subgroupPath}/`)),
      );
    }

    if (!row) return [];

    if (row.rowType === 'task' && row.taskId !== null) {
      const task = this.taskRecords.find((t) => t.id === row.taskId);
      return task ? [task] : [];
    }

    if (row.rowType === 'group') {
      return this.getActiveBoardTasks().filter((t) => t.groupName === row.groupName);
    }

    if (row.rowType === 'subgroup') {
      const subgroupPath = String(row.subGroupName || '').trim();
      if (!subgroupPath) return [];
      return this.getActiveBoardTasks().filter((t) => t.groupName === row.groupName && (t.subGroupName === subgroupPath || t.subGroupName.startsWith(`${subgroupPath}/`)));
    }

    if (row.rowType === 'add-item') {
      const subgroupPath = String(row.subGroupName || '').trim();
      if (!row.groupName) return [];
      if (!subgroupPath) {
        return this.getActiveBoardTasks().filter((t) => t.groupName === row.groupName);
      }
      return this.getActiveBoardTasks().filter((t) => t.groupName === row.groupName && (t.subGroupName === subgroupPath || t.subGroupName.startsWith(`${subgroupPath}/`)));
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

  onAssigneeSelect(person: string): void {
    this.selectedAssignee = String(person || '').trim();
    this.selectedAssignees.clear();
    if (this.selectedAssignee) {
      this.selectedAssignees.add(this.selectedAssignee);
    }
  }

  taskForm = this.fb.group({
    projectTaskName: ['Project Tasks'],
    gate: ['' as TaskGate | ''],
    groupName: [''],
    subGroupName: [''],
    project: ['', Validators.required],
    taskName: ['', [Validators.required, Validators.maxLength(140)]],
    startDate: [''],
    finishDate: [''],
    bucket: ['Overall'],
    status: ['Open' as TaskStatus],
    completion: [0]
  });

  private taskRecords: PmTaskRecord[] = [];

  rowData: PmTreeRow[] = [];

  defaultColDef: ColDef<PmTreeRow> = {
    sortable: true,
    resizable: true,
    filter: true,
  };

  columnDefs: ColDef<PmTreeRow>[] = [
    { field: 'groupName', rowGroup: true, hide: true },
    { field: 'subGroupName', rowGroup: true, hide: true },
    // {
    //   headerName: '',
    //   colId: 'dragHandle',
    //   width: 34,
    //   pinned: 'right',
    //   rowDrag: params => !!params.data && (params.data.rowType === 'group' || params.data.rowType === 'subgroup' || params.data.rowType === 'task'),
    //   cellRenderer: 'agRowDragCellRenderer',
    //   sortable: false,
    //   filter: false,
    //   resizable: false,
    //   suppressMovable: true,
    //   valueGetter: () => ''
    // },
    {
      field: 'gate',
      headerName: 'Gate',
      width: 95,
      editable: params => params.data?.rowType === 'task',
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['', ...this.gateOptions] },
      valueFormatter: (params: any) => {
        const value = String(params.value || '').trim();
        if (value) {
          return value;
        }

        const isTaskRow = params?.data?.rowType === 'task' && !params?.node?.group;
        return isTaskRow ? 'Project' : '';
      }
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
    {
      field: 'project',
      headerName: 'Project',
      minWidth: 180,
      filter: 'agTextColumnFilter',
      hide: true,
      editable: false,
    },
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
      cellEditor: PmDateCellEditorComponent,
      valueParser: (params: any) => this.normalizeDateInput(params?.newValue),
      aggFunc: (params: any) => this.aggregateMinDate(params?.values),
    },
    {
      field: 'finishDate',
      headerName: 'Finish',
      width: 120,
      editable: params => params.data?.rowType === 'task',
      cellEditor: PmDateCellEditorComponent,
      valueParser: (params: any) => this.normalizeDateInput(params?.newValue),
      aggFunc: (params: any) => this.aggregateMaxDate(params?.values),
    },
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
        const barH = 8;
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
          <span style="font-size:11px;color:var(--vz-body-color);min-width:34px;text-align:right;line-height:1;">${pct}%</span>
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
        const taskId = Number(params.data.taskId);
        const liveCount = Number.isFinite(taskId) ? this.taskCommentCountMap.get(taskId) : undefined;
        const count = liveCount ?? params.data._commentCount ?? 0;
        const label = count > 0 ? `💬 ${count}` : `💬 Add (${count})`;
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
        const taskId = Number(params.data.taskId);
        const liveCount = Number.isFinite(taskId) ? this.taskAttachmentCountMap.get(taskId) : undefined;
        const count = liveCount ?? params.data._attachmentCount ?? 0;
        const label = count > 0 ? `📎 ${count}` : `📎 Add (${count})`;
        return `<button class="btn btn-sm btn-outline-secondary py-0 px-2" style="font-size:11px">${label}</button>`;
      },
      onCellClicked: (params: any) => {
        if (!params.data || params.data.rowType !== 'task' || params.data.taskId === null) return;
        this.openAttachmentModal(params.data.taskId);
      }
    },
    {
      headerName: 'Actions',
      colId: 'rowActions',
      width: 120,
      sortable: false,
      filter: false,
      pinned: 'right',
      suppressMovable: true,
      cellRenderer: PmTaskActionsRendererComponent,
      cellRendererParams: (params: any) => ({
        onDuplicate: () => this.duplicateFromGridRow(params),
        onMoveProject: () => this.openMoveProjectFromGridRow(params),
        onArchive: () => this.archiveFromGridRow(params),
        onDelete: () => this.deleteFromGridRow(params),
        onComment: () => this.openCommentFromGridRow(params),
        onAttachment: () => this.openAttachmentFromGridRow(params),
      }),
    }
  ];

  gridOptions: GridOptions<PmTreeRow> = {
    animateRows: false,
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
      rowDrag: (params: any) => params?.data?.rowType === 'task' || params?.data?.rowType === 'subgroup' || params?.data?.rowType === 'group',
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
      const classes: string[] = [];

      if (params.node?.group && params.node.level === 0) {
        classes.push('pm-group-row');
      } else if (params.node?.group) {
        classes.push('pm-subgroup-row');
      } else if (params.data?.rowType === 'add-item') {
        classes.push('pm-add-item-row');
      }

      const rowTaskId = Number(params?.data?.taskId);
      if (params?.data?.rowType === 'task' && Number.isFinite(rowTaskId) && this.selectedCommentTaskId === rowTaskId) {
        classes.push('pm-comment-focused-row');
      }

      return classes.join(' ');
    },
    isRowSelectable: undefined,
    singleClickEdit: true,
    stopEditingWhenCellsLoseFocus: true,
    undoRedoCellEditing: true,
    undoRedoCellEditingLimit: 20,
    suppressMoveWhenRowDragging: true,
    suppressRowClickSelection: true,
    postSortRows: (params: any) => {
      this.enforceAddItemRowsAtBottom(params?.nodes || []);
    },
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
    private attachmentsService: AttachmentsService,
    private commentsService: CommentsService,
    private modalService: NgbModal
  ) {
    // Initialized from query params to keep URL and local state in sync.
  }

  ngOnInit(): void {
    this.loadAssigneeDirectory();

    this.allProjects = this.projectsService.getProjects();
    this.applyProjectContext(this.resolveProjectIdFromParams(this.route.snapshot.queryParamMap));

    this.tasksDataService.saveFallback$.subscribe((projectId) => {
      if (projectId !== this.activeProjectId) {
        return;
      }
      this.actionMessageType = 'warning';
      this.actionMessage = 'We could not save your changes right now. Please try again.';
    });

    this.projectsService.getProjects$().subscribe(projects => {
      this.allProjects = projects;
      const projectIdFromQuery = this.resolveProjectIdFromParams(this.route.snapshot.queryParamMap);
      this.applyProjectContext(projectIdFromQuery);
    });

    this.route.queryParamMap.subscribe(params => {
      const gateContext = (params.get('gateContext') || '').trim();
      const gate = Number(params.get('gate') || 0);
      const commentParam = (params.get('comment') || '').trim();
      const commentTypeParam = (params.get('type') || '').trim();
      const commentIdParam = Number(params.get('commentId') || 0);
      this.requestedTaskBoardFromQuery = String(params.get('taskBoard') || '').trim();

      const linkedTask = this.parseTaskCommentContext(commentParam);
      const projectId = this.resolveProjectIdFromParams(params);

      this.applyGateContext(gateContext, gate);
      this.applyProjectContext(projectId);

      this.suppressFilterParamSync = true;
      this.filterPerson = (params.get('person') || '').trim();
      this.filterStatus = (params.get('status') || '').trim();
      this.hideDone = this.parseBooleanParam(params.get('hideDone'));
      this.quickFilterText = (params.get('q') || '').trim();

      const gateFilterParam = (params.get('gateFilter') || '').trim();
      if (gateFilterParam === 'All' || this.gateOptions.includes(gateFilterParam as TaskGate)) {
        this.setGateFilter(gateFilterParam as TaskGateFilter, false, false);
      }
      this.suppressFilterParamSync = false;

      this.rebuildTreeRows();
      this.gridApi?.setGridOption('quickFilterText', this.quickFilterText);

      if (commentParam && (!commentTypeParam || commentTypeParam === this.commentType) && linkedTask) {
        this.commentViewMode = 'offcanvas';
        this.selectedCommentTaskId = linkedTask.taskId;
        this.selectedCommentOrderNum = commentParam;
        this.focusedCommentId = Number.isFinite(commentIdParam) && commentIdParam > 0 ? commentIdParam : null;
        this.pendingDeepLinkTaskId = linkedTask.taskId;
        this.isCommentPanelOpen = true;
      }
    });
  }

  private resolveProjectIdFromParams(params: Pick<ParamMap, 'get'>): string {
    const routeProjectId = String(params.get('projectId') || params.get('project-id') || '').trim();
    if (routeProjectId) {
      return routeProjectId;
    }

    const commentContext = String(params.get('comment') || '').trim();
    const linkedTask = this.parseTaskCommentContext(commentContext);
    return String(linkedTask?.projectId || '').trim();
  }

  get hasProject(): boolean {
    return !!this.activeProjectId;
  }

  get selectedProjectId(): string {
    return this.activeProjectId || this.currentProjectSummary?.id || '';
  }

  get projectSelectOptions(): Array<{ id: string; name: string }> {
    const options = this.allProjects
      .map((project) => ({
        id: String(project?.id || '').trim(),
        name: String(project?.name || project?.id || '').trim(),
      }))
      .filter((project) => !!project.id);

    const selectedId = String(this.selectedProjectId || '').trim();
    if (selectedId && !options.some((project) => project.id === selectedId)) {
      options.unshift({
        id: selectedId,
        name: String(this.currentProjectSummary?.name || selectedId).trim(),
      });
    }

    return options;
  }

  trackByProjectId(_: number, p: { id: string }): string {
    return p.id;
  }

  getProjectIdOptions(): string[] {
    const options = this.projectSelectOptions.map((project) => project.id).filter(Boolean);
    const currentProject = String(this.taskForm.get('project')?.value || '').trim();
    if (currentProject && !options.includes(currentProject)) {
      return [currentProject, ...options];
    }
    return options;
  }

  onProjectSelect(id: string): void {
    const normalizedId = String(id || '').trim();
    if (!normalizedId || normalizedId === this.selectedProjectId) return;
    const url = this.router.url.split('?')[0];
    this.router.navigate([url], {
      queryParams: {
        projectId: normalizedId,
        comment: null,
        commentId: null,
        type: null,
        commentViewMode: null,
      },
      queryParamsHandling: 'merge'
    });
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
    this.setGateFilter('All', false, false);
    this.syncFilterQueryParams();
    this.gridApi?.setGridOption('quickFilterText', '');
    this.rebuildTreeRows();
  }

  openAddTaskPanel(group = '', subgroup = ''): void {
    this.showManagePanel = false;
    this.showBulkPanel = false;
    const defaultGate: TaskGate | '' = this.activeGateFilter === 'All' ? '' : this.activeGateFilter;
    this.taskForm.patchValue({ gate: defaultGate, projectTaskName: this.projectTaskBoardName });
    if (group) {
      this.taskForm.patchValue({ groupName: group, subGroupName: subgroup });
    }
    this.selectedAssignee = '';
    this.selectedAssignees.clear();
    this.activeModalRef = this.modalService.open(this.addTaskModalTpl, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
      keyboard: true
    });
    this.activeModalRef.result.catch(() => {
      // dismissed — clear form
      this.taskForm.patchValue({ taskName: '' });
      this.selectedAssignee = '';
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
    this.defaultTaskTemplateDraft = [...this.defaultTaskTemplates];
    this.newDefaultTaskTemplateName = '';
    this.projectTaskBoardNameDraft = this.projectTaskBoardName;
    this.newTaskBoardName = '';
    this.activeModalRef = this.modalService.open(this.manageGroupsModalTpl, {
      size: 'md',
      centered: true
    });
  }

  onTaskBoardChange(boardName: string): void {
    const normalized = String(boardName || '').trim() || 'Project Tasks';
    this.projectTaskBoardName = normalized;
    this.projectTaskBoardNameDraft = normalized;
    this.taskForm.patchValue({ projectTaskName: normalized });
    this.syncFilterQueryParams();
    this.rebuildTreeRows();
    this.persistTaskState();
  }

  createTaskBoard(): void {
    const normalized = String(this.newTaskBoardName || '').trim();
    if (!normalized) {
      return;
    }
    if (!this.taskBoardNames.some((name) => name.toLowerCase() === normalized.toLowerCase())) {
      this.taskBoardNames = [...this.taskBoardNames, normalized];
    }
    this.newTaskBoardName = '';
    this.showTaskBoardCreator = false;
    this.onTaskBoardChange(normalized);
    this.actionMessageType = 'success';
    this.actionMessage = `Created task board ${normalized}.`;
  }

  saveProjectTaskBoardName(): void {
    const normalized = String(this.projectTaskBoardNameDraft || '').trim();
    const nextName = normalized || 'Project Tasks';
    const currentName = this.projectTaskBoardName;

    this.projectTaskBoardName = nextName;
    this.projectTaskBoardNameDraft = nextName;

    this.taskRecords = this.taskRecords.map((task) => {
      const board = String(task.projectTaskName || 'Project Tasks').trim() || 'Project Tasks';
      if (board.toLowerCase() !== currentName.toLowerCase()) {
        return task;
      }
      return { ...task, projectTaskName: nextName };
    });

    this.taskBoardNames = Array.from(new Set(
      this.taskBoardNames
        .map((name) => name.toLowerCase() === currentName.toLowerCase() ? nextName : name)
        .map((name) => String(name || '').trim())
        .filter(Boolean)
    ));
    if (!this.taskBoardNames.length) {
      this.taskBoardNames = ['Project Tasks'];
    }

    this.taskForm.patchValue({ projectTaskName: nextName });
    this.persistTaskState();
    this.rebuildTreeRows();
    this.actionMessageType = 'success';
    this.actionMessage = 'Project task board name updated.';
  }

  addDefaultTaskTemplateDraft(): void {
    const name = String(this.newDefaultTaskTemplateName || '').trim();
    if (!name) {
      return;
    }
    if (this.defaultTaskTemplateDraft.some((item) => item.toLowerCase() === name.toLowerCase())) {
      return;
    }
    this.defaultTaskTemplateDraft = [...this.defaultTaskTemplateDraft, name];
    this.newDefaultTaskTemplateName = '';
  }

  updateDefaultTaskTemplateDraft(index: number, value: string): void {
    if (index < 0 || index >= this.defaultTaskTemplateDraft.length) {
      return;
    }
    this.defaultTaskTemplateDraft[index] = String(value || '');
  }

  removeDefaultTaskTemplateDraft(index: number): void {
    if (index < 0 || index >= this.defaultTaskTemplateDraft.length) {
      return;
    }
    this.defaultTaskTemplateDraft.splice(index, 1);
    this.defaultTaskTemplateDraft = [...this.defaultTaskTemplateDraft];
  }

  resetDefaultTaskTemplateDraft(): void {
    this.defaultTaskTemplateDraft = [...DEFAULT_PROJECT_TASK_TEMPLATES];
    this.newDefaultTaskTemplateName = '';
  }

  saveDefaultTaskTemplates(): void {
    const normalized = Array.from(new Set(
      this.defaultTaskTemplateDraft
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .slice(0, 100)
    ));

    this.defaultTaskTemplates = normalized.length ? normalized : [...DEFAULT_PROJECT_TASK_TEMPLATES];
    this.defaultTaskTemplateDraft = [...this.defaultTaskTemplates];
    this.persistTaskState();
    this.actionMessageType = 'success';
    this.actionMessage = 'Default project task templates updated.';
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
      projectTaskName: String(value.projectTaskName || this.projectTaskBoardName).trim() || 'Project Tasks',
      gate: (value.gate || '') as TaskGate | '',
      groupName: value.groupName?.trim() || '',
      subGroupName: value.subGroupName?.trim() || '',
      taskName: value.taskName || '',
      project: value.project || '',
      assignedTo: Array.from(this.selectedAssignees),
      startDate: value.startDate || '',
      finishDate: value.finishDate || '',
      durationDays: this.calculateDuration(value.startDate || '', value.finishDate || ''),
      dependsOn: '',
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
    this.selectedAssignee = '';
    this.selectedAssignees.clear();
  }

  openAttachmentModal(taskId: number): void {
    const task = this.taskRecords.find(t => t.id === taskId);
    if (!task) return;

    const resourceId = this.getTaskAttachmentResourceId(task.id);
    if (!resourceId) {
      this.actionMessageType = 'warning';
      this.actionMessage = 'Save/select a project first to manage task attachments.';
      return;
    }

    const ref = this.modalService.open(PmTaskAttachmentModalComponent, { size: 'lg' });
    ref.componentInstance.task = task;
    ref.componentInstance.resourceId = resourceId;

    ref.result
      .then(() => this.reloadTaskAttachmentCount(task.id))
      .catch(() => this.reloadTaskAttachmentCount(task.id));
  }

  openCommentModal(taskId: number): void {
    const task = this.taskRecords.find(t => t.id === taskId);
    if (!task) return;

    const commentContext = this.getTaskCommentContext(task.id);
    if (!commentContext) {
      this.actionMessageType = 'warning';
      this.actionMessage = 'Save/select a project first to manage task comments.';
      return;
    }

    this.selectedCommentTaskId = task.id;
    this.selectedCommentOrderNum = commentContext;
    this.focusedCommentId = null;
    this.isCommentPanelOpen = true;

    const url = this.router.url.split('?')[0];
    this.router.navigate([url], {
      queryParams: {
        comment: commentContext,
        commentId: null,
        type: this.commentType,
        commentViewMode: this.commentViewMode,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  closeCommentPanel(): void {
    this.isCommentPanelOpen = false;
    if (this.selectedCommentTaskId !== null) {
      void this.reloadTaskCommentCount(this.selectedCommentTaskId);
    }
    this.selectedCommentOrderNum = null;
    this.selectedCommentTaskId = null;
    this.focusedCommentId = null;

    const url = this.router.url.split('?')[0];
    this.router.navigate([url], {
      queryParams: {
        comment: null,
        commentId: null,
        type: null,
        commentViewMode: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  setCommentViewMode(mode: 'offcanvas' | 'modal'): void {
    this.commentViewMode = mode;
  }

  onCommentSaved(): void {
    if (this.selectedCommentTaskId !== null) {
      void this.reloadTaskCommentCount(this.selectedCommentTaskId);
    }
  }

  onCommentPanelWidthChange(width: number): void {
    if (!Number.isFinite(width)) {
      return;
    }

    this.commentPanelWidth = Math.round(width);
  }

  private applyGateContext(gateContext: string, gate: number): void {
    const selectedGate = this.resolveGateByContext(gateContext, gate);
    const hasExplicitGateSelection = /^gate[1-6]$/.test(gateContext) || (gate >= 1 && gate <= 6);

    if (gateContext === 'gate1') {
      this.taskForm.patchValue({
        gate: selectedGate,
        groupName: 'PM',
        subGroupName: 'Customer Inputs',
        bucket: 'Overall'
      });
      this.setGateFilter(selectedGate, false, false);
      return;
    }

    if (gateContext === 'gate2' || gateContext === 'gate3' || gateContext === 'gate4') {
      this.taskForm.patchValue({
        gate: selectedGate,
        groupName: 'Engineering',
        subGroupName: 'Backlog',
        bucket: 'Engineering'
      });
      this.moveTargetGroup = 'Engineering';
      this.moveTargetSubGroup = 'Backlog';
      this.setGateFilter(selectedGate, false, false);
      return;
    }

    if (gateContext === 'gate5' || gateContext === 'gate6') {
      this.taskForm.patchValue({
        gate: selectedGate,
        groupName: 'Quality',
        subGroupName: 'QA',
        bucket: 'Validation'
      });
      this.moveTargetGroup = 'Quality';
      this.moveTargetSubGroup = 'QA';
      this.setGateFilter(selectedGate, false, false);
      return;
    }

    if (hasExplicitGateSelection) {
      this.setGateFilter(selectedGate, false, false);
    }
  }

  setGateFilter(gate: TaskGateFilter, syncParams = true, rebuildRows = true): void {
    this.activeGateFilter = gate;
    this.gateContextLabel = gate === 'All' ? 'All Gates' : `Gate ${gate.replace('G', '')}`;
    if (syncParams) {
      this.syncFilterQueryParams();
    }
    if (rebuildRows) {
      this.rebuildTreeRows();
    }
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
        gateFilter: this.activeGateFilter,
        taskBoard: this.projectTaskBoardName || null,
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
    const startDate = String(value.startDate || '').trim();
    const finishDate = String(value.finishDate || '').trim();
    const durationDays = this.calculateDuration(startDate, finishDate);

    const bulkTasks: PmTaskRecord[] = Array.from(this.selectedPeople).map(person => ({
      id: this.nextId++,
      projectTaskName: this.projectTaskBoardName,
      gate: (value.gate || '') as TaskGate | '',
      groupName: 'Engineering',
      subGroupName: 'Involved People',
      taskName: `${baseTaskName} - ${person}`,
      project: value.project || 'VWL-035XX-XXX',
      assignedTo: [person],
      durationDays,
      startDate,
      finishDate,
      dependsOn: '',
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

    const previousRecords = [...this.taskRecords];
    this.taskRecords = this.taskRecords.filter(task => !targetTaskIds.has(task.id));
    this.rebuildTreeRows();
    this.persistTaskStateWithStatus((savedToApi) => {
      if (savedToApi) {
        this.actionMessageType = 'success';
        this.actionMessage = `Deleted ${targetTaskIds.size} task(s).`;
        return;
      }

      this.taskRecords = previousRecords;
      this.rebuildTreeRows();
      this.actionMessageType = 'warning';
      this.actionMessage = 'Delete did not go through. Please try again.';
    });
  }

  private duplicateFromGridRow(params: any): void {
    params?.event?.stopPropagation?.();

    if (params?.node?.group) {
      const route = this.getNodeGroupRoute(params.node);
      const groupName = String(route[0] || '').trim();
      if (!groupName) {
        return;
      }

      if (route.length === 1) {
        this.duplicateGroup(groupName);
      } else {
        this.duplicateSubgroup(groupName, route.slice(1).join('/'));
      }
      return;
    }

    const row = params?.data as PmTreeRow | undefined;
    if (!row || row.rowType === 'add-item') {
      return;
    }

    if (row.rowType === 'task' && row.taskId !== null) {
      this.duplicateTask(row.taskId);
      return;
    }

    if (row.rowType === 'group') {
      this.duplicateGroup(row.groupName);
      return;
    }

    if (row.rowType === 'subgroup') {
      this.duplicateSubgroup(row.groupName, row.subGroupName);
    }
  }

  private archiveFromGridRow(params: any): void {
    params?.event?.stopPropagation?.();
    const targetRows = this.getRowsForCompleteAction(params);
    if (!targetRows.length) {
      this.actionMessageType = 'warning';
      this.actionMessage = 'No rows available to archive.';
      return;
    }

    const targetTaskIds = new Set(targetRows.map((task) => task.id));
    this.taskRecords = this.taskRecords.map((task) => {
      if (!targetTaskIds.has(task.id)) {
        return task;
      }
      return {
        ...task,
        status: 'Locked',
        completion: 100,
      };
    });

    this.persistTaskState();
    this.rebuildTreeRows();
    this.actionMessageType = 'success';
    this.actionMessage = `Archived ${targetTaskIds.size} task(s) as Locked.`;
  }

  private openMoveProjectFromGridRow(params: any): void {
    params?.event?.stopPropagation?.();

    const availableProjectIds = this.getProjectIdOptions();
    if (!availableProjectIds.length) {
      this.actionMessageType = 'warning';
      this.actionMessage = 'No target projects are available.';
      return;
    }

    const targetRows = this.getRowsForCompleteAction(params);
    if (!targetRows.length) {
      this.actionMessageType = 'warning';
      this.actionMessage = 'No rows available to copy.';
      return;
    }

    this.pendingMoveTaskIds = new Set(targetRows.map((task) => task.id));
    this.pendingMoveTaskCount = this.pendingMoveTaskIds.size;
    this.copyKeepOriginalStatus = false;

    const currentSelection = String(this.selectedProjectId || this.activeProjectId || '').trim();
    const firstDifferent = availableProjectIds.find((projectId) => projectId !== currentSelection);
    this.moveTargetProjectId = firstDifferent || availableProjectIds[0];

    this.activeModalRef = this.modalService.open(this.moveProjectModalTpl, {
      size: 'sm',
      centered: true,
      backdrop: 'static',
      keyboard: true,
    });
  }

  copyEntireTasksToProject(): void {
    const sourceProjectId = String(this.activeProjectId || '').trim();
    if (!sourceProjectId) {
      this.actionMessageType = 'warning';
      this.actionMessage = 'Select a project first.';
      return;
    }

    const availableProjectIds = this.getProjectIdOptions().filter((projectId) => projectId !== sourceProjectId);
    if (!availableProjectIds.length) {
      this.actionMessageType = 'warning';
      this.actionMessage = 'No target projects are available.';
      return;
    }

    const tasksToCopy = this.getActiveBoardTasks();
    if (!tasksToCopy.length) {
      this.actionMessageType = 'warning';
      this.actionMessage = 'No tasks available to copy.';
      return;
    }

    this.pendingMoveTaskIds = new Set(tasksToCopy.map((task) => task.id));
    this.pendingMoveTaskCount = this.pendingMoveTaskIds.size;
    this.moveTargetProjectId = availableProjectIds[0];
    this.copyKeepOriginalStatus = false;

    this.activeModalRef = this.modalService.open(this.moveProjectModalTpl, {
      size: 'sm',
      centered: true,
      backdrop: 'static',
      keyboard: true,
    });
  }

  confirmMoveToProject(modal?: any): void {
    const targetProjectId = String(this.moveTargetProjectId || '').trim();
    if (!targetProjectId) {
      this.actionMessageType = 'warning';
      this.actionMessage = 'Select a target project first.';
      return;
    }

    if (!this.pendingMoveTaskIds.size) {
      this.actionMessageType = 'warning';
      this.actionMessage = 'No rows available to copy.';
      modal?.dismiss?.();
      return;
    }

    const sourceProjectId = String(this.activeProjectId || '').trim();
    if (!sourceProjectId) {
      this.actionMessageType = 'warning';
      this.actionMessage = 'Select a source project first.';
      return;
    }

    if (targetProjectId === sourceProjectId) {
      this.actionMessageType = 'warning';
      this.actionMessage = 'Select a different target project.';
      return;
    }

    const targetTaskIds = new Set(this.pendingMoveTaskIds);
    const tasksToMove = this.taskRecords.filter((task) => targetTaskIds.has(task.id));
    if (!tasksToMove.length) {
      this.actionMessageType = 'warning';
      this.actionMessage = 'No rows available to copy.';
      modal?.dismiss?.();
      return;
    }

    this.tasksDataService.loadState$(targetProjectId).subscribe((targetState) => {
      let nextTargetId = Math.max(1, Number(targetState.nextId || 1));

      const movedTasks = tasksToMove.map((task) => ({
        ...task,
        id: nextTargetId++,
        project: targetProjectId,
        assignedTo: [...(task.assignedTo || [])],
        status: this.copyKeepOriginalStatus ? task.status : ('Open' as TaskStatus),
        completion: this.copyKeepOriginalStatus ? Number(task.completion || 0) : 0,
      }));

      const targetSubgroupCatalog: Record<string, string[]> = { ...(targetState.subgroupCatalog || {}) };
      for (const movedTask of movedTasks) {
        const group = String(movedTask.groupName || '').trim();
        const subgroup = String(movedTask.subGroupName || '').trim();
        if (!group || !subgroup) {
          continue;
        }
        const current = new Set(targetSubgroupCatalog[group] || []);
        current.add(subgroup);
        targetSubgroupCatalog[group] = Array.from(current);
      }

      const nextTargetState: ProjectManagerTasksState = {
        ...targetState,
        hasPersistedState: true,
        nextId: nextTargetId,
        taskRecords: [...movedTasks, ...(targetState.taskRecords || [])],
        subgroupCatalog: targetSubgroupCatalog,
      };

      this.tasksDataService.saveStateWithStatus$(nextTargetState, targetProjectId).subscribe((savedToApi) => {
        if (savedToApi) {
          this.actionMessageType = 'success';
          this.actionMessage = `Copied ${tasksToMove.length} task(s) to project ${targetProjectId}.`;
        } else {
          this.actionMessageType = 'warning';
          this.actionMessage = 'Copy did not go through for the target project. Please try again.';
        }

        this.pendingMoveTaskIds.clear();
        this.pendingMoveTaskCount = 0;
        this.moveTargetProjectId = '';
        this.copyKeepOriginalStatus = false;
        modal?.close?.();
      });
    });
  }

  private deleteFromGridRow(params: any): void {
    params?.event?.stopPropagation?.();
    const targetRows = this.getRowsForCompleteAction(params);
    if (!targetRows.length) {
      this.actionMessageType = 'warning';
      this.actionMessage = 'No rows available to delete.';
      return;
    }

    const targetTaskIds = new Set(targetRows.map((task) => task.id));
    const confirmed = window.confirm(`Delete ${targetTaskIds.size} task(s)? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    const previousRecords = [...this.taskRecords];
    this.taskRecords = this.taskRecords.filter((task) => !targetTaskIds.has(task.id));
    this.rebuildTreeRows();
    this.persistTaskStateWithStatus((savedToApi) => {
      if (savedToApi) {
        this.actionMessageType = 'success';
        this.actionMessage = `Deleted ${targetTaskIds.size} task(s).`;
        return;
      }

      this.taskRecords = previousRecords;
      this.rebuildTreeRows();
      this.actionMessageType = 'warning';
      this.actionMessage = 'Delete did not go through. Please try again.';
    });
  }

  private openCommentFromGridRow(params: any): void {
    params?.event?.stopPropagation?.();
    const taskId = Number(params?.data?.taskId);
    if (!Number.isFinite(taskId) || taskId <= 0) {
      this.actionMessageType = 'warning';
      this.actionMessage = 'Comments are available for task rows only.';
      return;
    }

    this.openCommentModal(taskId);
  }

  private openAttachmentFromGridRow(params: any): void {
    params?.event?.stopPropagation?.();
    const taskId = Number(params?.data?.taskId);
    if (!Number.isFinite(taskId) || taskId <= 0) {
      this.actionMessageType = 'warning';
      this.actionMessage = 'Attachments are available for task rows only.';
      return;
    }

    this.openAttachmentModal(taskId);
  }

  private duplicateTask(taskId: number): void {
    const sourceTask = this.taskRecords.find((task) => task.id === taskId);
    if (!sourceTask) {
      return;
    }

    const existingNames = new Set(
      this.taskRecords
        .filter((task) =>
          task.groupName === sourceTask.groupName
          && task.subGroupName === sourceTask.subGroupName
          && this.sameBoard(task.projectTaskName, sourceTask.projectTaskName)
        )
        .map((task) => String(task.taskName || '').trim().toLowerCase())
    );

    const copiedTask: PmTaskRecord = {
      ...sourceTask,
      id: this.nextId++,
      taskName: this.createUniqueLabel(sourceTask.taskName, existingNames),
      status: sourceTask.status,
      completion: sourceTask.completion,
      assignedTo: [...(sourceTask.assignedTo || [])],
    };

    this.insertClonesAfter((task) => task.id === taskId, [copiedTask]);
    this.persistTaskState();
    this.rebuildTreeRows();
    this.actionMessageType = 'success';
    this.actionMessage = `Duplicated task ${sourceTask.taskName}.`;
  }

  private duplicateGroup(groupName: string): void {
    const sourceGroup = String(groupName || '').trim();
    if (!sourceGroup) {
      return;
    }

    const sourceTasks = this.getActiveBoardTasks().filter((task) => task.groupName === sourceGroup);
    if (!sourceTasks.length) {
      return;
    }

    const existingGroups = new Set(this.getActiveBoardTasks().map((task) => String(task.groupName || '').trim().toLowerCase()));
    const newGroupName = this.createUniqueLabel(sourceGroup, existingGroups);

    const clones = sourceTasks.map((task) => ({
      ...task,
      id: this.nextId++,
      groupName: newGroupName,
      assignedTo: [...(task.assignedTo || [])],
    }));

    const subgroupPaths = Array.from(this.subgroupCatalog[sourceGroup] || []);
    subgroupPaths.forEach((path) => this.ensureSubgroup(newGroupName, path));

    this.insertClonesAfter((task) => task.groupName === sourceGroup && this.sameBoard(task.projectTaskName, this.projectTaskBoardName), clones);
    this.persistTaskState();
    this.rebuildTreeRows();
    this.actionMessageType = 'success';
    this.actionMessage = `Duplicated group ${sourceGroup} with ${clones.length} task(s).`;
  }

  private duplicateSubgroup(groupName: string, subgroupPath: string): void {
    const sourceGroup = String(groupName || '').trim();
    const sourcePath = String(subgroupPath || '').trim();
    if (!sourceGroup || !sourcePath) {
      return;
    }

    const sourceTasks = this.getActiveBoardTasks().filter((task) =>
      task.groupName === sourceGroup
      && (task.subGroupName === sourcePath || task.subGroupName.startsWith(`${sourcePath}/`))
    );

    if (!sourceTasks.length) {
      return;
    }

    const segments = sourcePath.split('/').filter(Boolean);
    const rootName = segments[segments.length - 1] || sourcePath;
    const parentPath = segments.slice(0, -1).join('/');

    const siblingNames = new Set<string>();
    Array.from(this.subgroupCatalog[sourceGroup] || []).forEach((path) => {
      const normalized = String(path || '').trim();
      if (!normalized) {
        return;
      }
      const pathSegments = normalized.split('/').filter(Boolean);
      if (pathSegments.length !== segments.length) {
        return;
      }
      if (pathSegments.slice(0, -1).join('/') !== parentPath) {
        return;
      }
      siblingNames.add(pathSegments[pathSegments.length - 1].toLowerCase());
    });

    const copiedRootName = this.createUniqueLabel(rootName, siblingNames);
    const copiedRootPath = parentPath ? `${parentPath}/${copiedRootName}` : copiedRootName;

    const clones = sourceTasks.map((task) => {
      const suffix = task.subGroupName.slice(sourcePath.length);
      const nextSubGroup = `${copiedRootPath}${suffix}`;
      this.ensureSubgroup(sourceGroup, nextSubGroup);
      return {
        ...task,
        id: this.nextId++,
        subGroupName: nextSubGroup,
        assignedTo: [...(task.assignedTo || [])],
      } as PmTaskRecord;
    });

    this.insertClonesAfter((task) =>
      task.groupName === sourceGroup
      && (task.subGroupName === sourcePath || task.subGroupName.startsWith(`${sourcePath}/`))
      && this.sameBoard(task.projectTaskName, this.projectTaskBoardName), clones);

    this.persistTaskState();
    this.rebuildTreeRows();
    this.actionMessageType = 'success';
    this.actionMessage = `Duplicated subgroup ${sourcePath} with ${clones.length} task(s).`;
  }

  private createUniqueLabel(baseLabel: string, existingLowercaseNames: Set<string>): string {
    const normalizedBase = String(baseLabel || '').trim() || 'Copy';
    const preferred = `${normalizedBase} Copy`;
    if (!existingLowercaseNames.has(preferred.toLowerCase())) {
      return preferred;
    }

    let index = 2;
    while (index < 5000) {
      const candidate = `${normalizedBase} Copy ${index}`;
      if (!existingLowercaseNames.has(candidate.toLowerCase())) {
        return candidate;
      }
      index += 1;
    }

    return `${normalizedBase} Copy ${Date.now()}`;
  }

  private sameBoard(a: string | undefined, b: string | undefined): boolean {
    const left = String(a || 'Project Tasks').trim().toLowerCase() || 'project tasks';
    const right = String(b || 'Project Tasks').trim().toLowerCase() || 'project tasks';
    return left === right;
  }

  private insertClonesAfter(predicate: (task: PmTaskRecord) => boolean, clones: PmTaskRecord[]): void {
    if (!clones.length) {
      return;
    }

    let insertAfterIndex = -1;
    this.taskRecords.forEach((task, index) => {
      if (predicate(task)) {
        insertAfterIndex = index;
      }
    });

    const insertAt = insertAfterIndex + 1;
    this.taskRecords = [
      ...this.taskRecords.slice(0, insertAt),
      ...clones,
      ...this.taskRecords.slice(insertAt),
    ];
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
      task.startDate = this.normalizeDateInput(task.startDate);
      task.finishDate = this.normalizeDateInput(task.finishDate);
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

    const overRow = event.overNode?.data;

    // If dropping a task onto another task in the same scope, reorder within that group/subgroup.
    if (
      dragRow.rowType === 'task'
      && dragRow.taskId !== null
      && overRow?.rowType === 'task'
      && overRow.taskId !== null
    ) {
      const dragTask = this.taskRecords.find(task => task.id === dragRow.taskId);
      const overTask = this.taskRecords.find(task => task.id === overRow.taskId);

      const sameScope = !!dragTask
        && !!overTask
        && dragTask.groupName === overTask.groupName
        && dragTask.subGroupName === overTask.subGroupName
        && String(dragTask.projectTaskName || '').trim().toLowerCase() === String(overTask.projectTaskName || '').trim().toLowerCase();

      if (sameScope) {
        const dragRowIndex = Number(event.node?.rowIndex ?? -1);
        const overRowIndex = Number(event.overNode?.rowIndex ?? -1);
        const placeAfter = Number.isFinite(dragRowIndex) && Number.isFinite(overRowIndex) && dragRowIndex < overRowIndex;

        const reordered = this.reorderTaskRecord(dragRow.taskId, overRow.taskId, placeAfter);
        if (reordered) {
          this.persistTaskState();
          this.rebuildTreeRows();
        }
        return;
      }
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
    const movedTasks = this.taskRecords
      .filter((task) => taskIds.has(task.id))
      .map((task) => ({ ...task, groupName: targetGroup, subGroupName: targetSubgroup }));

    if (!movedTasks.length) {
      return;
    }

    const remainingTasks = this.taskRecords.filter((task) => !taskIds.has(task.id));
    const activeBoard = String(this.projectTaskBoardName || '').trim().toLowerCase() || 'project tasks';

    let insertAfterIndex = -1;
    for (let i = 0; i < remainingTasks.length; i++) {
      const task = remainingTasks[i];
      const boardName = String(task.projectTaskName || 'Project Tasks').trim().toLowerCase() || 'project tasks';
      if (boardName !== activeBoard) {
        continue;
      }

      if (task.groupName === targetGroup && task.subGroupName === targetSubgroup) {
        insertAfterIndex = i;
      }
    }

    if (insertAfterIndex < 0) {
      for (let i = 0; i < remainingTasks.length; i++) {
        const task = remainingTasks[i];
        const boardName = String(task.projectTaskName || 'Project Tasks').trim().toLowerCase() || 'project tasks';
        if (boardName === activeBoard) {
          insertAfterIndex = i;
        }
      }
    }

    const insertAt = insertAfterIndex + 1;
    this.taskRecords = [
      ...remainingTasks.slice(0, insertAt),
      ...movedTasks,
      ...remainingTasks.slice(insertAt),
    ];
    this.persistTaskState();
    this.rebuildTreeRows();
  }

  private enforceAddItemRowsAtBottom(nodes: IRowNode<PmTreeRow>[]): void {
    if (!Array.isArray(nodes) || !nodes.length) {
      return;
    }

    const parentGroups = new Map<string, IRowNode<PmTreeRow>[]>();

    nodes.forEach((node) => {
      if (!node || node.group || !node.data) {
        return;
      }

      const parent = node.parent as IRowNode<PmTreeRow> | null;
      const parentKey = parent
        ? this.getExpansionKey(parent) || `parent__${String(parent.id || parent.key || '')}`
        : '__root__';

      const siblings = parentGroups.get(parentKey) || [];
      siblings.push(node);
      parentGroups.set(parentKey, siblings);
    });

    parentGroups.forEach((siblings) => {
      const addRows = siblings.filter((sibling) => sibling.data?.rowType === 'add-item');
      if (!addRows.length) {
        return;
      }

      addRows.forEach((addRow) => {
        const currentIndex = nodes.indexOf(addRow);
        if (currentIndex < 0) {
          return;
        }

        nodes.splice(currentIndex, 1);

        let insertAfter = -1;
        siblings.forEach((sibling) => {
          if (sibling === addRow) {
            return;
          }
          const siblingIndex = nodes.indexOf(sibling);
          if (siblingIndex > insertAfter) {
            insertAfter = siblingIndex;
          }
        });

        nodes.splice(insertAfter + 1, 0, addRow);
      });
    });
  }

  private reorderTaskRecord(dragTaskId: number, overTaskId: number, placeAfter: boolean): boolean {
    if (dragTaskId === overTaskId) {
      return false;
    }

    const dragIndex = this.taskRecords.findIndex(task => task.id === dragTaskId);
    const overIndex = this.taskRecords.findIndex(task => task.id === overTaskId);
    if (dragIndex < 0 || overIndex < 0) {
      return false;
    }

    const [dragTask] = this.taskRecords.splice(dragIndex, 1);
    let insertIndex = overIndex + (placeAfter ? 1 : 0);

    // Removing the drag row shifts subsequent indexes by one.
    if (dragIndex < insertIndex) {
      insertIndex -= 1;
    }

    this.taskRecords.splice(Math.max(0, insertIndex), 0, dragTask);
    return true;
  }

  private initializeTaskState(projectId: string): void {
    const normalizedProjectId = String(projectId || '').trim();

    if (!normalizedProjectId) {
      this.nextId = 1;
      this.taskRecords = [];
      this.subgroupCatalog = {};
      this.projectTaskBoardName = 'Project Tasks';
      this.projectTaskBoardNameDraft = 'Project Tasks';
      this.taskBoardNames = ['Project Tasks'];
      this.newTaskBoardName = '';
      this.requestedTaskBoardFromQuery = '';
      this.defaultTaskTemplates = [...DEFAULT_PROJECT_TASK_TEMPLATES];
      this.defaultTaskTemplateDraft = [...DEFAULT_PROJECT_TASK_TEMPLATES];
      this.seedSubgroupCatalog();
      return;
    }

    this.tasksDataService.loadState$(normalizedProjectId).subscribe(state => {
      if (this.activeProjectId !== normalizedProjectId) {
        return;
      }

      this.nextId = state.nextId;
      const normalizedRecords = this.normalizeTaskDateDurations(state.taskRecords || []);
      const hasDateCorrections = (state.taskRecords || []).some((task, index) => {
        const next = normalizedRecords[index];
        if (!next) {
          return false;
        }

        return String(task.startDate || '').trim() !== next.startDate
          || String(task.finishDate || '').trim() !== next.finishDate
          || Number(task.durationDays || 0) !== next.durationDays;
      });

      this.taskRecords = normalizedRecords;
      this.hydrateTaskCountMaps(state);
      this.projectTaskBoardName = String(state.projectTaskBoardName || '').trim() || 'Project Tasks';
      this.projectTaskBoardNameDraft = this.projectTaskBoardName;
      this.taskBoardNames = Array.from(new Set(
        [
          ...(state.taskBoardNames || []),
          ...state.taskRecords.map(task => String(task.projectTaskName || '').trim()).filter(Boolean),
          this.projectTaskBoardName,
        ]
          .map((name) => String(name || '').trim())
          .filter(Boolean)
      ));
      if (!this.taskBoardNames.length) {
        this.taskBoardNames = ['Project Tasks'];
      }
      if (this.requestedTaskBoardFromQuery) {
        const requested = this.requestedTaskBoardFromQuery;
        if (!this.taskBoardNames.some((name) => name.toLowerCase() === requested.toLowerCase())) {
          this.taskBoardNames = [...this.taskBoardNames, requested];
        }
        this.projectTaskBoardName = requested;
        this.projectTaskBoardNameDraft = requested;
        this.taskForm.patchValue({ projectTaskName: requested });
        this.requestedTaskBoardFromQuery = '';
      }
      this.defaultTaskTemplates = state.defaultTaskTemplates?.length
        ? [...state.defaultTaskTemplates]
        : [...DEFAULT_PROJECT_TASK_TEMPLATES];
      this.defaultTaskTemplateDraft = [...this.defaultTaskTemplates];

      const catalog: Record<string, Set<string>> = {};
      Object.keys(state.subgroupCatalog).forEach(group => {
        catalog[group] = new Set(state.subgroupCatalog[group]);
      });
      this.subgroupCatalog = catalog;

      if (!this.taskRecords.length && !state.hasPersistedState) {
        this.seedDefaultProjectTasks();
      }

      if (hasDateCorrections) {
        this.persistTaskState();
      }

      this.seedSubgroupCatalog();
      this.rebuildTreeRows();
    });
  }

  private hydrateTaskCountMaps(state: { taskAttachmentCounts?: Record<number, number>; taskCommentCounts?: Record<number, number> }): void {
    this.taskAttachmentCountMap.clear();
    this.taskCommentCountMap.clear();

    Object.entries(state.taskAttachmentCounts || {}).forEach(([taskIdRaw, countRaw]) => {
      const taskId = Number(taskIdRaw);
      if (!Number.isFinite(taskId) || taskId <= 0) {
        return;
      }

      const count = Number(countRaw);
      this.taskAttachmentCountMap.set(taskId, Number.isFinite(count) && count > 0 ? count : 0);
    });

    Object.entries(state.taskCommentCounts || {}).forEach(([taskIdRaw, countRaw]) => {
      const taskId = Number(taskIdRaw);
      if (!Number.isFinite(taskId) || taskId <= 0) {
        return;
      }

      const count = Number(countRaw);
      this.taskCommentCountMap.set(taskId, Number.isFinite(count) && count > 0 ? count : 0);
    });
  }

  private seedDefaultProjectTasks(): void {
    const projectLabel = String(this.currentProjectSummary?.code || this.currentProjectSummary?.id || this.activeProjectId || '').trim();
    const startDate = String(this.taskForm.get('startDate')?.value || '').trim();
    const finishDate = String(this.taskForm.get('finishDate')?.value || '').trim();
    const gate = (this.taskForm.get('gate')?.value || '') as TaskGate | '';

    const groupName = 'Project Inputs';
    const subGroupName = 'Default Tasks';
    this.ensureSubgroup(groupName, subGroupName);

    const templates = this.defaultTaskTemplates.length ? this.defaultTaskTemplates : DEFAULT_PROJECT_TASK_TEMPLATES;
    const seededTasks: PmTaskRecord[] = templates.map((taskName) => ({
      id: this.nextId++,
      projectTaskName: this.projectTaskBoardName,
      gate,
      groupName,
      subGroupName,
      taskName,
      project: projectLabel,
      assignedTo: [],
      durationDays: this.calculateDuration(startDate, finishDate),
      startDate,
      finishDate,
      dependsOn: '',
      bucket: 'General',
      status: 'Open',
      completion: 0,
      source: 'manual',
    }));

    this.taskRecords = seededTasks;
    this.persistTaskState();
    this.actionMessageType = 'success';
    this.actionMessage = 'Default project tasks were added.';
  }

  private persistTaskState(): void {
    this.tasksDataService.saveState(this.buildTaskStateSnapshot(), this.activeProjectId);
  }

  private persistTaskStateWithStatus(onComplete: (savedToApi: boolean) => void): void {
    this.tasksDataService.saveStateWithStatus$(this.buildTaskStateSnapshot(), this.activeProjectId)
      .subscribe((savedToApi) => onComplete(savedToApi));
  }

  private buildTaskStateSnapshot(): ProjectManagerTasksState {
    this.taskRecords = this.normalizeTaskDateDurations(this.taskRecords);

    const subgroupCatalog: Record<string, string[]> = {};
    Object.keys(this.subgroupCatalog).forEach(group => {
      subgroupCatalog[group] = Array.from(this.subgroupCatalog[group]);
    });

    return {
      nextId: this.nextId,
      taskRecords: this.taskRecords,
      hasPersistedState: true,
      subgroupCatalog,
      defaultTaskTemplates: this.defaultTaskTemplates,
      projectTaskBoardName: this.projectTaskBoardName,
      taskBoardNames: this.taskBoardNames
    };
  }

  private getActiveBoardTasks(): PmTaskRecord[] {
    const activeBoard = String(this.projectTaskBoardName || '').trim() || 'Project Tasks';
    return this.taskRecords.filter((task) => {
      const board = String(task.projectTaskName || 'Project Tasks').trim() || 'Project Tasks';
      return board.toLowerCase() === activeBoard.toLowerCase();
    });
  }

  private patchDefaultProjectFromSelection(): void {
    const projects = this.projectsService.getProjects();
    const selectedId = this.projectsService.getSelectedProjectId(projects);
    const selected = projects.find(project => project.id === selectedId);
    if (!selected) {
      return;
    }

    this.taskForm.patchValue({
      project: selected.id
    });
  }

  private applyProjectContext(requestedProjectId: string): void {
    const projects = this.projectsService.getProjects();
    const resolvedProjectId = String(requestedProjectId || '').trim();

    this.currentProjectSummary = projects.find(project => project.id === resolvedProjectId) || null;
    this.projectDropdownSelectedId = resolvedProjectId;

    if (resolvedProjectId) {
      this.projectsService.setSelectedProjectId(resolvedProjectId);
    }

    if (resolvedProjectId === this.activeProjectId) {
      return;
    }

    // Switching project should always close any open comment panel context.
    this.isCommentPanelOpen = false;
    this.selectedCommentOrderNum = null;
    this.selectedCommentTaskId = null;
    this.focusedCommentId = null;
    this.pendingDeepLinkTaskId = null;

    this.activeProjectId = resolvedProjectId;
    this.taskAttachmentCountMap.clear();
    this.taskCommentCountMap.clear();
    this.initializeTaskState(this.activeProjectId);
    this.patchDefaultProjectFromSelection();

    if (requestedProjectId) {
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

  private getTaskAttachmentResourceId(taskId: number): number | null {
    if (!Number.isFinite(taskId) || taskId <= 0) {
      return null;
    }

    const baseId = this.getProjectAttachmentBaseId();
    if (!baseId) {
      return null;
    }

    return (baseId * 100000) + taskId;
  }

  private getTaskCommentContext(taskId: number): string | null {
    if (!Number.isFinite(taskId) || taskId <= 0) {
      return null;
    }

    const projectId = String(this.activeProjectId || this.currentProjectSummary?.id || '').trim();
    if (!projectId) {
      return null;
    }

    return `${projectId}::task::${taskId}`;
  }

  private parseTaskCommentContext(context: string): { projectId: string; taskId: number } | null {
    const value = String(context || '').trim();
    if (!value) {
      return null;
    }

    const marker = '::task::';
    const markerIndex = value.indexOf(marker);
    if (markerIndex <= 0) {
      return null;
    }

    const projectId = value.slice(0, markerIndex).trim();
    const taskIdRaw = value.slice(markerIndex + marker.length).trim();
    const taskId = Number(taskIdRaw);

    if (!projectId || !Number.isFinite(taskId) || taskId <= 0) {
      return null;
    }

    return { projectId, taskId };
  }

  private highlightTaskRow(taskId: number): void {
    if (!this.gridApi || !Number.isFinite(taskId) || taskId <= 0) {
      return;
    }

    const rowNode = this.gridApi.getRowNode(this.toTaskRowId(taskId));
    if (!rowNode || rowNode.rowIndex === null || rowNode.rowIndex === undefined) {
      return;
    }

    this.gridApi.ensureNodeVisible(rowNode, 'middle');
    rowNode.setSelected(true, true);
    this.gridApi.flashCells({
      rowNodes: [rowNode],
      flashDuration: 1800,
      fadeDuration: 1000,
    });
  }

  private getProjectAttachmentBaseId(): number | null {
    const projectId = String(this.activeProjectId || this.currentProjectSummary?.id || '').trim();
    if (!projectId) {
      return null;
    }

    const digitsOnly = projectId.replace(/\D+/g, '');
    if (digitsOnly) {
      const parsed = Number.parseInt(digitsOnly.slice(-9), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    let hash = 0;
    for (let i = 0; i < projectId.length; i++) {
      hash = ((hash * 31) + projectId.charCodeAt(i)) >>> 0;
    }

    return hash > 0 ? hash : null;
  }

  private async reloadTaskAttachmentCount(taskId: number): Promise<void> {
    const resourceId = this.getTaskAttachmentResourceId(taskId);
    if (!resourceId) {
      this.taskAttachmentCountMap.set(taskId, 0);
      this.gridApi?.refreshCells({ force: true, columns: ['attachments'] });
      return;
    }

    try {
      const attachments = await this.attachmentsService.getAttachmentsByFeature(FeatureType.PROJECT_MANAGER_TASK, resourceId);
      this.taskAttachmentCountMap.set(taskId, Array.isArray(attachments) ? attachments.length : 0);
      this.gridApi?.refreshCells({ force: true, columns: ['attachments'] });
    } catch {
      this.taskAttachmentCountMap.set(taskId, 0);
      this.gridApi?.refreshCells({ force: true, columns: ['attachments'] });
    }
  }

  private async reloadTaskCommentCount(taskId: number): Promise<void> {
    const orderNum = this.getTaskCommentContext(taskId);
    if (!orderNum) {
      this.taskCommentCountMap.set(taskId, 0);
      this.gridApi?.refreshCells({ force: true, columns: ['comments'] });
      return;
    }

    try {
      const comments = await this.commentsService.find({ orderNum, type: this.commentType, active: 1 });
      this.taskCommentCountMap.set(taskId, Array.isArray(comments) ? comments.length : 0);
      this.gridApi?.refreshCells({ force: true, columns: ['comments'] });
    } catch {
      this.taskCommentCountMap.set(taskId, 0);
      this.gridApi?.refreshCells({ force: true, columns: ['comments'] });
    }
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

    let groupedTasks = this.getActiveBoardTasks().filter(t => !!String(t.groupName || '').trim());
    if (this.hideDone) groupedTasks = groupedTasks.filter(t => t.status !== 'Completed');
    if (this.filterPerson) groupedTasks = groupedTasks.filter(t => t.assignedTo.includes(this.filterPerson));
    if (this.filterStatus) groupedTasks = groupedTasks.filter(t => t.status === this.filterStatus);
    if (this.activeGateFilter !== 'All') groupedTasks = groupedTasks.filter(t => t.gate === this.activeGateFilter || !String(t.gate || '').trim());

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
        _commentCount: this.taskCommentCountMap.get(task.id) ?? 0,
        _attachmentCount: this.taskAttachmentCountMap.get(task.id) ?? 0
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
    let ungroupedTasks = this.getActiveBoardTasks().filter(t => !t.groupName);
    if (this.hideDone) ungroupedTasks = ungroupedTasks.filter(t => t.status !== 'Completed');
    if (this.filterPerson) ungroupedTasks = ungroupedTasks.filter(t => t.assignedTo.includes(this.filterPerson));
    if (this.filterStatus) ungroupedTasks = ungroupedTasks.filter(t => t.status === this.filterStatus);
    if (this.activeGateFilter !== 'All') ungroupedTasks = ungroupedTasks.filter(t => t.gate === this.activeGateFilter || !String(t.gate || '').trim());

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
        _commentCount: this.taskCommentCountMap.get(task.id) ?? 0,
        _attachmentCount: this.taskAttachmentCountMap.get(task.id) ?? 0
      } as PmTreeRow & { _commentCount: number });
    });

    this.rowData = rows;
    this.gridApi?.setGridOption('rowData', rows);

    setTimeout(() => {
      this.restoreExpandedState(expanded);
      if (this.pendingDeepLinkTaskId !== null) {
        this.highlightTaskRow(this.pendingDeepLinkTaskId);
        this.pendingDeepLinkTaskId = null;
      }
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
    this.getActiveBoardTasks().forEach(task => {
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

    if (finish.getTime() < start.getTime()) {
      return 0;
    }

    const ms = finish.getTime() - start.getTime();
    return Math.max(1, Math.ceil(ms / 86400000));
  }

  private normalizeDateInput(value: unknown): string {
    const raw = String(value || '').trim();
    if (!raw) {
      return '';
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  private normalizeTaskDateDurations(tasks: PmTaskRecord[]): PmTaskRecord[] {
    return (tasks || []).map((task) => {
      const startDate = this.normalizeDateInput(task.startDate);
      const finishDate = this.normalizeDateInput(task.finishDate);

      return {
        ...task,
        startDate,
        finishDate,
        durationDays: this.calculateDuration(startDate, finishDate),
      };
    });
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

  getAssigneeOptions(): string[] {
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
