import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal, NgbModalRef, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridOptions } from 'ag-grid-community';
import { ContinuityModalService } from '@app/pages/operations/labels/continuity-test-modal/continuity-test-modal.component';
import { PlacardModalService } from '@app/shared/components/placard-modal/placard-modal.component';
import { ChecklistTemplate, ChecklistInstance, ChecklistItem } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { PhotoChecklistV2Service } from '@app/core/api/photo-checklist-config/photo-checklist-v2.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';
import { ChecklistActionsCellRendererComponent } from './renderers/checklist-actions-cell-renderer.component';
import { ChecklistTemplatePreviewModalComponent } from './components/checklist-template-preview-modal.component';

@Component({
    selector: 'app-checklist',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, NgbModule, AgGridModule, ChecklistTemplatePreviewModalComponent],
    templateUrl: './checklist.component.html',
    styleUrls: []
})
export class ChecklistComponent implements OnInit {
    templates: ChecklistTemplate[] = [];
    allTemplates: ChecklistTemplate[] = [];
    allPublishedTemplates: ChecklistTemplate[] = [];
    instances: ChecklistInstance[] = [];
    templateGridRows: ChecklistTemplate[] = [];
    instanceGridRows: ChecklistInstance[] = [];
    loading = false;
    selectedTemplate: ChecklistTemplate | null = null;

    // New instance form data
    newInstance = {
        workOrder: '',
        partNumber: '',
        serialNumber: ''
    };
    newInstanceCount = 1;
    newInstanceSerialNumbers: string[] = [''];
    creatingInstances = false;

    // Tab management
    activeTab = 'templates';
    templateSearch = '';

    // Modal management
    private createInstanceModalRef: NgbModalRef | null = null;
    private previewModalRef: NgbModalRef | null = null;
    @ViewChild('createInstanceModal') createInstanceModalTemplateRef?: TemplateRef<any>;
    @ViewChild('previewTemplateModal') previewTemplateModalRef?: TemplateRef<any>;

    // AG Grid
    defaultColDef: ColDef = {
        sortable: true,
        resizable: true,
        filter: true,
        floatingFilter: true
    };

    readonly templateAutoGroupColumnDef: ColDef = {
        headerName: 'Template Family',
        minWidth: 300,
        pinned: 'left',
        cellRendererParams: {
            suppressCount: false,
            innerRenderer: (params: any) => {
                const firstChild = params.node?.allLeafChildren?.[0]?.data
                    ?? params.node?.childrenAfterGroup?.[0]?.allLeafChildren?.[0]?.data;
                if (firstChild) {
                    return this.getTemplateFamilyLabel(firstChild, this.resolveFamilyGroupId(firstChild));
                }
                return params.value || '';
            }
        }
    };

