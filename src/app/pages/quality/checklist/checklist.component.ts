import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { ContinuityModalService } from '@app/pages/operations/labels/continuity-test-modal/continuity-test-modal.component';
import { PlacardModalService } from '@app/shared/components/placard-modal/placard-modal.component';
import { PhotoChecklistConfigService, ChecklistTemplate, ChecklistInstance, ChecklistItem } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';

@Component({
    selector: 'app-checklist',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
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
    showPreviewModal = false;

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

    constructor(
        public route: ActivatedRoute,
        public router: Router,
        private continuityModalService: ContinuityModalService,
        private placardModalService: PlacardModalService,
        private photoChecklistService: PhotoChecklistConfigService
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
                this.templates = templates.filter(t => t.is_active);
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

    openCreateInstanceModal(template: ChecklistTemplate): void {
        this.selectTemplate(template);
        this.showCreateInstanceModal = true;
    }

    closeCreateInstanceModal(): void {
        this.showCreateInstanceModal = false;
        this.resetNewInstanceForm();
    }

    openPreviewModal(template: ChecklistTemplate): void {
        // Load full template details if not already loaded
        if (!template.items || template.items.length === 0) {
            this.photoChecklistService.getTemplate(template.id).subscribe({
                next: (fullTemplate) => {
                    this.selectedTemplate = fullTemplate;
                    this.showPreviewModal = true;
                },
                error: (error) => {
                    console.error('Error loading template details:', error);
                    alert('Error loading template details. Please try again.');
                }
            });
        } else {
            this.selectedTemplate = template;
            this.showPreviewModal = true;
        }
    }

    closePreviewModal(): void {
        this.showPreviewModal = false;
        this.selectedTemplate = null;
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

        const instanceData = {
            template_id: template.id,
            work_order_number: workOrder,
            part_number: partNumber,
            serial_number: serialNumber,
            operator_id: 1, // TODO: Get from current user
            operator_name: 'Current User' // TODO: Get from current user
        };

        this.photoChecklistService.createInstance(instanceData).subscribe({
            next: (response) => {
                // API returns { success: boolean, instance_id: number }
                this.router.navigate(['../checklist-instance'], {
                    relativeTo: this.route,
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
        this.router.navigate(['../checklist-instance'], {
            queryParams: { id: instance.id },
            relativeTo: this.route
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
