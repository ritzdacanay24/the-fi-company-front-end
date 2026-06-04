import { PhotosService } from './photos/photos.service';
import { Component, Inject, OnDestroy, OnInit, Renderer2, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { WorkOrderInfoService } from '@app/core/api/work-order/work-order-info.service';
import { PhotoChecklistConfigService, ChecklistTemplate, ChecklistInstance } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { PhotoChecklistV2Service } from '@app/core/api/photo-checklist-config/photo-checklist-v2.service';
import { AccessControlApiService, AccessControlUserSummary } from '@app/core/api/access-control/access-control.service';
import { SharedModule } from '@app/shared/shared.module';
import { AuthenticationService } from '@app/core/services/auth.service';
import { NotificationService } from '@app/core/services/notification.service';
import { DOCUMENT } from '@angular/common';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent } from 'ag-grid-community';
import { NgbModal, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { FileViewerModalComponent } from '@app/shared/components/file-viewer-modal/file-viewer-modal.component';
import { ChecklistExecutionActionsRendererComponent } from './checklist-execution-actions-renderer.component';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';

@Component({
  standalone:true, 
  imports:[SharedModule, AgGridModule, NgbNavModule],
  selector: 'app-checklist-execution',
  templateUrl: './checklist-execution.component.html',
  styleUrls: ['./checklist-execution.component.scss']
})
export class ChecklistExecutionComponent implements OnInit, OnDestroy {
  @ViewChild('reassignConfirmModal') reassignConfirmModal?: TemplateRef<any>;
  @ViewChild('editChecklistModal') editChecklistModal?: TemplateRef<any>;

  readonly defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    floatingFilter: true,
    resizable: true,
    flex: 1,
    minWidth: 130
  };

  // Grid column definitions
  columnDefs: ColDef[] = [
    {
      headerName: '',
      width: 44,
      maxWidth: 44,
      minWidth: 44,
      sortable: false,
      filter: false,
      resizable: false,
      pinned: 'left',
      checkboxSelection: true,
      headerCheckboxSelection: true,
    },
    {
      field: 'id',
      headerName: '',
      minWidth: 80,
      maxWidth: 80,
      sortable: false,
      filter: false,
      pinned: 'right',
      cellRenderer: () => `<button class="btn btn-primary btn-sm">View</button>`
    },
    {
      field: 'work_order_number',
      headerName: 'Work Order #',
      minWidth: 130,
      cellRenderer: (params: any) => `<a href="javascript:void(0)" class="text-primary fw-medium">${params.value || ''}</a>`
    },
    {
      field: 'serial_number',
      headerName: 'Serial Number',
      minWidth: 130,
      cellRenderer: (params: any) => `<code class="bg-light px-2 py-1 rounded">${params.value || 'N/A'}</code>`
    },
    {
      field: 'part_number',
      headerName: 'Part Number',
      minWidth: 120
    },
    {
      field: 'template_name',
      headerName: 'Template',
      minWidth: 180,
      cellRenderer: (params: any) => {
        const name = params.data?.template_name || '';
        const version = params.data?.template_version;
        const vBadge = version ? ` <span style="font-size:0.7rem;padding:1px 5px;border-radius:4px;background:rgba(10,179,156,0.15);color:#0ab39c;font-weight:500;">v${version}</span>` : '';
        return `${name}${vBadge}`;
      }
    },
    {
      field: 'customer_name',
      headerName: 'Customer',
      minWidth: 130,
      cellRenderer: (params: any) => params.value ? `<span>${params.value}</span>` : `<span class="text-muted">—</span>`
    },
    {
      field: 'operator_name',
      headerName: 'Created By',
      minWidth: 120,
      pinned: 'right'
    },
    {
      field: 'owner_name',
      headerName: 'Owner',
      minWidth: 140,
      cellRenderer: (params: any) => {
        const ownerName = params?.data?.owner_name || params?.data?.operator_name;
        if (!ownerName) {
          return '<span class="text-muted">Unassigned</span>';
        }
        return `<span class="d-inline-flex align-items-center gap-1"><i class="mdi mdi-account-lock-outline text-primary"></i>${ownerName}</span>`;
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 110,
      cellRenderer: (params: any) => {
        const status = this.normalizeChecklistStatus(params.value || '');
        const badgeClass = status === 'completed' ? 'bg-success' : 
                          status === 'in_progress' ? 'bg-warning' : 
                          status === 'submitted' ? 'bg-info' : 'bg-secondary';
        const label = status === 'in_progress'
          ? 'In Progress'
          : status.charAt(0).toUpperCase() + status.slice(1);
        return `<span class="badge ${badgeClass}">${label}</span>`;
      }
    },
    {
      field: 'progress_percentage',
      headerName: 'Progress',
      minWidth: 140,
      cellRenderer: (params: any) => {
        const progress = params.value || 0;
        const color = progress >= 100 ? '#65c368' : progress >= 50 ? 'orange' : progress >= 25 ? 'yellow' : '#F40009';
        return `
          <div style="display:flex;align-items:center;gap:8px;width:100%;">
            <div class="progress" style="height:8px;min-width:72px;flex:1 1 auto;">
              <div class="progress-bar" style="width:${progress}%;background-color:${color};"></div>
            </div>
            <span style="font-size:11px;line-height:1;min-width:34px;text-align:right;">${Number(progress).toFixed(0)}%</span>
          </div>`;
      }
    },
    {
      field: 'created_at',
      headerName: 'Created Date',
      minWidth: 140,
      sort: 'desc',
      cellRenderer: (params: any) => {
        const date = new Date(params.value);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    },
    {
      field: 'updated_at',
      headerName: 'Updated Date',
      minWidth: 140,
      cellRenderer: (params: any) => {
        if (!params.value) return '<span class="text-muted">—</span>';
        const date = new Date(params.value);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      minWidth: 100,
      maxWidth: 120,
      sortable: false,
      filter: false,
      cellRenderer: ChecklistExecutionActionsRendererComponent,
      cellRendererParams: {
        canUndoSubmitted: (instance: ChecklistInstance) => this.canUndoSubmittedChecklist(instance),
        canDelete: (instance: ChecklistInstance) => this.canDeleteChecklist(instance),
        onEdit: (instance: ChecklistInstance) => this.openEditChecklistModal(instance),
        onViewFinalPdf: (instanceId: number) => this.onDownloadFinalSubmissionPdf(instanceId),
        onUndoSubmitted: (instance: ChecklistInstance) => this.onUndoSubmittedInstance(instance),
        onTransferOwnership: (instanceId: number) => this.openTransferPanelForSingleInstance(instanceId),
        onArchive: (instanceId: number) => this.onArchiveInstance(instanceId),
        onDelete: (instanceId: number) => this.onDeleteInstance(instanceId),
      }
    }
  ];


  // Updated to use dynamic data instead of hardcoded
  checklistTemplates: ChecklistTemplate[] = [];
  openChecklists: ChecklistInstance[] = [];
  filteredChecklists: ChecklistInstance[] = [];
  loading: boolean;

  // Tab navigation
  activeTab = 'open';
  navOptions = [
    { name: 'Open',           value: 'open',           icon: 'mdi mdi-progress-clock me-1 align-bottom',        count: 0, countStyle: 'warning' },
    { name: 'All',            value: 'submitted',      icon: 'mdi mdi-view-list-outline me-1 align-bottom',     count: 0, countStyle: 'info'    },
    { name: 'My Assignments', value: 'my_assignments', icon: 'mdi mdi-account-check-outline me-1 align-bottom', count: 0, countStyle: 'primary' },
  ];
  currentUser: any = null;
  quickSearch = '';
  previousInstanceId: number | null = null;
  isStandaloneMode = false;
  gridApi: GridApi | null = null;
  private restoringGridStateFromUrl = false;
  private hasAppliedPreviousRowRestore = false;
  private pendingFilterModelFromUrl: any = null;
  private pendingSortModelFromUrl: any[] | null = null;
  selectedInstanceIds: number[] = [];
  transferUsers: AccessControlUserSummary[] = [];
  transferTargetUserId: number | null = null;
  transferLoading = false;
  editSaving = false;
  showTransferPanel = false;
  transferOrigin: 'selection' | 'single-row' = 'selection';
  private readonly standaloneBodyClass = 'standalone-checklist-execution';
  editingInstanceId: number | null = null;
  editWorkOrderNumber = '';
  editPartNumber = '';
  editSerialNumber = '';

  get selectedTransferCount(): number {
    return this.selectedInstanceIds.length;
  }

  get canOpenTransferPanel(): boolean {
    return this.selectedTransferCount > 0;
  }

  get hasActiveFilters(): boolean {
    const hasSearch = !!this.quickSearch?.trim();
    const hasNonDefaultTab = this.activeTab !== 'open';
    const hasGridFilters = !!Object.keys(this.gridApi?.getFilterModel?.() || {}).length;
    const hasGridSort = !!(this.gridApi?.getColumnState?.() || []).some((c: any) => !!c?.sort);

    return hasSearch || hasNonDefaultTab || hasGridFilters || hasGridSort;
  }

  get selectedTransferUserName(): string {
    const found = this.transferUsers.find((u) => Number(u.id) === Number(this.transferTargetUserId || 0));
    return found?.name || '';
  }

  constructor(
    private photosService: PhotosService,
    private workOrderInfoService: WorkOrderInfoService,
    private photoChecklistConfigService: PhotoChecklistConfigService,
    private photoChecklistV2Service: PhotoChecklistV2Service,
    private accessControlApiService: AccessControlApiService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private authService: AuthenticationService,
    private notificationService: NotificationService,
    private modalService: NgbModal,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.currentUser = this.authService.currentUser();
  }
  woNumber: any
  partNumber: string
  serialNumber: string
  
  searchWorkOrder() {
    this.loading = true;
    this.workOrderInfoService.getDataByWorkOrderNumber(this.woNumber).pipe(first()).subscribe(data => {
      this.loading = false;
      if (!data?.mainDetails) {
        alert('No work order found.');
        return;
      }
      this.partNumber = data.mainDetails.wo_part;
      this.serialNumber = data.mainDetails.wo_serial; // Get serial number from work order
      this.loadChecklistTemplates(); // Load available templates for this part
    }, () => this.loading = false);
  }

  loadChecklistTemplates() {
    this.loading = true;
    this.photoChecklistConfigService.getTemplates().pipe(first()).subscribe(templates => {
      this.loading = false;
      // Operators should only see published templates
      this.checklistTemplates = (templates || []).filter(t => t.is_active && !t.is_draft && !!t.published_at);
    }, () => this.loading = false);
  }

  createChecklistInstance(templateId: number) {
    if (!this.woNumber || !this.partNumber) {
      alert('Please search for a work order first.');
      return;
    }

    this.loading = true;
    
    // Get current user information
    const currentUser = this.authService.currentUser();
    
    const instanceData: Partial<ChecklistInstance> = {
      template_id: templateId,
      work_order_number: this.woNumber,
      part_number: this.partNumber,
      serial_number: this.serialNumber || '',
      status: 'in_progress' as const,
      operator_id: currentUser?.id || null,
      operator_name: currentUser ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() : 'Unknown User'
    };

    this.photoChecklistConfigService.createInstance(instanceData).pipe(first()).subscribe(response => {
      this.loading = false;
      this.openPhotos('create', response.instance_id);
      this.getOpenChecklists(); // Refresh the list
    }, () => this.loading = false);
  }

  getOpenChecklists() {
    this.hasAppliedPreviousRowRestore = false;
    this.loading = true;
    this.photoChecklistConfigService.getInstances().pipe(first()).subscribe(data => {
      this.loading = false;
      // Load all checklists and let ag-grid handle filtering/sorting in-grid.
      this.openChecklists = data || [];
      this.applyTabFilter();
      this.focusPreviousInstanceRow();
    }, () => this.loading = false);
  }

  // Alias method for consistency with template
  loadOpenChecklists() {
    this.getOpenChecklists();
  }

  private applyTabFilter(): void {
    let rows = [...this.openChecklists];
    const hasSearch = !!this.quickSearch?.trim();

    // Search should span both tabs. Only apply tab-status filtering when search is empty.
    if (!hasSearch) {
      if (this.activeTab === 'open') {
        rows = rows.filter((c) => this.isOpenTabStatus(c?.status));
      }

      // Keep tab key as 'submitted' for backward URL compatibility,
      // but this tab now represents "All" statuses.

      if (this.activeTab === 'my_assignments') {
        rows = rows.filter((c) => this.isAssignedToCurrentUser(c) && this.isOpenTabStatus(c?.status));
      }
    }

    this.filteredChecklists = rows;

    if (hasSearch) {
      const term = this.quickSearch.trim().toLowerCase();
      this.filteredChecklists = this.filteredChecklists.filter(c =>
        c.work_order_number?.toLowerCase().includes(term) ||
        c.serial_number?.toLowerCase().includes(term) ||
        c.part_number?.toLowerCase().includes(term) ||
        c.template_name?.toLowerCase().includes(term) ||
        c.operator_name?.toLowerCase().includes(term)
      );
    }

    this.updateTabCounts();
  }

  setActiveTab(tab: string): void {
    if (!tab || this.activeTab === tab) {
      return;
    }

    this.activeTab = tab;
    this.applyTabFilter();
    this.syncViewStateToUrl();
    this.gridApi?.deselectAll();
    this.selectedInstanceIds = [];
  }

  private updateTabCounts(): void {
    const openCount = this.openChecklists.filter((c) => this.isOpenTabStatus(c?.status)).length;
    const allCount = this.openChecklists.length;
    const myAssignmentsCount = this.openChecklists.filter(
      (c) => this.isAssignedToCurrentUser(c) && this.isOpenTabStatus(c?.status),
    ).length;

    this.navOptions = this.navOptions.map((option) => {
      if (option.value === 'open') {
        return { ...option, count: openCount };
      }
      if (option.value === 'submitted') {
        return { ...option, count: allCount };
      }
      if (option.value === 'my_assignments') {
        return { ...option, count: myAssignmentsCount };
      }
      return option;
    });
  }

  onQuickSearch(term: string): void {
    this.applyTabFilter();
    this.syncViewStateToUrl();
  }

  private parseFilterModelFromQuery(raw: unknown): any | null {
    const value = String(raw || '').trim();
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      // Backward compatibility for previously encoded URLs.
      try {
        return JSON.parse(decodeURIComponent(value));
      } catch {
        return null;
      }
    }
  }

  private encodeForQuery(value: unknown): string {
    return JSON.stringify(value ?? {});
  }

  private syncViewStateToUrl(): void {
    const filterModel = this.gridApi?.getFilterModel?.() || {};
    const sortModel = this.gridApi?.getColumnState?.()
      ?.filter((c: any) => !!c?.sort)
      ?.map((c: any) => ({ colId: c.colId, sort: c.sort, sortIndex: c.sortIndex })) || [];

    const hasFilterModel = !!Object.keys(filterModel).length;
    const hasSortModel = !!sortModel.length;

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {
        t: this.activeTab !== 'open' ? this.activeTab : null,
        q: this.quickSearch?.trim() || null,
        p: this.previousInstanceId || null,
        f: hasFilterModel ? this.encodeForQuery(filterModel) : null,
        s: hasSortModel ? this.encodeForQuery(sortModel) : null,
        // remove legacy keys from URL
        tab: null,
        previousId: null,
        gf: null,
        gs: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private focusPreviousInstanceRow(): void {
    if (!this.gridApi || !this.previousInstanceId || this.hasAppliedPreviousRowRestore) {
      return;
    }

    let rowIndexToFocus: number | null = null;
    let matchedNode: any = null;
    this.gridApi.forEachNodeAfterFilterAndSort((node) => {
      if (rowIndexToFocus !== null) {
        return;
      }

      if (Number(node?.data?.id || 0) === this.previousInstanceId) {
        rowIndexToFocus = node.rowIndex ?? null;
        matchedNode = node;
      }
    });

    if (rowIndexToFocus !== null) {
      if (matchedNode) {
        this.gridApi.ensureNodeVisible(matchedNode, 'middle');
      } else {
        this.gridApi.ensureIndexVisible(rowIndexToFocus, 'middle');
      }

      // Restore visible context by selecting the previously opened row.
      if (matchedNode?.setSelected) {
        matchedNode.setSelected(true, true);
      }

      this.hasAppliedPreviousRowRestore = true;
    }
  }

  private normalizeText(value: unknown): string {
    return (value || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private normalizeChecklistStatus(status: unknown): string {
    const normalized = String(status || '').trim().toLowerCase().replace(/\s+/g, '_');
    if (normalized === 'draft' || normalized === 'inprocess' || normalized === 'in_process' || normalized === 'in_progress') {
      return 'in_progress';
    }
    return normalized;
  }

  private isOpenTabStatus(status: unknown): boolean {
    const normalized = this.normalizeChecklistStatus(status);
    return normalized === 'in_progress' || normalized === 'completed';
  }

  private getCurrentUserName(currentUser: any): string {
    const first = currentUser?.firstName || currentUser?.first_name || '';
    const last = currentUser?.lastName || currentUser?.last_name || '';
    return this.normalizeText(`${first} ${last}`);
  }

  private getCurrentUserIdCandidates(currentUser: any): string[] {
    const candidates = [
      currentUser?.id,
      currentUser?.user_id,
      currentUser?.userId,
      currentUser?.operator_id,
      currentUser?.operatorId,
      currentUser?.employee_id,
      currentUser?.employeeId
    ]
      .filter(value => value !== null && value !== undefined && value !== '')
      .map(value => value.toString());

    return Array.from(new Set(candidates));
  }

  private isAssignedToCurrentUser(instance: ChecklistInstance): boolean {
    const user = this.currentUser;
    if (!user || !instance) {
      return false;
    }

    const currentUserIds = this.getCurrentUserIdCandidates(user);
    const instanceIds = [
      instance?.owner_id,
      instance?.operator_id,
      (instance as any)?.ownerId,
      (instance as any)?.operatorId,
    ]
      .filter((value) => value !== null && value !== undefined && value !== '')
      .map((value) => String(value));

    if (instanceIds.some((id) => currentUserIds.includes(id))) {
      return true;
    }

    const currentUserName = this.getCurrentUserName(user);
    if (!currentUserName) {
      return false;
    }

    const ownerName = this.normalizeText(instance?.owner_name || (instance as any)?.ownerName || '');
    const operatorName = this.normalizeText(instance?.operator_name || (instance as any)?.operatorName || '');

    return ownerName === currentUserName || operatorName === currentUserName;
  }

  results = [];
  openPhotos(action?: string, instanceId?: number) {
    if (instanceId) {
      // Navigate to checklist instance page
      this.openChecklistInstance(instanceId);
    } else {
      // Legacy modal approach - you might want to remove this
      let modalRef = this.photosService.open(this.woNumber, this.partNumber, this.serialNumber, action)

      modalRef.result.then((result) => {
        this.getOpenChecklists()
        this.results = result;
      }).catch((error) => { });
    }
  }

  openChecklistInstance(instanceId: number) {
    const currentFilterModel = this.pendingFilterModelFromUrl
      ? this.pendingFilterModelFromUrl
      : (this.gridApi?.getFilterModel?.() || {});

    const currentSortModel = this.pendingSortModelFromUrl?.length
      ? this.pendingSortModelFromUrl
      : (this.gridApi?.getColumnState?.()
          ?.filter((c: any) => !!c?.sort)
          ?.map((c: any) => ({ colId: c.colId, sort: c.sort, sortIndex: c.sortIndex })) || []);

    // Navigate to the checklist instance page with query parameters
    this.router.navigate(['/inspection-checklist/instance'], {
      queryParams: {
        id: instanceId,
        returnTo: 'execution',
        p: instanceId,
        t: this.activeTab !== 'open' ? this.activeTab : null,
        q: this.quickSearch?.trim() || null,
        f: Object.keys(currentFilterModel || {}).length ? this.encodeForQuery(currentFilterModel) : null,
        s: currentSortModel.length ? this.encodeForQuery(currentSortModel) : null,
      }
    });
  }

  onGridCellClicked(event: any): void {
    const instanceId = Number(event?.data?.id || 0);
    if (instanceId <= 0) {
      return;
    }

    if (event?.colDef?.field === 'work_order_number' || event?.colDef?.field === 'id') {
      this.openChecklistInstance(instanceId);
    }
  }

  onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;

    if (this.pendingFilterModelFromUrl) {
      this.restoringGridStateFromUrl = true;
      this.gridApi.setFilterModel(this.pendingFilterModelFromUrl);
      this.gridApi.onFilterChanged();
      this.restoringGridStateFromUrl = false;
    }

    if (this.pendingSortModelFromUrl?.length) {
      this.restoringGridStateFromUrl = true;
      this.gridApi.applyColumnState({
        state: this.pendingSortModelFromUrl,
        defaultState: { sort: null }
      });
      this.restoringGridStateFromUrl = false;
    }

    this.focusPreviousInstanceRow();
  }

  onGridModelUpdated(): void {
    this.focusPreviousInstanceRow();
  }

  onGridFilterChanged(): void {
    if (this.restoringGridStateFromUrl) {
      return;
    }

    this.syncViewStateToUrl();
  }

  onGridSortChanged(): void {
    if (this.restoringGridStateFromUrl) {
      return;
    }

    this.syncViewStateToUrl();
  }

  clearAllFilters(): void {
    this.restoringGridStateFromUrl = true;

    this.quickSearch = '';
    this.activeTab = 'open';
    this.pendingFilterModelFromUrl = null;
    this.pendingSortModelFromUrl = null;

    if (this.gridApi) {
      this.gridApi.setFilterModel(null);
      this.gridApi.applyColumnState({ defaultState: { sort: null } });
      this.gridApi.onFilterChanged();
    }

    this.restoringGridStateFromUrl = false;

    this.applyTabFilter();
    this.gridApi?.deselectAll();
    this.selectedInstanceIds = [];
    this.syncViewStateToUrl();
  }

  onSelectionChanged(event: SelectionChangedEvent): void {
    const rows = event.api.getSelectedRows() as ChecklistInstance[];
    this.selectedInstanceIds = (rows || []).map((r) => Number(r?.id || 0)).filter((id) => id > 0);
    if (!this.selectedInstanceIds.length) {
      this.transferOrigin = 'selection';
    }
  }

  private async loadTransferUsers(): Promise<void> {
    try {
      const users = await this.accessControlApiService.getUsers();
      this.transferUsers = (users || [])
        .filter((u) => Number(u?.active ?? 1) === 1)
        .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
    } catch {
      this.transferUsers = [];
    }
  }

  openReassignModal(): void {
    if (!this.selectedInstanceIds.length) {
      alert('Select at least one checklist instance first.');
      return;
    }
    if (!this.reassignConfirmModal) {
      alert('Modal template not found. Please refresh and try again.');
      return;
    }
    this.modalService.open(this.reassignConfirmModal, {
      centered: true,
      size: 'md',
      backdrop: 'static',
    });
  }

  openReassignConfirmModal(modalTpl: TemplateRef<any> | null = null): void {
    if (!this.selectedInstanceIds.length) {
      alert('Select at least one checklist instance first.');
      return;
    }
    if (!this.transferTargetUserId || !this.selectedTransferUserName) {
      alert('Select a target user to transfer ownership to.');
      return;
    }

    const resolvedTpl = modalTpl || this.reassignConfirmModal || null;
    if (!resolvedTpl) {
      alert('Unable to open confirmation dialog. Please refresh and try again.');
      return;
    }

    this.modalService.open(resolvedTpl, {
      centered: true,
      size: 'md',
      backdrop: 'static',
    });
  }

  transferSelectedInstances(modalRef?: { close: () => void }): void {
    if (!this.selectedInstanceIds.length) {
      alert('Select at least one checklist instance first.');
      return;
    }
    if (!this.transferTargetUserId || !this.selectedTransferUserName) {
      alert('Select a target user to transfer ownership to.');
      return;
    }

    const confirmMsg = `Transfer ${this.selectedInstanceIds.length} selected instance(s) to ${this.selectedTransferUserName}?`;
    if (!modalRef && !confirm(confirmMsg)) return;

    this.transferLoading = true;
    this.photoChecklistV2Service
      .transferInstancesBulkAdmin(this.selectedInstanceIds, Number(this.transferTargetUserId), this.selectedTransferUserName)
      .pipe(first())
      .subscribe({
        next: (res) => {
          this.transferLoading = false;
          const transferred = Number(res?.transferred || 0);
          const skipped = Number(res?.skipped || 0);
          alert(`Transfer complete. Updated: ${transferred}${skipped > 0 ? `, Skipped: ${skipped}` : ''}.`);
          this.selectedInstanceIds = [];
          modalRef?.close();
          this.gridApi?.deselectAll();
          this.showTransferPanel = false;
          this.getOpenChecklists();
        },
        error: (err) => {
          this.transferLoading = false;
          alert(err?.error?.message || 'Bulk transfer failed.');
        },
      });
  }

  toggleTransferPanel(): void {
    if (!this.showTransferPanel && !this.canOpenTransferPanel) {
      alert('Select one or more checklist rows first, then click Reassign Selected.');
      return;
    }
    this.showTransferPanel = !this.showTransferPanel;
  }

  openTransferPanelForSingleInstance(instanceId: number): void {
    if (!this.gridApi) return;
    this.transferOrigin = 'single-row';
    this.gridApi.deselectAll();
    this.gridApi.forEachNode((node) => {
      if (Number(node?.data?.id || 0) === instanceId) {
        node.setSelected(true);
      }
    });
    this.showTransferPanel = true;
  }

  selectAllFilteredRows(): void {
    if (!this.gridApi) return;
    this.gridApi.forEachNodeAfterFilterAndSort((node) => {
      node.setSelected(true);
    });
    this.selectedInstanceIds = this.gridApi
      .getSelectedRows()
      .map((r: any) => Number(r?.id || 0))
      .filter((id: number) => id > 0);
  }

  clearSelectedRows(): void {
    this.gridApi?.deselectAll();
    this.selectedInstanceIds = [];
  }
  onDeleteInstance(instanceId: number): void {
    if (!confirm('Delete this checklist instance? This action cannot be undone.')) {
      return;
    }

    this.photoChecklistV2Service.deleteInstance(instanceId).pipe(first()).subscribe({
      next: (result) => {
        if (result?.success === false) {
          alert(result.error || 'Cannot delete this instance.');
        } else {
          this.getOpenChecklists();
        }
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to delete. You may not have permission.';
        alert(msg);
      }
    });
  }

  private canUndoSubmittedChecklist(instance: ChecklistInstance): boolean {
    return this.normalizeChecklistStatus(instance?.status || '') === 'submitted';
  }

  private canDeleteChecklist(instance: ChecklistInstance): boolean {
    return this.normalizeChecklistStatus(instance?.status || '') === 'draft';
  }

  openEditChecklistModal(instance: ChecklistInstance): void {
    const instanceId = Number(instance?.id || 0);
    if (!instanceId || !this.editChecklistModal) {
      return;
    }

    this.editingInstanceId = instanceId;
    this.editWorkOrderNumber = String(instance?.work_order_number || '');
    this.editPartNumber = String(instance?.part_number || '');
    this.editSerialNumber = String(instance?.serial_number || '');
    this.editSaving = false;

    this.modalService.open(this.editChecklistModal, {
      centered: true,
      size: 'md',
      backdrop: 'static',
    });
  }

  saveEditedChecklist(modal: { close: () => void }): void {
    const instanceId = Number(this.editingInstanceId || 0);
    if (!instanceId || this.editSaving) {
      return;
    }

    this.editSaving = true;
    this.photoChecklistConfigService.updateInstanceDetails(instanceId, {
      work_order_number: String(this.editWorkOrderNumber || '').trim(),
      part_number: String(this.editPartNumber || '').trim(),
      serial_number: String(this.editSerialNumber || '').trim(),
    }).pipe(first()).subscribe({
      next: (result) => {
        this.editSaving = false;
        if (result?.success === false) {
          return;
        }

        this.notificationService.success('Checklist details updated.');
        modal.close();
        this.getOpenChecklists();
      },
      error: () => {
        this.editSaving = false;
      }
    });
  }

  onUndoSubmittedInstance(instance: ChecklistInstance): void {
    const instanceId = Number(instance?.id || 0);
    if (!instanceId) {
      return;
    }

    SweetAlert.confirmV1({
      title: 'Undo submission?',
      text: 'Return this checklist to In Progress?',
      icon: 'warning',
      confirmButtonText: 'Undo Submit',
      confirmButtonColor: '#f7b84b',
    }).then((result: any) => {
      if (!result?.isConfirmed) {
        return;
      }

      this.photoChecklistConfigService.undoSubmittedInstance(instanceId).pipe(first()).subscribe({
        next: (response) => {
          if (response?.success === false) {
            return;
          }

          this.notificationService.success('Checklist moved back to In Progress.');
          this.getOpenChecklists();
        },
        error: () => {}
      });
    });
  }

  onArchiveInstance(instanceId: number): void {
    if (!confirm('Archive this checklist instance?')) {
      return;
    }

    this.photoChecklistV2Service.archiveInstance(instanceId).pipe(first()).subscribe({
      next: (result) => {
        if (result?.success === false) {
          alert(result.error || 'Cannot archive this instance.');
        } else {
          this.getOpenChecklists();
        }
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to archive. You may not have permission.';
        alert(msg);
      }
    });
  }

  onDownloadFinalSubmissionPdf(instanceId: number): void {
    this.photoChecklistV2Service.getFinalSubmissionPdfInfo(instanceId).pipe(first()).subscribe({
      next: (result) => {
        const status = String(result?.status || '').toLowerCase();
        if (status === 'ready' && result?.download_url) {
          this.openFinalSubmissionPdfViewer(result.download_url, instanceId);
          return;
        }

        if (status === 'queued' || status === 'processing') {
          alert('Final submission PDF is being generated. Please try again in a few seconds.');
          return;
        }

        if (status === 'failed') {
          alert(result?.error_message || 'Failed to generate final submission PDF.');
          return;
        }

        alert(result?.message || 'Final submission PDF is not available yet.');
      },
      error: (err) => {
        const msg = err?.error?.message || 'Unable to get final submission PDF link.';
        alert(msg);
      }
    });
  }

  private openFinalSubmissionPdfViewer(downloadUrl: string, instanceId: number): void {
    const normalizedUrl = this.resolveViewerUrl(downloadUrl);
    if (!normalizedUrl) {
      alert('Final submission PDF link is invalid.');
      return;
    }

    const modalRef = this.modalService.open(FileViewerModalComponent, {
      size: 'xl',
      centered: true,
      backdrop: true,
      keyboard: true,
    });

    const fileName = normalizedUrl.split('/').pop()?.split('?')[0] || `inspection-${instanceId}-final-submission.pdf`;
    modalRef.componentInstance.items = [{
      id: `instance-${instanceId}-final-pdf`,
      url: normalizedUrl,
      fileName,
    }];
    modalRef.componentInstance.initialIndex = 0;
    modalRef.componentInstance.enableNavigation = false;
    modalRef.componentInstance.url = normalizedUrl;
    modalRef.componentInstance.fileName = fileName;
  }

  private resolveViewerUrl(rawUrl: string): string {
    const raw = String(rawUrl || '').trim();
    if (!raw) {
      return '';
    }

    if (/^https?:\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) {
      return raw;
    }

    const clean = raw.startsWith('/') ? raw : `/${raw}`;
    if (clean.startsWith('/uploads/')) {
      return `https://dashboard.eye-fi.com${clean}`;
    }

    return clean;
  }

  ngOnInit(): void {
    this.isStandaloneMode = this.router.url?.includes('/inspection-checklist/execution');
    if (this.isStandaloneMode) {
      this.renderer.addClass(this.document.body, this.standaloneBodyClass);
    }

    const qp = this.activatedRoute.snapshot.queryParams || {};
    const requestedTab = String(qp['t'] || qp['tab'] || '').trim().toLowerCase();
    const allowedTabs = new Set(['open', 'submitted', 'my_assignments']);
    if (allowedTabs.has(requestedTab)) {
      this.activeTab = requestedTab;
    }

    this.quickSearch = String(qp['q'] || '').trim();

    const previousId = Number(qp['p'] || qp['previousId'] || 0);
    this.previousInstanceId = Number.isFinite(previousId) && previousId > 0 ? previousId : null;

    this.pendingFilterModelFromUrl = this.parseFilterModelFromQuery(qp['f'] || qp['gf']);
    const parsedSortModel = this.parseFilterModelFromQuery(qp['s'] || qp['gs']);
    this.pendingSortModelFromUrl = Array.isArray(parsedSortModel) ? parsedSortModel : null;
    
    this.getOpenChecklists();
    this.filteredChecklists = [...this.openChecklists]; // Initialize filtered list
    void this.loadTransferUsers();
  }

  ngOnDestroy(): void {
    try {
      this.renderer.removeClass(this.document.body, this.standaloneBodyClass);
    } catch {
      // ignore
    }
  }

}
