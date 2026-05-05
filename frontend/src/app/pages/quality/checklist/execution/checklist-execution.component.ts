import { PhotosService } from './photos/photos.service';
import { Component, Inject, OnDestroy, OnInit, Renderer2, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { WorkOrderInfoService } from '@app/core/api/work-order/work-order-info.service';
import { PhotoChecklistConfigService, ChecklistTemplate, ChecklistInstance } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { PhotoChecklistV2Service } from '@app/core/api/photo-checklist-config/photo-checklist-v2.service';
import { SharedModule } from '@app/shared/shared.module';
import { AuthenticationService } from '@app/core/services/auth.service';
import { DOCUMENT } from '@angular/common';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef } from 'ag-grid-community';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  standalone:true, 
  imports:[SharedModule, AgGridModule, NgbNavModule],
  selector: 'app-checklist-execution',
  templateUrl: './checklist-execution.component.html',
  styleUrls: ['./checklist-execution.component.scss']
})
export class ChecklistExecutionComponent implements OnInit, OnDestroy {

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
      field: 'id',
      headerName: '',
      minWidth: 80,
      maxWidth: 80,
      sortable: false,
      filter: false,
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
      headerName: 'Operator',
      minWidth: 120
    },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 110,
      cellRenderer: (params: any) => {
        const status = params.value || '';
        const badgeClass = status === 'completed' ? 'bg-success' : 
                          status === 'in_progress' ? 'bg-warning' : 
                          status === 'submitted' ? 'bg-info' : 'bg-secondary';
        return `<span class="badge ${badgeClass}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
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
          <div style="display:flex;flex-direction:column;justify-content:center;height:100%;gap:2px;">
            <div class="progress" style="height:2px;overflow:visible;flex-shrink:0;">
              <div class="progress-bar" style="width:${progress}%;background-color:${color};overflow:visible;"></div>
            </div>
            <span style="text-align:center;font-size:11px;line-height:1;">${Number(progress).toFixed(0)}%</span>
          </div>`;
      }
    },
    {
      field: 'created_at',
      headerName: 'Created Date',
      minWidth: 140,
      cellRenderer: (params: any) => {
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
      cellRenderer: () => `<button class="btn btn-sm btn-outline-secondary actions-trigger" type="button" title="Actions"><i class="mdi mdi-dots-vertical"></i></button>`
    }
  ];


  // Updated to use dynamic data instead of hardcoded
  checklistTemplates: ChecklistTemplate[] = [];
  openChecklists: ChecklistInstance[] = [];
  filteredChecklists: ChecklistInstance[] = [];
  loading: boolean;

  // Tab navigation
  activeTab = 'my_assignments';
  navOptions = [
    { name: 'My Assignments', value: 'my_assignments', icon: 'mdi mdi-account-check-outline me-1 align-bottom', count: 0, countStyle: 'primary' },
    { name: 'In Progress',    value: 'in_progress',    icon: 'mdi mdi-progress-clock me-1 align-bottom',        count: 0, countStyle: 'warning' },
    { name: 'Completed',      value: 'completed',      icon: 'mdi mdi-check-circle-outline me-1 align-bottom',  count: 0, countStyle: 'success' },
    { name: 'Submitted',      value: 'submitted',      icon: 'mdi mdi-send-check-outline me-1 align-bottom',    count: 0, countStyle: 'info'    },
    { name: 'All',            value: 'all',            icon: 'mdi mdi-format-list-bulleted me-1 align-bottom',  count: 0, countStyle: 'secondary' },
  ];
  currentUser: any = null;
  quickSearch = '';
  isStandaloneMode = false;
  private readonly standaloneBodyClass = 'standalone-checklist-execution';

  constructor(
    private photosService: PhotosService,
    private workOrderInfoService: WorkOrderInfoService,
    private photoChecklistConfigService: PhotoChecklistConfigService,
    private photoChecklistV2Service: PhotoChecklistV2Service,
    private router: Router,
    private authService: AuthenticationService,
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
    this.loading = true;
    this.photoChecklistConfigService.getInstances().pipe(first()).subscribe(data => {
      this.loading = false;
      // Load all checklists and let ag-grid handle filtering/sorting in-grid.
      this.openChecklists = data || [];
      this.updateTabCounts();
      this.applyTabFilter();
    }, () => this.loading = false);
  }

  // Alias method for consistency with template
  loadOpenChecklists() {
    this.getOpenChecklists();
  }

  onTabChange(tabValue: string): void {
    this.activeTab = tabValue;
    this.applyTabFilter();
  }

  private updateTabCounts(): void {
    const currentUserId = this.authService.currentUser()?.id?.toString();
    const currentUserName = (() => {
      const u = this.authService.currentUser();
      return `${u?.firstName || u?.first_name || ''} ${u?.lastName || u?.last_name || ''}`.trim().toLowerCase();
    })();

    for (const tab of this.navOptions) {
      if (tab.value === 'my_assignments') {
        tab.count = this.openChecklists.filter(c =>
          c.operator_id?.toString() === currentUserId ||
          c.operator_name?.toLowerCase() === currentUserName
        ).length;
      } else if (tab.value === 'all') {
        tab.count = this.openChecklists.length;
      } else {
        tab.count = this.openChecklists.filter(c => c.status === tab.value).length;
      }
    }
  }

  private applyTabFilter(): void {
    const currentUserId = this.authService.currentUser()?.id?.toString();
    const currentUserName = (() => {
      const u = this.authService.currentUser();
      return `${u?.firstName || u?.first_name || ''} ${u?.lastName || u?.last_name || ''}`.trim().toLowerCase();
    })();

    if (this.activeTab === 'all') {
      this.filteredChecklists = [...this.openChecklists];
    } else if (this.activeTab === 'my_assignments') {
      this.filteredChecklists = this.openChecklists.filter(c =>
        c.operator_id?.toString() === currentUserId ||
        c.operator_name?.toLowerCase() === currentUserName
      );
    } else {
      this.filteredChecklists = this.openChecklists.filter(c => c.status === this.activeTab);
    }

    if (this.quickSearch?.trim()) {
      const term = this.quickSearch.trim().toLowerCase();
      this.filteredChecklists = this.filteredChecklists.filter(c =>
        c.work_order_number?.toLowerCase().includes(term) ||
        c.serial_number?.toLowerCase().includes(term) ||
        c.part_number?.toLowerCase().includes(term) ||
        c.template_name?.toLowerCase().includes(term) ||
        c.operator_name?.toLowerCase().includes(term)
      );
    }
  }

  onQuickSearch(term: string): void {
    this.applyTabFilter();
  }

  private normalizeText(value: unknown): string {
    return (value || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
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
    // Navigate to the checklist instance page with query parameters
    this.router.navigate(['/inspection-checklist/instance'], {
      queryParams: { id: instanceId, returnTo: 'execution' }
    });
  }

  onGridCellClicked(event: any): void {
    const instanceId = Number(event?.data?.id || 0);
    if (instanceId <= 0) {
      return;
    }

    if (event?.colDef?.field === 'work_order_number' || event?.colDef?.field === 'id') {
      this.openChecklistInstance(instanceId);
      return;
    }

    if (event?.colDef?.field === 'actions') {
      const target = event?.event?.target as HTMLElement;
      const btn = target?.closest('.actions-trigger') as HTMLElement;
      if (btn) {
        this.showActionsMenu(btn, instanceId);
      }
    }
  }

  private _actionsMenu: HTMLElement | null = null;
  private _actionsMenuRemoveClickListener: (() => void) | null = null;

  private showActionsMenu(anchor: HTMLElement, instanceId: number): void {
    this.closeActionsMenu();

    const menu = this.document.createElement('div');
    menu.innerHTML = `
      <div style="position:fixed;z-index:9999;background:#fff;border:1px solid #dee2e6;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.15);min-width:160px;padding:4px 0;">
        <a class="action-archive" href="javascript:void(0)" style="display:flex;align-items:center;padding:8px 16px;color:#f0ad4e;text-decoration:none;font-size:14px;white-space:nowrap;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='transparent'">
          <i class="mdi mdi-archive-outline" style="margin-right:8px;"></i>Archive
        </a>
        <a class="action-delete" href="javascript:void(0)" style="display:flex;align-items:center;padding:8px 16px;color:#dc3545;text-decoration:none;font-size:14px;white-space:nowrap;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='transparent'">
          <i class="mdi mdi-trash-can-outline" style="margin-right:8px;"></i>Delete
        </a>
      </div>`;

    const inner = menu.firstElementChild as HTMLElement;
    this.document.body.appendChild(inner);
    this._actionsMenu = inner;

    // Position below the anchor button
    const rect = anchor.getBoundingClientRect();
    const menuW = 160;
    let left = rect.right - menuW;
    if (left < 4) left = 4;
    inner.style.top = `${rect.bottom + 4}px`;
    inner.style.left = `${left}px`;

    // Wire up item clicks
    inner.querySelector('.action-archive')?.addEventListener('click', () => {
      this.closeActionsMenu();
      this.onArchiveInstance(instanceId);
    });
    inner.querySelector('.action-delete')?.addEventListener('click', () => {
      this.closeActionsMenu();
      this.onDeleteInstance(instanceId);
    });

    // Close on outside click
    const close = (e: MouseEvent) => {
      if (!inner.contains(e.target as Node) && e.target !== anchor) {
        this.closeActionsMenu();
      }
    };
    setTimeout(() => {
      this._actionsMenuRemoveClickListener = this.renderer.listen(this.document, 'click', close);
    });
  }

  private closeActionsMenu(): void {
    if (this._actionsMenu) {
      this._actionsMenu.remove();
      this._actionsMenu = null;
    }
    if (this._actionsMenuRemoveClickListener) {
      this._actionsMenuRemoveClickListener();
      this._actionsMenuRemoveClickListener = null;
    }
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

  ngOnInit(): void {
    this.isStandaloneMode = this.router.url?.includes('/inspection-checklist/execution');
    if (this.isStandaloneMode) {
      this.renderer.addClass(this.document.body, this.standaloneBodyClass);
    }
    
    this.getOpenChecklists();
    this.filteredChecklists = [...this.openChecklists]; // Initialize filtered list
  }

  ngOnDestroy(): void {
    try {
      this.renderer.removeClass(this.document.body, this.standaloneBodyClass);
    } catch {
      // ignore
    }
    this.closeActionsMenu();
  }

}