    templateColumnDefs: ColDef[] = [
        {
            headerName: 'Family',
            colId: 'family_group',
            hide: true,
            rowGroup: true,
            // Group by template_group_id so all versions of a family stay together
            // even when part_number or customer_name changes across versions.
            valueGetter: (params: any) => {
                if (!params.data) return null;
                return String(this.resolveFamilyGroupId(params.data));
            },
            filter: true,
            sortable: true,
            floatingFilter: false
        },
        {
            headerName: '',
            colId: 'actions',
            pinned: 'left',
            width: 105,
            minWidth: 105,
            sortable: false,
            filter: false,
            floatingFilter: false,
            cellRenderer: ChecklistActionsCellRendererComponent,
            cellRendererParams: (params: any) => {
                if (!params.data) return {};
                return {
                    mode: 'template',
                    onPreview: (data: ChecklistTemplate) => {
                        if (this.previewTemplateModalRef) {
                            this.openPreviewModal(data, this.previewTemplateModalRef);
                        }
                    },
                    onStart: (data: ChecklistTemplate) => {
                        void this.openCreateInstanceModal(data);
                    }
                };
            }
        },
        {
            headerName: 'Name',
            colId: 'name',
            minWidth: 220,
            flex: 2,
            valueGetter: (params: any) => {
                if (!params.data) return undefined;
                return params.data.name || params.data.original_filename || null;
            },
            aggFunc: (params: any) => params.values.find((v: any) => v) || null
        },
        {
            headerName: 'Customer',
            colId: 'customer',
            minWidth: 150,
            flex: 1,
            valueGetter: (params: any) => {
                if (!params.data) return undefined;
                return params.data.customer_name || params.data.customer_part_number || '—';
            },
            aggFunc: (params: any) => params.values.find((v: any) => v && v !== '—') || '—'
        },
        {
            headerName: 'Part Number',
            colId: 'part_number',
            minWidth: 140,
            valueGetter: (params: any) => {
                if (!params.data) return undefined;
                return params.data.part_number || '—';
            },
            aggFunc: (params: any) => params.values.find((v: any) => v && v !== '—') || '—'
        },
        {
            headerName: 'Versions',
            colId: 'version_count',
            width: 100,
            minWidth: 90,
            filter: false,
            sortable: false,
            cellRenderer: (params: any) => {
                if (params.data) return '';
                const count = params.node?.allChildrenCount ?? params.node?.childrenAfterGroup?.length ?? 0;
                return count ? `<span class="badge bg-secondary">${count} version${count !== 1 ? 's' : ''}</span>` : '';
            }
        },
        {
            headerName: 'Version',
            field: 'version',
            width: 130,
            minWidth: 110,
            sort: 'desc',
            comparator: (a: string, b: string) => this.compareVersionNumbers(String(a || ''), String(b || '')),
            cellRenderer: (params: any) => {
                if (params.data) {
                    const version = String(params.value || '');
                    const siblings: any[] = params.node?.parent?.allLeafChildren ?? [];
                    const maxVersion = siblings
                        .map((n: any) => String(n.data?.version || ''))
                        .sort((a: string, b: string) => this.compareVersionNumbers(b, a))[0] ?? version;
                    return `<span class="badge bg-success bg-gradient">v${version}</span>`;
                }
                // Group row: show highest version among children
                const children: any[] = params.node?.allLeafChildren ?? [];
                const latest = children
                    .map((n: any) => String(n.data?.version || ''))
                    .sort((a: string, b: string) => this.compareVersionNumbers(b, a))[0];
                return latest ? `<span class="badge bg-success bg-gradient">v${latest}</span>` : '';
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
            headerName: 'Status',
            colId: 'status',
            width: 110,
            minWidth: 90,
            filter: false,
            cellRenderer: (params: any) => {
                if (!params.data) return '';
                if (!Boolean(params.data.is_active)) {
                    return '<span class="badge bg-secondary">Inactive</span>';
                }
                // Check if this is the latest version in the family
                const version = String(params.data.version || '');
                const siblings: any[] = params.node?.parent?.allLeafChildren ?? [];
                const maxVersion = siblings
                    .map((n: any) => String(n.data?.version || ''))
                    .sort((a: string, b: string) => this.compareVersionNumbers(b, a))[0] ?? version;
                return version === maxVersion
                    ? '<span class="badge bg-primary">Latest</span>'
                    : '<span class="badge bg-success">Active</span>';
            }
        },
        {
            headerName: 'Published',
            colId: 'published_at',
            width: 130,
            minWidth: 110,
            filter: false,
            valueGetter: (params: any) => {
                if (!params.data) return undefined;
                return params.data.published_at || null;
            },
            aggFunc: (params: any) => params.values.find((v: any) => v) || null,
            cellRenderer: (params: any) => {
                const val = params.value;
                if (!val) return '<span class="text-muted small">—</span>';
                const date = new Date(val);
                const formatted = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                return `<span class="text-muted small">${formatted}</span>`;
            }
        },
        {
            headerName: 'Active Instances',
            field: 'active_instances',
            width: 130,
            minWidth: 110,
            filter: false,
            valueGetter: (params: any) => {
                if (!params.data) return undefined;
                return Number(params.data.active_instances || 0);
            },
            aggFunc: 'sum',
            cellRenderer: (params: any) => {
                const count = Number(params.value || 0);
                if (!count) return '<span class="text-muted">—</span>';
                return `<span class="badge bg-primary bg-gradient">${count} active</span>`;
            }
        }
    ];

    instanceColumnDefs: ColDef[] = [
        {
            headerName: 'Work Order',
            field: 'work_order_number',
            minWidth: 150,
            pinned: 'left',
            cellRenderer: (params: any) => `<strong>${params.value || '-'}</strong>`
        },
        {
            headerName: 'Template',
            field: 'template_name',
            minWidth: 220,
            flex: 1
        },
        {
            headerName: 'Part Number',
            field: 'part_number',
            minWidth: 150,
            cellRenderer: (params: any) => params.value ? `<code>${params.value}</code>` : '-'
        },
        {
            headerName: 'Serial Number',
            field: 'serial_number',
            minWidth: 170,
            cellRenderer: (params: any) => params.value ? `<code>${params.value}</code>` : '-'
        },
        {
            headerName: 'Operator',
            field: 'operator_name',
            minWidth: 160
        },
        {
            headerName: 'Progress',
            field: 'progress_percentage',
            width: 120,
            valueFormatter: (params: any) => `${Number(params.value || 0)}%`
        },
        {
            headerName: 'Status',
            field: 'status',
            width: 130,
            cellRenderer: (params: any) => {
                const status = String(params.value || 'draft');
                return `<span class="badge ${this.getStatusBadgeClass(status)}">${status.replace('_', ' ')}</span>`;
            }
        },
        {
            headerName: 'Created',
            field: 'created_at',
            width: 140,
            valueFormatter: (params: any) => {
                const value = params.value;
                if (!value) return '-';
                return new Date(value).toLocaleDateString();
            }
        },
        {
            headerName: 'Actions',
            field: 'actions',
            width: 120,
            sortable: false,
            filter: false,
            floatingFilter: false,
            pinned: 'right',
            cellRenderer: ChecklistActionsCellRendererComponent,
            cellRendererParams: {
                mode: 'instance',
                onOpen: (data: ChecklistInstance) => {
                    this.openChecklistInstance(data);
                }
            }
        }
    ];

    templateGridOptions: GridOptions = {
        columnDefs: this.templateColumnDefs,
        autoGroupColumnDef: this.templateAutoGroupColumnDef,
        defaultColDef: this.defaultColDef,
        groupDisplayType: 'multipleColumns',
        groupRowRendererParams: {
            suppressCount: false
        },
        rowSelection: {
            mode: 'multiRow',
            groupSelects: 'descendants',
            checkboxes: false,
            headerCheckbox: false,
            enableClickSelection: true
        },
        groupDefaultExpanded: 0,
        suppressAggFuncInHeader: true,
        animateRows: true,
        suppressMenuHide: true
    };

    instanceGridOptions: GridOptions = {
        columnDefs: this.instanceColumnDefs,
        defaultColDef: this.defaultColDef,
        animateRows: true,
        suppressMenuHide: true
    };

    private versionWarningAcknowledgedTemplateId: number | null = null;

    private getLatestPublishedTemplateInFamily(selected: ChecklistTemplate): ChecklistTemplate | null {
        if (!selected) {
            return null;
        }

        const familyGroupId = this.resolveFamilyGroupId(selected);

        const candidates = (this.allPublishedTemplates || []).filter(t => {
            if (!t || (t as any)?.is_draft) return false;

            const sameFamily = this.resolveFamilyGroupId(t) === familyGroupId;
            return sameFamily;
        });

        if (!candidates.length) {
            return null;
        }

        const ordered = candidates.slice().sort((a, b) => {
            const v = this.compareVersionsDesc(a.version, b.version);
            if (v !== 0) return v;
            const updatedA = Date.parse(a.updated_at || a.created_at || '') || 0;
            const updatedB = Date.parse(b.updated_at || b.created_at || '') || 0;
            return updatedB - updatedA;
        });

        return ordered[0] || null;
    }

    private getLatestActiveTemplateInFamily(selected: ChecklistTemplate): ChecklistTemplate | null {
        if (!selected) {
            return null;
        }

        const familyGroupId = this.resolveFamilyGroupId(selected);

        const activeCandidates = (this.allPublishedTemplates || []).filter(t => {
            if (!t || (t as any)?.is_draft) return false;
            if (!Boolean(t.is_active)) return false;
            return this.resolveFamilyGroupId(t) === familyGroupId;
        });

        if (!activeCandidates.length) {
            return null;
        }

        const ordered = activeCandidates.slice().sort((a, b) => {
            const v = this.compareVersionsDesc(a.version, b.version);
            if (v !== 0) return v;
            const updatedA = Date.parse(a.updated_at || a.created_at || '') || 0;
            const updatedB = Date.parse(b.updated_at || b.created_at || '') || 0;
            return updatedB - updatedA;
        });

        return ordered[0] || null;
    }

    private async confirmTemplateVersionBeforeStart(selected: ChecklistTemplate): Promise<ChecklistTemplate | null> {
        if (Number(selected?.id || 0) > 0 && this.versionWarningAcknowledgedTemplateId === Number(selected.id)) {
            this.versionWarningAcknowledgedTemplateId = null;
            return selected;
        }

        const latest = this.getLatestPublishedTemplateInFamily(selected);

        // Block inactive templates — offer the latest active version instead
        if (!Boolean(selected.is_active)) {
            const latestActive = this.getLatestActiveTemplateInFamily(selected);
            const offerTemplate = latestActive ?? latest;

            const result = await SweetAlert.fire({
                icon: 'warning',
                title: 'Inactive Template Version',
                html: `
                    <div class="text-start">
                        <p class="mb-2">Version <strong>v${selected.version}</strong> is inactive and no longer in use.</p>
                        ${offerTemplate ? `<p class="mb-2">The current active version is <strong>v${offerTemplate.version}</strong>.</p>` : ''}
                        <p class="mb-0 text-muted">Would you like to start the inspection using the active version?</p>
                    </div>
                `,
                showCancelButton: true,
                showDenyButton: false,
                confirmButtonText: offerTemplate ? `Use Active v${offerTemplate.version}` : 'OK',
                cancelButtonText: 'Cancel'
            });

            if (result.isConfirmed && offerTemplate) {
                return offerTemplate;
            }
            return null;
        }

        // Active template — warn only if a newer *active* version exists
        const latestActive = this.getLatestActiveTemplateInFamily(selected);
        if (!latestActive) {
            return selected;
        }

        const isOlder = this.compareVersionsDesc(selected.version, latestActive.version) > 0;
        if (!isOlder) {
            return selected;
        }

        const result = await SweetAlert.fire({
            icon: 'warning',
            title: 'Newer Active Version Available',
            html: `
                <div class="text-start">
                    <p class="mb-2">You are attempting to start an inspection using <strong>v${selected.version}</strong>.</p>
                    <p class="mb-2">A newer active version <strong>v${latestActive.version}</strong> is available.</p>
                    <p class="mb-0 text-muted">Use the latest version when possible to follow the most recent quality and safety requirements.</p>
                </div>
            `,
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: `Use Latest v${latestActive.version}`,
            denyButtonText: `Continue with v${selected.version}`,
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            this.versionWarningAcknowledgedTemplateId = null;
            return latestActive;
        }

        if (result.isDenied) {
            this.versionWarningAcknowledgedTemplateId = Number(selected.id || 0) || null;
            return selected;
        }

        this.versionWarningAcknowledgedTemplateId = null;
        return null;
    }

    // ==============================================
    // Grouped Template Table Models
    // ==============================================

    private parseVersionParts(version: string | null | undefined): [number, number, number] {
        const v = String(version || '').trim().replace(/^v/i, '');
        if (!v) return [1, 0, 0];
        const match = v.match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
        if (!match) return [1, 0, 0];
        return [Number(match[1] || 1), Number(match[2] || 0), Number(match[3] || 0)];
    }

    private compareVersionsDesc(a: string | null | undefined, b: string | null | undefined): number {
        const [aMaj, aMin, aPat] = this.parseVersionParts(a);
        const [bMaj, bMin, bPat] = this.parseVersionParts(b);
        if (aMaj !== bMaj) return bMaj - aMaj;
        if (aMin !== bMin) return bMin - aMin;
        return bPat - aPat;
    }

    // AG Grid comparator: positive = a > b (ascending). Mirrors compareVersionsDesc but for AG Grid.
    compareVersionNumbers(a: string, b: string): number {
        const [aMaj, aMin, aPat] = this.parseVersionParts(a);
        const [bMaj, bMin, bPat] = this.parseVersionParts(b);
        if (aMaj !== bMaj) return aMaj - bMaj;
        if (aMin !== bMin) return aMin - bMin;
        return aPat - bPat;
    }

    private getMajorVersionNumber(template: ChecklistTemplate): number {
        const [major] = this.parseVersionParts(template?.version);
        return Number(major || 0) || 0;
    }

    private resolveFamilyGroupId(template: ChecklistTemplate): number {
        const raw = (template as any)?.template_group_id;
        const id = Number(raw || 0);
        if (id > 0) {
            return id;
        }

        const ownId = Number(template?.id || 0);
        const ownParentId = Number((template as any)?.parent_template_id || 0);
        if (ownParentId <= 0) {
            return ownId;
        }

        // Fallback lineage walk: derive a stable family root when legacy rows
        // have no template_group_id populated yet.
        const lookup = new Map<number, ChecklistTemplate>();
        for (const row of this.allTemplates || this.allPublishedTemplates || this.templates || []) {
            const rowId = Number(row?.id || 0);
            if (rowId > 0 && !lookup.has(rowId)) {
                lookup.set(rowId, row);
            }
        }

        let familyRootId = ownParentId;
        let cursorParentId = ownParentId;
        const visited = new Set<number>([ownId]);

        while (cursorParentId > 0 && !visited.has(cursorParentId)) {
            visited.add(cursorParentId);
            familyRootId = cursorParentId;

            const parent = lookup.get(cursorParentId);
            if (!parent) {
                break;
            }

            const parentGroupId = Number((parent as any)?.template_group_id || 0);
            if (parentGroupId > 0) {
                return parentGroupId;
            }

            const nextParentId = Number((parent as any)?.parent_template_id || 0);
            if (nextParentId <= 0) {
                break;
            }

            cursorParentId = nextParentId;
        }

        return familyRootId > 0 ? familyRootId : ownId;
    }

    getTemplateFamilyLabel(template: ChecklistTemplate | null, fallbackGroupId: number): string {
        const partNumber = String(template?.part_number || '').trim();
        const name = String(template?.name || '').trim();
        const base = partNumber || name || `Family ${fallbackGroupId}`;

        const customerName = String((template as any)?.customer_name || '').trim();
        const customerPart = String((template as any)?.customer_part_number || '').trim();

        if (customerName) return `${base} — ${customerName}`;
        if (customerPart) return `${base} — ${customerPart}`;
        return base;
    }

    getCustomerLabel(template: ChecklistTemplate): string {
        return String((template as any)?.customer_name || (template as any)?.customer_part_number || '').trim();
    }

    getTemplateFamilyGroups(): Array<{
        groupId: number;
        label: string;
        majors: Array<{ major: number; templates: ChecklistTemplate[] }>;
    }> {
        const filtered = this.getFilteredTemplates();
        if (!filtered.length) {
            return [];
        }

        const byFamily = new Map<number, ChecklistTemplate[]>();
        for (const tpl of filtered) {
            const groupId = this.resolveFamilyGroupId(tpl);
            if (!byFamily.has(groupId)) {
                byFamily.set(groupId, []);
            }
            byFamily.get(groupId)!.push(tpl);
        }

        const families: Array<{ groupId: number; label: string; majors: Array<{ major: number; templates: ChecklistTemplate[] }> }> = [];

        byFamily.forEach((templates, groupId) => {
            const ordered = templates.slice().sort((a, b) => {
                const v = this.compareVersionsDesc(a.version, b.version);
                if (v !== 0) return v;
                const updatedA = Date.parse(a.updated_at || a.created_at || '') || 0;
                const updatedB = Date.parse(b.updated_at || b.created_at || '') || 0;
                return updatedB - updatedA;
            });

            const current = ordered[0] || null;

            // Table behavior: always show only the latest published version per family.
            const majors: Array<{ major: number; templates: ChecklistTemplate[] }> = [];
            if (current) {
                majors.push({
                    major: this.getMajorVersionNumber(current),
                    templates: [current],
                });
            }

            families.push({
                groupId,
                label: this.getTemplateFamilyLabel(current, groupId),
                majors
            });
        });

        families.sort((a, b) => String(a.label || '').localeCompare(String(b.label || ''), undefined, { sensitivity: 'base' }));
        return families;
    }

    private buildTemplateGridRows(): Array<ChecklistTemplate & { familyLabel: string; major: number; customerLabel: string }> {
        const rows: Array<ChecklistTemplate & { familyLabel: string; major: number; customerLabel: string }> = [];

        for (const family of this.getTemplateFamilyGroups()) {
            for (const major of family.majors) {
                for (const template of major.templates) {
                    rows.push({
                        ...template,
                        familyLabel: family.label,
                        major: major.major,
                        customerLabel: this.getCustomerLabel(template)
                    });
                }
            }
        }

        return rows;
    }

    constructor(
        public route: ActivatedRoute,
        public router: Router,
        private continuityModalService: ContinuityModalService,
        private placardModalService: PlacardModalService,
        private photoChecklistService: PhotoChecklistV2Service,
        private authService: AuthenticationService,
        private modalService: NgbModal
    ) {
    }

    ngOnInit(): void {
        this.loadTemplates();
        this.loadInstances();
    }

    // ==============================================
    // Data Loading Methods
    // ==============================================

    loadTemplates(): void {
        this.loading = true;
        this.photoChecklistService.getTemplates({ includeInactive: true }).subscribe({
            next: (templates) => {
                this.allTemplates = templates || [];
                // Source of truth for publish state is is_draft. Some legacy published rows
                // may have null published_at but must still remain in family grouping.
                const publishedTemplates = this.allTemplates.filter(t => !t.is_draft);
                this.allPublishedTemplates = publishedTemplates;

                // Include all published versions (active and inactive) — matches template manager behaviour.
                this.templates = publishedTemplates;
                this.templateGridRows = [...this.templates];
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading templates:', error);
                this.loading = false;
            }
        });
    }

    loadInstances(): void {
        this.photoChecklistService.getInstances().subscribe({
            next: (instances) => {
                this.instances = instances;
                this.instanceGridRows = instances || [];
            },
            error: (error) => {
                console.error('Error loading instances:', error);
            }
        });
    }

    // ==============================================
    // Tab Management
    // ==============================================

    switchTab(tab: string): void {
        this.activeTab = tab;
        if (tab === 'instances' && this.instances.length === 0) {
            this.loadInstances();
        }
    }

    onTemplateSearch(term: string): void {
        if (!term?.trim()) {
            this.templateGridRows = [...this.templates];
            return;
        }
        const q = term.trim().toLowerCase();
        this.templateGridRows = this.templates.filter(t =>
            t.name?.toLowerCase().includes(q) ||
            t.category?.toLowerCase().includes(q) ||
            t.part_number?.toLowerCase().includes(q) ||
            t.version?.toLowerCase().includes(q) ||
            String((t as any)?.customer_name || '').toLowerCase().includes(q)
        );
    }

    loadData(): void {
        this.loadTemplates();
        this.loadInstances();
    }

    // ==============================================
    // Modal Management
    // ==============================================

    async openCreateInstanceModal(template: ChecklistTemplate): Promise<void> {
        const resolvedTemplate = await this.confirmTemplateVersionBeforeStart(template);
        if (!resolvedTemplate) {
            return;
        }

        this.selectTemplate(resolvedTemplate);

        if (this.createInstanceModalRef) {
            this.createInstanceModalRef.close();
        }

        if (!this.createInstanceModalTemplateRef) {
            return;
        }

        this.createInstanceModalRef = this.modalService.open(this.createInstanceModalTemplateRef, {
            size: 'lg',
            backdrop: 'static',
            keyboard: false,
            centered: true
        });

        this.createInstanceModalRef.result.then(
            () => this.clearCreateInstanceModalState(),
            () => this.clearCreateInstanceModalState()
        );
    }

    closeCreateInstanceModal(): void {
        if (this.createInstanceModalRef) {
            this.createInstanceModalRef.close();
            return;
        }

        this.clearCreateInstanceModalState();
    }

    private clearCreateInstanceModalState(): void {
        this.createInstanceModalRef = null;
        this.versionWarningAcknowledgedTemplateId = null;
        this.resetNewInstanceForm();
    }

    openPreviewModal(template: ChecklistTemplate, modalContent: TemplateRef<any>): void {
        this.selectedTemplate = template;
        this.openPreviewDialog(modalContent);
    }

    onPreviewStartRequested(template?: ChecklistTemplate): void {
        const resolvedTemplate = template || this.selectedTemplate;
        if (!resolvedTemplate) {
            return;
        }

        this.closePreviewModal();
        void this.openCreateInstanceModal(resolvedTemplate);
    }

    closePreviewModal(): void {
        if (this.previewModalRef) {
            this.previewModalRef.close();
            return;
        }

        this.clearPreviewModalState();
    }

    private openPreviewDialog(modalContent: TemplateRef<any>): void {
        if (this.previewModalRef) {
            this.previewModalRef.close();
        }

        this.previewModalRef = this.modalService.open(modalContent, {
            size: 'xl',
            fullscreen: 'lg-down',
            scrollable: false,
            backdrop: 'static'
        });

        this.previewModalRef.result.then(
            () => this.clearPreviewModalState(),
            () => this.clearPreviewModalState()
        );
    }

    private clearPreviewModalState(): void {
        this.previewModalRef = null;
        this.selectedTemplate = null;
    }

    // ==============================================
    // Form Validation
    // ==============================================

    get isNewInstanceFormValid(): boolean {
        return !!(this.newInstance.workOrder &&
            this.newInstance.partNumber &&
            this.selectedTemplate &&
            this.newInstanceSerialNumbers.length > 0 &&
            this.newInstanceSerialNumbers.every(s => s.trim()));
    }

    // ==============================================
    // Photo Checklist Methods
    // ==============================================

    async createChecklistInstance(template: ChecklistTemplate, workOrder: string, partNumber: string, serialNumber: string): Promise<void> {
        const resolvedTemplate = await this.confirmTemplateVersionBeforeStart(template);
        if (!resolvedTemplate) {
            return;
        }

        // Validate form data manually
        if (!workOrder || !partNumber || !serialNumber) {
            alert('Please fill in all required fields.');
            return;
        }

        // Get current user information
        const currentUser = this.authService.currentUser();

        const instanceData = {
            template_id: resolvedTemplate.id,
            work_order_number: workOrder,
            part_number: partNumber,
            serial_number: serialNumber,
            operator_id: currentUser?.id || null,
            operator_name: currentUser ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() : 'Unknown User'
        };

        this.photoChecklistService.createInstance(instanceData).subscribe({
            next: (response) => {
                // API returns { success: boolean, instance_id: number }
                this.router.navigate(['/inspection-checklist/instance'], {
                    queryParams: { id: response.instance_id }
                });
                // Reset form and close modal
                this.closeCreateInstanceModal();
            },
            error: (error) => {
                console.error('Error creating checklist instance:', error);
                alert('Error creating checklist. Please try again.');
            }
        });
    }

    resetNewInstanceForm(): void {
        this.newInstance = {
            workOrder: '',
            partNumber: '',
            serialNumber: ''
        };
        this.newInstanceCount = 1;
        this.newInstanceSerialNumbers = [''];
        this.creatingInstances = false;
        this.selectedTemplate = null;
    }

    openChecklistInstance(instance: ChecklistInstance): void {
        this.router.navigate(['/inspection-checklist/instance'], {
            queryParams: { id: instance.id }
        });
    }

    trackByIndex(index: number): number { return index; }

    onNewInstanceCountChange(): void {
        this.newInstanceCount = Math.min(100, Math.max(1, Number(this.newInstanceCount || 1)));
        this.regenerateSerials();
    }

    onBaseSerialChange(): void {
        this.regenerateSerials();
    }

    private regenerateSerials(): void {
        const count = Math.max(1, Number(this.newInstanceCount || 1));
        const base = String(this.newInstance.serialNumber || '').trim();

        if (!base) {
            this.newInstanceSerialNumbers = Array.from({ length: count }, (_, i) =>
                this.newInstanceSerialNumbers[i] || '');
            return;
        }

        // Detect numeric suffix to increment
        const match = base.match(/^(.*?)(\d+)$/);
        if (match) {
            const prefix = match[1];
            const startNum = parseInt(match[2], 10);
            const padLen = match[2].length;
            this.newInstanceSerialNumbers = Array.from({ length: count }, (_, i) =>
                prefix + String(startNum + i).padStart(padLen, '0'));
        } else {
            this.newInstanceSerialNumbers = Array.from({ length: count }, (_, i) =>
                i === 0 ? base : (this.newInstanceSerialNumbers[i] || ''));
        }
    }

    async createChecklistInstancesBatch(): Promise<void> {
        const template = this.selectedTemplate;
        if (!template) return;

        const resolvedTemplate = await this.confirmTemplateVersionBeforeStart(template);
        if (!resolvedTemplate) return;

        const workOrder = this.newInstance.workOrder.trim();
        const partNumber = this.newInstance.partNumber.trim();
        const serials = this.newInstanceSerialNumbers.map(s => s.trim()).filter(Boolean);

        if (!workOrder || !partNumber || !serials.length) {
            alert('Please fill in all required fields and ensure all serial numbers are set.');
            return;
        }

        const currentUser = this.authService.currentUser();
        const operatorId = currentUser?.id || null;
        const operatorName = currentUser
            ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim()
            : 'Unknown User';

        this.creatingInstances = true;

        const requests = serials.map(serialNumber =>
            this.photoChecklistService.createInstance({
                template_id: resolvedTemplate.id,
                work_order_number: workOrder,
                part_number: partNumber,
                serial_number: serialNumber,
                operator_id: operatorId,
                operator_name: operatorName,
            }).toPromise()
        );

        try {
            const results = await Promise.all(requests);
            this.closeCreateInstanceModal();
            this.loadInstances();

            // If single, navigate directly; if batch, switch to Instances tab
            if (results.length === 1 && results[0]?.instance_id) {
                this.router.navigate(['/inspection-checklist/instance'], {
                    queryParams: { id: results[0].instance_id }
                });
            } else {
                this.activeTab = 'instances';
            }
        } catch (err) {
            console.error('Error creating checklist instances:', err);
            alert('One or more checklists could not be created. Please try again.');
        } finally {
            this.creatingInstances = false;
        }
    }

    selectTemplate(template: ChecklistTemplate): void {
        this.selectedTemplate = template;
        // Pre-fill part number if available
        this.newInstance.partNumber = template.part_number || '';

        const templateId = Number(template?.id || 0);
        if (templateId > 0) {
            this.photoChecklistService.getTemplate(templateId, { includeInactive: true }).subscribe({
                next: (fullTemplate) => {
                    if (this.selectedTemplate?.id === templateId) {
                        this.selectedTemplate = { ...this.selectedTemplate, ...fullTemplate } as ChecklistTemplate;
                    }
                },
                error: () => {
                    // Keep the existing selected template data if hydration fails.
                }
            });
        }
    }

    getSelectedTemplateItemCount(): number {
        const template: any = this.selectedTemplate as any;
        const explicitCount = Number(template?.item_count || 0);
        if (explicitCount > 0) {
            return explicitCount;
        }

        const items = Array.isArray(template?.items) ? template.items : [];
        return this.countNestedItems(items);
    }

    private countNestedItems(items: any[]): number {
        if (!Array.isArray(items) || items.length === 0) {
            return 0;
        }

        let count = 0;
        for (const item of items) {
            count += 1;
            if (Array.isArray(item?.children) && item.children.length > 0) {
                count += this.countNestedItems(item.children);
            }
        }
        return count;
    }

    getFilteredInstances(): ChecklistInstance[] {
        return this.instanceGridRows;
    }

    // ==============================================
    // Template Search and Filter Methods
    // ==============================================

    getFilteredTemplates(): ChecklistTemplate[] {
        return this.templates;
    }

    // ==============================================
    // Utility Methods
    // ==============================================

    trackByFamilyGroup(index: number, group: { groupId: number }): number {
        return Number(group?.groupId || 0);
    }

    trackByMajorGroup(index: number, major: { major: number }): number {
        return Number(major?.major || 0);
    }

    trackByInstanceId(index: number, instance: ChecklistInstance): number {
        return instance.id;
    }

    hasPhotoRequirements(requirements: any): boolean {
        if (!requirements) return false;
        return !!(requirements.angle || requirements.distance || requirements.lighting || requirements.focus);
    }

    getPhotoLimitText(item: ChecklistItem): string {
        const minPhotos = item.min_photos;
        const maxPhotos = item.max_photos;

        if (minPhotos && maxPhotos) {
            if (minPhotos === maxPhotos) {
                return `${minPhotos} photo${minPhotos === 1 ? '' : 's'}`;
            } else {
                return `${minPhotos}-${maxPhotos} photos`;
            }
        } else if (minPhotos) {
            return `${minPhotos}+ photos`;
        } else if (maxPhotos) {
            return `up to ${maxPhotos} photo${maxPhotos === 1 ? '' : 's'}`;
        }
        return '';
    }

    previewImage(imageUrl: string): void {
        if (imageUrl) {
            window.open(imageUrl, '_blank');
        }
    }

    getStatusBadgeClass(status: string): string {
        switch (status) {
            case 'completed': return 'bg-success';
            case 'in_progress': return 'bg-primary';
            case 'review': return 'bg-warning';
            case 'submitted': return 'bg-info';
            case 'draft': return 'bg-secondary';
            default: return 'bg-secondary';
        }
    }

    getProgressBarClass(percentage: number): string {
        if (percentage >= 100) return 'bg-success';
        if (percentage >= 75) return 'bg-info';
        if (percentage >= 50) return 'bg-warning';
        return 'bg-danger';
    }

    // ==============================================
    // Helper Methods
    // ==============================================

    hasPrimaryImage(sampleImages: any[]): boolean {
        return sampleImages && sampleImages.some(img => img.is_primary);
    }

    getReferenceImages(sampleImages: any[]): any[] {
        if (!sampleImages || !Array.isArray(sampleImages)) {
            return [];
        }
        return sampleImages.filter(img => !img.is_primary || img.image_type !== 'sample');
    }

    // ==============================================
    // Legacy Methods (Keep for compatibility)
    // ==============================================

    printAsset() {
        // TODO: Implement asset printing
    }

    printPlacard(so: string = 'SO130674', line: string = '2', partNumber: string = 'KIT-03495-110') {
        let modalRef = this.placardModalService.open(so, line, partNumber);
        modalRef.result.then(
            (result: any) => { },
            () => { }
        );
    }

    printContinuity() {
        this.continuityModalService.open(null);
    }
}
