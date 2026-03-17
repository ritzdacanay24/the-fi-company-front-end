import { Component, OnInit, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal, NgbModalRef, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ContinuityModalService } from '@app/pages/operations/labels/continuity-test-modal/continuity-test-modal.component';
import { PlacardModalService } from '@app/shared/components/placard-modal/placard-modal.component';
import { PhotoChecklistConfigService, ChecklistTemplate, ChecklistInstance, ChecklistItem } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';
import { ChecklistNavigationComponent } from '@app/shared/components/checklist-navigation/checklist-navigation.component';
import { ChecklistNavItem } from '@app/shared/models/checklist-navigation.model';

@Component({
    selector: 'app-checklist',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, NgbModule, ChecklistNavigationComponent],
    templateUrl: './checklist.component.html',
    styleUrls: []
})
export class ChecklistComponent implements OnInit {
    templates: ChecklistTemplate[] = [];
    instances: ChecklistInstance[] = [];
    loading = false;
    selectedTemplate: ChecklistTemplate | null = null;

    // New instance form data
    newInstance = {
        workOrder: '',
        partNumber: '',
        serialNumber: ''
    };

    // Tab management
    activeTab = 'templates';

    // Modal management
    showCreateInstanceModal = false;
    private previewModalRef: NgbModalRef | null = null;

    // Preview navigation (shared component)
    previewNavItems: ChecklistNavItem[] = [];
    previewActiveItemId: number | null = null;
    previewActiveItemIndex: number | null = null;

