import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GetRowIdParams, GridApi, GridReadyEvent, RowDoubleClickedEvent } from 'ag-grid-community';
import { Subscription } from 'rxjs';

import { PhotoChecklistConfigService, ChecklistTemplate } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { TemplateManagerActionsRendererComponent } from './components/template-manager-actions-renderer.component';

@Component({
  selector: 'app-checklist-template-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AgGridModule],
  template: `
    <div class="container-fluid">
      <div class="row justify-content-center">
        <div class="col-12">
          <nav aria-label="breadcrumb" class="mb-3">
            <ol class="breadcrumb mb-0">
              <li class="breadcrumb-item">
                <a href="#" class="text-decoration-none" (click)="$event.preventDefault()">
                  <i class="mdi mdi-home-outline me-1"></i>Quality
                </a>
              </li>
              <li class="breadcrumb-item active" aria-current="page">Template Manager</li>
            </ol>
          </nav>

          <div class="mb-4">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <div class="d-flex align-items-center">
                <div class="bg-primary bg-gradient rounded-circle me-3 d-flex align-items-center justify-content-center" style="width: 60px; height: 60px;">
                  <i class="mdi mdi-clipboard-text text-white fs-4"></i>
                </div>
                <div>
                  <h2 class="mb-1 text-primary">Template Manager</h2>
                  <p class="text-muted mb-0">Create and manage inspection checklist templates</p>
                </div>
              </div>
              <div class="d-flex gap-2">
                <button
                  type="button"
                  class="btn btn-primary"
                  (click)="createNewTemplate()"
                  title="Create new checklist template">
                  <i class="mdi mdi-plus me-2"></i>New Template
                </button>
              </div>
            </div>
          </div>

          <div class="card shadow-sm border-0">
            <div class="card-header">
              <div class="d-flex align-items-center flex-wrap gap-3">
                <div class="form-icon">
                  <div class="d-flex align-items-center gap-3">
                    <div class="d-flex align-items-center">
                      <label class="form-label mb-0 me-2 fw-semibold">Search:</label>
                      <div class="input-group" style="min-width: 300px;">
                        <input
                          type="text"
                          class="form-control"
                          [(ngModel)]="templateSearch"
                          placeholder="Search templates..."
                          (ngModelChange)="onTemplateSearch()">
                        <button
                          class="btn btn-outline-secondary"
                          type="button"
                          *ngIf="templateSearch"
                          (click)="clearTemplateSearch()">
                          <i class="mdi mdi-close"></i>
                        </button>
                      </div>
                    </div>

                    <div class="input-group" style="min-width: 320px;">
                      <select class="form-select" [(ngModel)]="templateFilters.category" (change)="onTemplateSearch()">
                        <option value="">All Categories</option>
                        <option value="assembly">Assembly</option>
                        <option value="inspection">Inspection</option>
                        <option value="testing">Testing</option>
                        <option value="packaging">Packaging</option>
                        <option value="shipping">Shipping</option>
                        <option value="quality_control">Quality Control</option>
                      </select>
                      <select class="form-select" [(ngModel)]="templateFilters.activeOnly" (change)="onTemplateSearch()">
                        <option [ngValue]="null">All Status</option>
                        <option [ngValue]="true">Active Only</option>
                        <option [ngValue]="false">Inactive Only</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button class="btn btn-outline-secondary" (click)="loadTemplates()" title="Refresh data">
                  <i class="mdi mdi-refresh me-1"></i>Refresh
                </button>

                <div class="ms-auto">
                  <div class="d-flex align-items-center">
                    <div class="me-4 d-flex gap-4 small text-muted">
                      <span>
                        <i class="mdi mdi-database text-info me-1"></i>
                        <strong>{{templates.length}}</strong> Total
                      </span>
                      <span>
                        <i class="mdi mdi-check-circle text-success me-1"></i>
                        <strong>{{getActiveTemplatesCount()}}</strong> Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card-body p-0">
              <ng-container *ngIf="filteredTemplates.length; else noRecords">
                <ag-grid-angular
                  class="ag-theme-quartz no-border"
                  style="width: 100%; height: calc(100vh - 319px); min-height: 400px;"
                  [rowData]="filteredTemplates"
                  [getRowId]="versionsGetRowId"
                  [columnDefs]="versionsColumnDefs"
                  [autoGroupColumnDef]="versionsAutoGroupColumnDef"
                  [groupDisplayType]="'singleColumn'"
                  [groupDefaultExpanded]="versionsGroupDefaultExpanded"
                  [defaultColDef]="versionsDefaultColDef"
                  [overlayNoRowsTemplate]="versionsNoRowsOverlay"
                  [suppressCellFocus]="true"
                  (gridReady)="onVersionsGridReady($event)"
                  (rowDoubleClicked)="onVersionsGridRowDoubleClicked($event)">
                </ag-grid-angular>
              </ng-container>
              <ng-template #noRecords>
                <div class="d-flex flex-column align-items-center justify-content-center p-5">
                  <div class="text-center" style="max-width: 500px;">
                    <div class="mb-4">
                      <div class="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto" style="width: 120px; height: 120px;">
                        <i class="mdi mdi-clipboard-text text-primary" style="font-size: 3rem;"></i>
                      </div>
                    </div>
                    <h4 class="text-body-emphasis mb-3">No Templates Found</h4>
                    <p class="text-muted mb-4">
                      No templates match your current filters. Try adjusting your criteria or create a new template.
                    </p>
                    <button type="button" class="btn btn-primary" (click)="createNewTemplate()">
                      <i class="mdi mdi-plus me-2"></i>Create First Template
                    </button>
                  </div>
                </div>
              </ng-template>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ChecklistTemplateListComponent implements OnInit, OnDestroy {
  templates: ChecklistTemplate[] = [];
  loading = false;
  saving = false;

  templateSearch = '';
  templateFilters = {
    category: '',
    partNumber: '',
    activeOnly: true as boolean | null
  };

  readonly versionsNoRowsOverlay = '<span class="text-muted">No template versions match your current filters.</span>';
  filteredTemplates: ChecklistTemplate[] = [];
  private versionsGridApi: GridApi<ChecklistTemplate> | null = null;
  private pendingFocusId: number | null = null;
  private queryParamSub?: Subscription;
  private readonly returnFocusStorageKey = 'checklist_template_manager_focus_id';
  private expandAllGroupsForFocus = false;
  readonly versionsGetRowId = (params: GetRowIdParams<ChecklistTemplate>): string =>
    String(params.data?.id ?? '');

  readonly versionsDefaultColDef: ColDef<ChecklistTemplate> = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true
  };
  versionsGroupDefaultExpanded = 0;
  readonly versionsAutoGroupColumnDef: ColDef<ChecklistTemplate> = {
    headerName: 'Template Family',
    minWidth: 300,
    pinned: 'left',
    cellRendererParams: {
      suppressCount: false,
      innerRenderer: (params: any) => {
        const firstChild = params.node?.allLeafChildren?.[0]?.data
          ?? params.node?.childrenAfterGroup?.[0]?.allLeafChildren?.[0]?.data;
        if (firstChild) {
          return this.getTemplateFamilyLabel(firstChild);
        }
        return params.value || '';
      }
    },
  };

  readonly versionsColumnDefs: ColDef<ChecklistTemplate>[] = [
    {
      headerName: 'Family',
      colId: 'family_group',
      hide: true,
      rowGroup: true,
      // Group by template_group_id so all versions stay together even when
      // part_number or customer_name changes across versions.
      valueGetter: (params: any) => {
        if (!params.data) return null;
        const raw = (params.data as any)?.template_group_id;
        const id = Number(raw || 0);
        return String(id > 0 ? id : Number(params.data?.id || 0));
      },
      filter: true,
      sortable: true,
      floatingFilter: false,
    },
    {
      headerName: 'Actions',
      colId: 'actions',
      pinned: 'left',
      sortable: false,
      filter: false,
      suppressSizeToFit: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-start', height: '100%' },
      cellRenderer: TemplateManagerActionsRendererComponent,
      cellRendererParams: (params: any) => {
        const node = params.node;
        const data: ChecklistTemplate | null = node?.data ?? null;
        // Determine latest published version in this family group
        const siblings: ChecklistTemplate[] = (node?.parent?.allLeafChildren ?? [])
          .map((n: any) => n.data as ChecklistTemplate)
          .filter((d: ChecklistTemplate) => d && !d.is_draft);
        const latestVersion = siblings
          .map((d: ChecklistTemplate) => String(d.version || ''))
          .sort((a: string, b: string) => this.compareVersionNumbers(b, a))[0] ?? null;
        const isLatest = data
          ? (data.is_draft || !latestVersion || String(data.version) === latestVersion)
          : false;
        return {
          onEdit: (t: ChecklistTemplate) => this.editTemplate(t),
          onView: (t: ChecklistTemplate) => this.viewTemplate(t),
          isLatest,
        };
      }
    },
    {
      headerName: 'Name',
      field: 'name',
      minWidth: 240,
      flex: 1,
      valueGetter: (params: any) => this.getVersionsRowTemplate(params)?.name || '—'
    },
    {
      headerName: 'Part Number',
      field: 'part_number',
      width: 150,
      minWidth: 120,
      valueGetter: (params: any) => this.getVersionsRowTemplate(params)?.part_number || '—'
    },
    {
      headerName: 'Versions',
      colId: 'version_count',
      width: 100,
      minWidth: 90,
      filter: false,
      sortable: false,
      // Leaf rows: blank. Group rows: show total child count.
      cellRenderer: (params: any) => {
        if (params.data) return '';
        const count = params.node?.allChildrenCount ?? params.node?.childrenAfterGroup?.length ?? 0;
        return count ? `<span class="badge bg-secondary">${count} version${count !== 1 ? 's' : ''}</span>` : '';
      }
    },
    {
      headerName: 'Latest Version',
      field: 'version',
      width: 130,
      minWidth: 110,
      sort: 'desc',
      comparator: (valueA: string, valueB: string) => this.compareVersionNumbers(String(valueA || ''), String(valueB || '')),
      cellRenderer: (params: any) => {
        // Leaf row: show own version
        if (params.data) {
          return `<span class="badge bg-success bg-gradient">v${params.value || ''}</span>`;
        }
        // Group row: find the highest version among children
        const children: any[] = params.node?.allLeafChildren ?? [];
        const published = children.filter((n: any) => !n.data?.is_draft);
        const pool = published.length ? published : children;
        const latest = pool
          .map((n: any) => String(n.data?.version || ''))
          .sort((a: string, b: string) => this.compareVersionNumbers(b, a))[0];
        return latest ? `<span class="badge bg-success bg-gradient">v${latest}</span>` : '';
      }
    },
    {
      headerName: 'Status',
      colId: 'status',
      width: 110,
      minWidth: 100,
      filter: false,
      cellRenderer: (params: any) => {
        if (!params.data) return '';
        if (Boolean(params.data.is_draft)) {
          return '<span class="badge bg-warning text-dark">Draft</span>';
        }
        return Boolean(params.data.is_active)
          ? '<span class="badge bg-success">Active</span>'
          : '<span class="badge bg-danger">Inactive</span>';
      }
    },
    {
      headerName: 'Customer',
      width: 180,
      minWidth: 150,
      valueGetter: (params: any) => {
        const template = this.getVersionsRowTemplate(params);
        return template?.customer_name || template?.customer_part_number || '—';
      }
    },
    {
      headerName: 'Active Instances',
      field: 'active_instances',
      width: 130,
      minWidth: 110,
      filter: false,
      sort: 'desc' as const,
      valueGetter: (params: any) => {
        if (params.data) return Number(params.data.active_instances || 0);
        // Group row: sum across all leaf children
        return (params.node?.allLeafChildren ?? [])
          .reduce((sum: number, n: any) => sum + Number(n.data?.active_instances || 0), 0);
      },
      cellRenderer: (params: any) => {
        const count = Number(params.value || 0);
        if (!count) return '<span class="text-muted">—</span>';
        return `<span class="badge bg-primary bg-gradient">${count} active</span>`;
      }
    },
    {
      headerName: 'Items',
      field: 'item_count',
      width: 80,
      minWidth: 70,
      filter: false,
      valueGetter: (params: any) => Number(params.data?.item_count || 0)
    },
    {
      headerName: 'Created',
      field: 'created_at',
      width: 130,
      minWidth: 120,
      valueFormatter: (params: any) => this.formatGridDate(params.value)
    },
    {
      headerName: 'Created By',
      field: 'created_by_name',
      width: 140,
      minWidth: 120,
      valueGetter: (params: any) => params.data?.created_by_name || ''
    }
  ];

  constructor(
    private readonly configService: PhotoChecklistConfigService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Subscribe to queryParams so it fires on every navigation to this route,
    // including when Angular reuses the component instance on Back navigation.
    this.queryParamSub = this.route.queryParamMap.subscribe(params => {
      const focusId = Number(params.get('focusId') || this.consumeStoredFocusId() || 0);
      this.expandAllGroupsForFocus = focusId > 0;
      this.versionsGroupDefaultExpanded = this.expandAllGroupsForFocus ? -1 : 0;
      if (focusId > 0) {
        this.pendingFocusId = focusId;
        // If grid + data are already ready (component reused), focus immediately
        if (this.versionsGridApi && this.filteredTemplates.length) {
          this.scheduleFocusAttempt(focusId);
        }
      }
    });
    this.loadTemplates();
  }

  ngOnDestroy(): void {
    this.queryParamSub?.unsubscribe();
  }

  onVersionsGridReady(event: GridReadyEvent<ChecklistTemplate>): void {
    this.versionsGridApi = event.api;
    // Focus is attempted when data/model updates arrive; this handles grouped rows reliably.
    event.api.addEventListener('firstDataRendered', () => {
      if (this.pendingFocusId) {
        this.scheduleFocusAttempt(this.pendingFocusId);
      }
    });
    event.api.addEventListener('modelUpdated', () => {
      if (this.pendingFocusId) {
        this.scheduleFocusAttempt(this.pendingFocusId);
      }
    });
  }

  private focusTemplateRow(templateId: number): boolean {
    const api = this.versionsGridApi;
    if (!api) return false;

    const targetNode: any = api.getRowNode(String(templateId || ''));
    if (!targetNode?.data) return false;

    // Step 1: expand all ancestor groups for this row
    let parent = targetNode.parent;
    while (parent && parent.group) {
      parent.setExpanded(true);
      parent = parent.parent;
    }

    // Step 2: only succeed when the row is actually displayable after expand.
    // AG Grid may need one or more model update cycles before rowIndex is set.
    if (targetNode.rowIndex == null || targetNode.rowIndex < 0) {
      return false;
    }

    api.ensureNodeVisible(targetNode, 'middle');
    targetNode.setSelected?.(true, true);
    api.flashCells({ rowNodes: [targetNode] });

    this.pendingFocusId = null;
    this.clearStoredFocusId();
    return true;
  }

  private scheduleFocusAttempt(templateId: number, attempt: number = 0): void {
    const maxAttempts = 8;
    const succeeded = this.focusTemplateRow(templateId);
    if (succeeded || attempt >= maxAttempts) {
      return;
    }

    setTimeout(() => this.scheduleFocusAttempt(templateId, attempt + 1), 120);
  }

  private storeFocusId(templateId: number): void {
    const safeId = Number(templateId || 0);
    if (safeId <= 0) {
      return;
    }
    sessionStorage.setItem(this.returnFocusStorageKey, String(safeId));
  }

  private consumeStoredFocusId(): number {
    const raw = sessionStorage.getItem(this.returnFocusStorageKey);
    const id = Number(raw || 0);
    if (id > 0) {
      return id;
    }
    return 0;
  }

  private clearStoredFocusId(): void {
    sessionStorage.removeItem(this.returnFocusStorageKey);
  }

  private updateFilteredTemplates(): void {
    const search = this.templateSearch.trim().toLowerCase();
    const category = String(this.templateFilters.category || '').trim();
    const activeOnly = this.templateFilters.activeOnly;

    // Step 1: Build a set of family group IDs that pass the activeOnly filter.
    // "Active Only" means: show families that have at least one active or draft version —
    // but once a family qualifies, ALL its versions are included so history is preserved.
    const qualifiedGroupIds = new Set<number>();
    if (activeOnly !== null) {
      for (const t of this.templates) {
        const groupId = Number((t as any).template_group_id ?? t.id);
        if (!qualifiedGroupIds.has(groupId)) {
          const familyTemplates = this.templates.filter(
            x => Number((x as any).template_group_id ?? x.id) === groupId
          );
          const hasMatch = familyTemplates.some(x =>
            activeOnly === true
              ? (Boolean(x.is_active) || Boolean(x.is_draft))
              : (!Boolean(x.is_active) && !Boolean(x.is_draft))
          );
          if (hasMatch) qualifiedGroupIds.add(groupId);
        }
      }
    }

    this.filteredTemplates = this.templates.filter(template => {
      const matchesSearch = !search || [
        template.name,
        template.description,
        template.part_number,
        template.product_type,
        template.version,
        (template as any).customer_name,
        (template as any).customer_part_number
      ].some(value => String(value || '').toLowerCase().includes(search));

      const matchesCategory = !category || String(template.category || '') === category;

      // Apply active filter at family level, not row level
      const groupId = Number((template as any).template_group_id ?? template.id);
      const matchesActive = activeOnly === null || qualifiedGroupIds.has(groupId);

      return matchesSearch && matchesCategory && matchesActive;
    }).sort((a, b) => {
      const familyA = this.getTemplateFamilyLabel(a).toLowerCase();
      const familyB = this.getTemplateFamilyLabel(b).toLowerCase();
      if (familyA !== familyB) {
        return familyA.localeCompare(familyB);
      }

      const versionOrder = this.compareVersionNumbers(String(b.version || ''), String(a.version || ''));
      if (versionOrder !== 0) {
        return versionOrder;
      }

      const updatedA = Date.parse(a.updated_at || a.created_at || '') || 0;
      const updatedB = Date.parse(b.updated_at || b.created_at || '') || 0;
      return updatedB - updatedA;
    });
  }

  private getTemplateFamilyLabel(template: ChecklistTemplate | null): string {
    if (!template) {
      return 'Uncategorized';
    }

    const part = String(template.part_number || '').trim();
    const name = String(template.name || '').trim();
    const customer = String((template as any).customer_name || (template as any).customer_part_number || '').trim();

    const parts: string[] = [];
    if (part) parts.push(part);
    if (name) parts.push(name);
    if (customer) parts.push(customer);

    return parts.length > 0 ? parts.join(' | ') : 'Uncategorized';
  }

  private getVersionsRowTemplate(params: any): ChecklistTemplate | null {
    if (params?.data) {
      return params.data as ChecklistTemplate;
    }

    const firstLeaf = params?.node?.allLeafChildren?.[0]?.data
      ?? params?.node?.childrenAfterGroup?.[0]?.allLeafChildren?.[0]?.data;
    if (firstLeaf) {
      return firstLeaf as ChecklistTemplate;
    }

    const groupKey = String(params?.node?.key || '').trim();
    if (!groupKey) {
      return null;
    }

    return this.templates.find(template => {
      const groupId = Number((template as any).template_group_id ?? template.id);
      return String(groupId) === groupKey;
    }) || null;
  }

  private compareVersionNumbers(version1: string, version2: string): number {
    const parseVersion = (raw: string): number[] => {
      const cleaned = String(raw || '').trim().replace(/^v/i, '');
      if (!cleaned) {
        return [0];
      }

      return cleaned.split('.').map(part => {
        const match = part.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      });
    };

    const v1 = parseVersion(version1);
    const v2 = parseVersion(version2);
    const maxLength = Math.max(v1.length, v2.length);

    for (let index = 0; index < maxLength; index++) {
      const segment1 = v1[index] ?? 0;
      const segment2 = v2[index] ?? 0;
      if (segment1 !== segment2) {
        return segment1 - segment2;
      }
    }

    return 0;
  }

  loadTemplates(): void {
    this.loading = true;
    this.configService.getTemplatesIncludingInactive().subscribe({
      next: (templates) => {
        this.templates = (templates || []).map<ChecklistTemplate>((t: any) => ({
          ...t,
          is_active: t?.is_active === true || t?.is_active === 1 || t?.is_active === '1',
          is_draft: t?.is_draft === true || t?.is_draft === 1 || t?.is_draft === '1'
        }));
        this.updateFilteredTemplates();
        this.loading = false;
        // Wait for AG Grid to process the new rowData binding before trying to focus
        if (this.pendingFocusId && this.versionsGridApi) {
          this.scheduleFocusAttempt(this.pendingFocusId);
        }
      },

      error: (error) => {
        console.error('Error loading templates:', error);
        this.loading = false;
      }
    });
  }

  onTemplateSearch(): void {
    this.updateFilteredTemplates();
  }

  clearTemplateSearch(): void {
    this.templateSearch = '';
    this.updateFilteredTemplates();
  }

  getActiveTemplatesCount(): number {
    return this.templates.filter(template => template.is_active).length;
  }

  onVersionsGridRowDoubleClicked(event: RowDoubleClickedEvent<ChecklistTemplate>): void {
    const template = event.data;
    if (!template) {
      return;
    }

    if (template.is_draft) {
      this.editTemplate(template);
      return;
    }

    this.viewTemplate(template);
  }

  createNewTemplate(): void {
    this.router.navigate(['/inspection-checklist/template-editor'], {
      queryParams: { returnTo: 'template-manager' }
    });
  }

  viewTemplate(template: ChecklistTemplate): void {
    this.storeFocusId(template.id);
    this.router.navigate(['/inspection-checklist/template-editor', template.id], {
      queryParams: { returnTo: 'template-manager', readonly: '1', focusId: template.id }
    });
  }

  editTemplate(template: ChecklistTemplate): void {
    this.storeFocusId(template.id);
    this.router.navigate(['/inspection-checklist/template-editor', template.id], {
      queryParams: { returnTo: 'template-manager' }
    });
  }

  deleteTemplate(template: ChecklistTemplate): void {
    if (!template) {
      return;
    }

    if (!confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) {
      return;
    }

    this.configService.deleteTemplate(template.id).subscribe({
      next: (response) => {
        if (response?.success) {
          this.loadTemplates();
          return;
        }

        const count = (response as any)?.instance_count ?? 0;
        const backendError = (response as any)?.error || (response as any)?.message || 'Cannot delete template.';
        if (count > 0) {
          alert(`${backendError} (${count} existing instance${count !== 1 ? 's' : ''})`);
        } else {
          alert(backendError);
        }
      },
      error: (error) => {
        console.error('Error deleting template:', error);
        alert(error?.error?.error || error?.message || 'Error deleting template. Please try again.');
      }
    });
  }

  hardDeleteTemplate(template: ChecklistTemplate): void {
    if (!template || template.is_draft) {
      return;
    }

    if (template.is_active) {
      alert('Hard delete is only available for inactive templates. Deactivate it first.');
      return;
    }

    if (!confirm(`Permanently delete "${template.name}" (v${template.version})? This cannot be undone.\n\nThis will remove the template and its line items from the database.`)) {
      return;
    }

    this.configService.hardDeleteTemplate(template.id).subscribe({
      next: (response) => {
        if (response?.success) {
          this.loadTemplates();
          return;
        }

        const backendError = (response as any)?.error || (response as any)?.message || 'Cannot hard delete template.';
        alert(backendError);
      },
      error: (error) => {
        console.error('Error hard deleting template:', error);
        alert(error?.error?.error || error?.message || 'Error hard deleting template. Please try again.');
      }
    });
  }

  discardDraft(template: ChecklistTemplate): void {
    if (!template?.is_draft) {
      return;
    }

    if (!confirm(`Discard draft "${template.name}"? Any unpublished changes will be lost.`)) {
      return;
    }

    this.configService.discardDraft(template.id).subscribe({
      next: (response) => {
        if (response?.success) {
          this.loadTemplates();
          return;
        }

        const backendError = (response as any)?.error || (response as any)?.message || 'Cannot discard draft.';
        alert(backendError);
      },
      error: (error) => {
        console.error('Error discarding draft:', error);
        alert(error?.error?.error || error?.message || 'Error discarding draft. Please try again.');
      }
    });
  }

  createNewParentVersion(template: ChecklistTemplate): void {
    if (!template || this.saving) {
      return;
    }

    this.saving = true;
    this.configService.createParentVersion(template.id).subscribe({
      next: (response) => {
        this.saving = false;

        if (!response?.success || !response?.template_id) {
          alert((response as any)?.error || (response as any)?.message || 'Failed to create new major version.');
          return;
        }

        this.loadTemplates();
      },
      error: (error) => {
        console.error('Error creating major version:', error);
        this.saving = false;
        alert(error?.error?.error || error?.message || 'An error occurred while creating the new major version.');
      }
    });
  }

  viewRevisionHistory(template: ChecklistTemplate): void {
    if (!template?.quality_document_metadata?.document_id) {
      alert('This template does not have document control enabled.');
      return;
    }

    this.router.navigate(['/inspection-checklist/template-editor', template.id], {
      queryParams: { mode: 'view', returnTo: 'template-manager' }
    });
  }

  private formatGridDate(value: unknown): string {
    const dateValue = String(value || '');
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

}