    private getLatestPublishedTemplateForMajor(selected: ChecklistTemplate): ChecklistTemplate | null {
        if (!selected) {
            return null;
        }

        const familyGroupId = this.resolveFamilyGroupId(selected);
        const major = this.getMajorVersionNumber(selected);

        const candidates = (this.templates || []).filter(t => {
            if (!t || (t as any)?.is_draft) return false;
            if (!t.is_active) return false;

            const sameFamily = this.resolveFamilyGroupId(t) === familyGroupId;
            if (!sameFamily) return false;

            return this.getMajorVersionNumber(t) === major;
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

    // Filter properties
    filters = {
        status: '',
        template: '',
        partNumber: '',
        operator: ''
    };

    // Template search and filter properties
    templateSearch = '';
    templateFilters = {
        category: '',
        productType: '',
        activeOnly: null as boolean | null
    };

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

    private getMajorVersionNumber(template: ChecklistTemplate): number {
        const [major] = this.parseVersionParts(template?.version);
        return Number(major || 0) || 0;
    }

    private resolveFamilyGroupId(template: ChecklistTemplate): number {
        const raw = (template as any)?.template_group_id;
        const id = Number(raw || 0);
        return id > 0 ? id : Number(template?.id || 0);
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

            const byMajor = new Map<number, ChecklistTemplate[]>();
            for (const tpl of ordered) {
                const major = this.getMajorVersionNumber(tpl);
                if (!byMajor.has(major)) {
                    byMajor.set(major, []);
                }
                byMajor.get(major)!.push(tpl);
            }

            const majors: Array<{ major: number; templates: ChecklistTemplate[] }> = [];
            byMajor.forEach((majTemplates, major) => {
                // Operator UX: only show the latest published version within this major (e.g., v2.1 only).
                const orderedMaj = majTemplates.slice().sort((a, b) => {
                    const v = this.compareVersionsDesc(a.version, b.version);
                    if (v !== 0) return v;
                    const updatedA = Date.parse(a.updated_at || a.created_at || '') || 0;
                    const updatedB = Date.parse(b.updated_at || b.created_at || '') || 0;
                    return updatedB - updatedA;
                });

                const latest = orderedMaj[0];
                if (latest) {
                    majors.push({ major, templates: [latest] });
                }
            });

            majors.sort((a, b) => Number(b.major || 0) - Number(a.major || 0));

            families.push({
                groupId,
                label: this.getTemplateFamilyLabel(current, groupId),
                majors
            });
        });

        families.sort((a, b) => String(a.label || '').localeCompare(String(b.label || ''), undefined, { sensitivity: 'base' }));
        return families;
    }

    constructor(
        public route: ActivatedRoute,
        public router: Router,
        private continuityModalService: ContinuityModalService,
        private placardModalService: PlacardModalService,
        private photoChecklistService: PhotoChecklistConfigService,
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
        this.photoChecklistService.getTemplates().subscribe({
            next: (templates) => {
                // Operators should only see published templates
                this.templates = (templates || []).filter(t => t.is_active && !t.is_draft && !!t.published_at);
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
        // Load instances when switching to instances tab
        if (tab === 'instances' && this.instances.length === 0) {
            this.loadInstances();
        }
    }

    // ==============================================
    // Modal Management
    // ==============================================

    async openCreateInstanceModal(template: ChecklistTemplate): Promise<void> {
        const latest = this.getLatestPublishedTemplateForMajor(template);
        if (latest && this.compareVersionsDesc(template.version, latest.version) > 0) {
            const major = this.getMajorVersionNumber(template);
            await SweetAlert.fire({
                icon: 'warning',
                title: 'Older Template Version Selected',
                text: `You selected v${template.version}. The latest published for Major v${major} is v${latest.version}.`,
                confirmButtonText: 'Continue'
            });
        }

        this.selectTemplate(template);
        this.showCreateInstanceModal = true;
    }

    closeCreateInstanceModal(): void {
        this.showCreateInstanceModal = false;
        this.resetNewInstanceForm();
    }

    openPreviewModal(template: ChecklistTemplate, modalContent: TemplateRef<any>): void {
        // Load full template details if not already loaded
        if (!template.items || template.items.length === 0) {
            this.photoChecklistService.getTemplate(template.id).subscribe({
                next: (fullTemplate) => {
                    console.log('Template data received:', fullTemplate);
                    console.log('Number of items:', fullTemplate.items?.length);
                    console.log('First item:', fullTemplate.items?.[0]);
                    console.log('First item children:', fullTemplate.items?.[0]?.children);
                    this.selectedTemplate = fullTemplate;
                    this.initializePreviewNavigation(fullTemplate);
                    this.openPreviewDialog(modalContent);
                },
                error: (error) => {
                    console.error('Error loading template details:', error);
                    alert('Error loading template details. Please try again.');
                }
            });
        } else {
            console.log('Using cached template:', template);
            console.log('Cached template items:', template.items);
            this.selectedTemplate = template;
            this.initializePreviewNavigation(template);
            this.openPreviewDialog(modalContent);
        }
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
            fullscreen: true,
            scrollable: true,
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
        this.previewNavItems = [];
        this.previewActiveItemId = null;
        this.previewActiveItemIndex = null;
    }

    startChecklistFromPreview(): void {
        const template = this.selectedTemplate;
        this.closePreviewModal();

        if (!template) {
            return;
        }

        void this.openCreateInstanceModal(template);
    }

    private initializePreviewNavigation(template: ChecklistTemplate | null): void {
        this.previewNavItems = this.buildPreviewNavItemsFromNestedItems((template as any)?.items || []);
        this.previewActiveItemId = null;
        this.previewActiveItemIndex = null;
    }

    private buildPreviewNavItemsFromNestedItems(items: any[], level: number = 0): ChecklistNavItem[] {
        if (!Array.isArray(items) || items.length === 0) {
            return [];
        }

        const ordered = items.slice().sort((a, b) => {
            const ao = Number(a?.order_index ?? 0);
            const bo = Number(b?.order_index ?? 0);
            return ao - bo;
        });

        const flat: ChecklistNavItem[] = [];
        for (let i = 0; i < ordered.length; i++) {
            const item: any = ordered[i];
            const sampleImages = Array.isArray(item?.sample_images) ? item.sample_images : [];
            const sampleVideos = Array.isArray(item?.sample_videos) ? item.sample_videos : [];
            const primaryImage = sampleImages.find((img: any) => !!img?.is_primary) ?? null;
            const primaryVideo = sampleVideos.find((vid: any) => (vid?.is_primary ?? true)) ?? null;

            flat.push({
                id: Number(item?.id || 0),
                title: String(item?.title || 'Untitled'),
                level,
                orderIndex: Number(item?.order_index ?? i),
                submissionType: (item?.submission_type ?? 'photo'),
                isRequired: !!item?.is_required,
                requiresPhoto: !!item?.photo_requirements?.picture_required,
                hasPrimarySampleImage: sampleImages.some((img: any) => !!img?.is_primary),
                hasSampleVideo: sampleVideos.some((vid: any) => (vid?.is_primary ?? true)),
                primaryImageUrl: primaryImage?.url ?? null,
                sampleVideoUrl: primaryVideo?.url ?? null,
                searchText: `${item?.title || ''} ${item?.description || ''}`.trim()
            });

            const children = Array.isArray(item?.children) ? item.children : [];
            if (children.length) {
                flat.push(...this.buildPreviewNavItemsFromNestedItems(children, level + 1));
            }
        }

        return flat;
    }

    onPreviewNavItemSelected(event: { itemId: number; index: number }): void {
        const itemId = Number(event?.itemId || 0);
        const index = Number(event?.index ?? -1);
        this.previewActiveItemId = itemId > 0 ? itemId : null;
        this.previewActiveItemIndex = Number.isFinite(index) ? index : null;

        if (itemId <= 0) {
            return;
        }

        // Defer to allow modal/layout to render.
        setTimeout(() => {
            const element = document.getElementById(`preview-item-${itemId}`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
    }

    // ==============================================
    // Form Validation
    // ==============================================

    get isNewInstanceFormValid(): boolean {
        return !!(this.newInstance.workOrder && 
                 this.newInstance.partNumber && 
                 this.newInstance.serialNumber &&
                 this.selectedTemplate);
    }

    // ==============================================
    // Photo Checklist Methods
    // ==============================================

    createChecklistInstance(template: ChecklistTemplate, workOrder: string, partNumber: string, serialNumber: string): void {
        // Validate form data manually
        if (!workOrder || !partNumber || !serialNumber) {
            alert('Please fill in all required fields.');
            return;
        }

        // Get current user information
        const currentUser = this.authService.currentUser();
        
        const instanceData = {
            template_id: template.id,
            work_order_number: workOrder,
            part_number: partNumber,
            serial_number: serialNumber,
            operator_id: currentUser?.id || null,
            operator_name: currentUser ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() : 'Unknown User'
        };

        this.photoChecklistService.createInstance(instanceData).subscribe({
            next: (response) => {
                // API returns { success: boolean, instance_id: number }
                this.router.navigate(['/standalone/checklist/instance'], {
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
        this.selectedTemplate = null;
    }

    openChecklistInstance(instance: ChecklistInstance): void {
        this.router.navigate(['/standalone/checklist/instance'], {
            queryParams: { id: instance.id }
        });
    }

    selectTemplate(template: ChecklistTemplate): void {
        this.selectedTemplate = template;
        // Pre-fill part number if available
        this.newInstance.partNumber = template.part_number || '';
    }

    getFilteredInstances(): ChecklistInstance[] {
        return this.instances.filter(instance => {
            if (this.filters.status && instance.status !== this.filters.status) {
                return false;
            }
            if (this.filters.template && instance.template_id !== parseInt(this.filters.template)) {
                return false;
            }
            if (this.filters.partNumber && !instance.part_number.toLowerCase().includes(this.filters.partNumber.toLowerCase())) {
                return false;
            }
            if (this.filters.operator && !instance.operator_name.toLowerCase().includes(this.filters.operator.toLowerCase())) {
                return false;
            }
            return true;
        });
    }

    // ==============================================
    // Template Search and Filter Methods
    // ==============================================

    getFilteredTemplates(): ChecklistTemplate[] {
        return this.templates.filter(template => {
            // Search filter
            if (this.templateSearch) {
                const searchTerm = this.templateSearch.toLowerCase();
                const matchesSearch = 
                    template.name.toLowerCase().includes(searchTerm) ||
                    (template.description || '').toLowerCase().includes(searchTerm) ||
                    (template.part_number || '').toLowerCase().includes(searchTerm) ||
                    (template.product_type || '').toLowerCase().includes(searchTerm);
                
                if (!matchesSearch) return false;
            }

            // Category filter
            if (this.templateFilters.category && template.category !== this.templateFilters.category) {
                return false;
            }

            // Product type filter
            if (this.templateFilters.productType) {
                const productTypeSearch = this.templateFilters.productType.toLowerCase();
                if (!(template.product_type || '').toLowerCase().includes(productTypeSearch)) {
                    return false;
                }
            }

            // Active/inactive filter
            if (this.templateFilters.activeOnly !== null) {
                if (template.is_active !== this.templateFilters.activeOnly) {
                    return false;
                }
            }

            return true;
        });
    }

    onTemplateSearch(): void {
        // This method is called on input changes to trigger re-filtering
        // The actual filtering happens in getFilteredTemplates()
    }

    clearTemplateSearch(): void {
        this.templateSearch = '';
    }

    clearAllTemplateFilters(): void {
        this.templateSearch = '';
        this.templateFilters = {
            category: '',
            productType: '',
            activeOnly: null
        };
    }

    hasActiveFilters(): boolean {
        return !!(
            this.templateFilters.category ||
            this.templateFilters.productType ||
            this.templateFilters.activeOnly !== null
        );
    }

    highlightSearchTerm(text: string, searchTerm: string): string {
        if (!searchTerm || !text) {
            return text;
        }

        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark class="bg-warning bg-opacity-50">$1</mark>');
    }

    // ==============================================
    // Utility Methods
    // ==============================================

    trackByTemplateId(index: number, template: ChecklistTemplate): number {
        return template.id;
    }

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
