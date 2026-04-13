import { PhotosService } from './photos/photos.service';
import { Component, Inject, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { WorkOrderInfoService } from '@app/core/api/work-order/work-order-info.service';
import { QualityPhotoChecklistService } from '@app/core/api/quality-photo-checklist/quality-photo-checklist-service';
import { PhotoChecklistConfigService, ChecklistTemplate, ChecklistInstance } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { SharedModule } from '@app/shared/shared.module';
import { AuthenticationService } from '@app/core/services/auth.service';
import { DOCUMENT } from '@angular/common';

@Component({
  standalone:true, 
  imports:[SharedModule],
  selector: 'app-checklist-execution',
  templateUrl: './checklist-execution.component.html',
  styleUrls: ['./checklist-execution.component.scss']
})
export class ChecklistExecutionComponent implements OnInit, OnDestroy {

  // Updated to use dynamic data instead of hardcoded
  checklistTemplates: ChecklistTemplate[] = [];
  openChecklists: ChecklistInstance[] = [];
  filteredChecklists: ChecklistInstance[] = [];
  loading: boolean;

  // Filter properties
  selectedStatus: string = '';
  selectedTemplate: string = '';
  selectedOperator: string = ''; // Filter by operator
  currentUser: any = null;
  isStandaloneMode = false;
  private readonly standaloneBodyClass = 'standalone-checklist-execution';

  constructor(
    private photosService: PhotosService,
    private qualityPhotoChecklistService: QualityPhotoChecklistService,
    private workOrderInfoService: WorkOrderInfoService,
    private photoChecklistConfigService: PhotoChecklistConfigService,
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
      // Load ALL checklists including completed and submitted
      this.openChecklists = data || [];
      this.applyDefaultOperatorFilter();
      this.applyFilters(); // Apply filters after loading data
    }, () => this.loading = false);
  }

  // Alias method for consistency with template
  loadOpenChecklists() {
    this.getOpenChecklists();
  }

  // Filter methods
  filterChecklists() {
    this.applyFilters();
  }

  private applyFilters() {
    this.filteredChecklists = this.openChecklists.filter(checklist => {
      let matches = true;

      // Filter by work order number
      if (this.woNumber && this.woNumber.trim()) {
        matches = matches && checklist.work_order_number?.toLowerCase().includes(this.woNumber.toLowerCase());
      }

      // Filter by serial number
      if (this.serialNumber && this.serialNumber.trim()) {
        matches = matches && checklist.serial_number?.toLowerCase().includes(this.serialNumber.toLowerCase());
      }

      // Filter by status
      if (this.selectedStatus) {
        matches = matches && checklist.status === this.selectedStatus;
      }

      // Filter by template
      if (this.selectedTemplate) {
        matches = matches && checklist.template_id?.toString() === this.selectedTemplate;
      }

      // Filter by operator
      if (this.selectedOperator) {
        matches = matches && checklist.operator_id?.toString() === this.selectedOperator;
      }

      return matches;
    });
  }

  // Check if any filters are active
  hasActiveFilters(): boolean {
    return !!(this.woNumber || this.serialNumber || this.selectedStatus || this.selectedTemplate || this.selectedOperator);
  }

  // Clear individual filters
  clearWorkOrderFilter() {
    this.woNumber = '';
    this.applyFilters();
  }

  clearSerialFilter() {
    this.serialNumber = '';
    this.applyFilters();
  }

  clearStatusFilter() {
    this.selectedStatus = '';
    this.applyFilters();
  }

  clearTemplateFilter() {
    this.selectedTemplate = '';
    this.applyFilters();
  }

  clearOperatorFilter() {
    this.selectedOperator = '';
    this.applyFilters();
  }

  // Get template name by ID
  getTemplateName(templateId: string): string {
    const template = this.checklistTemplates.find(t => t.id?.toString() === templateId);
    return template?.name || 'Unknown Template';
  }

  // Get unique operators for dropdown
  getUniqueOperators(): ChecklistInstance[] {
    const seen = new Set();
    return this.openChecklists.filter(checklist => {
      if (!checklist.operator_id || seen.has(checklist.operator_id)) {
        return false;
      }
      seen.add(checklist.operator_id);
      return true;
    });
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

  private applyDefaultOperatorFilter() {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.selectedOperator = '';
      return;
    }

    const operators = this.getUniqueOperators();
    const idCandidates = this.getCurrentUserIdCandidates(currentUser);

    if (idCandidates.length > 0) {
      const idMatch = operators.find(operator =>
        idCandidates.includes(operator.operator_id?.toString() || '')
      );

      if (idMatch?.operator_id) {
        this.selectedOperator = idMatch.operator_id.toString();
        return;
      }
    }

    const currentUserName = this.getCurrentUserName(currentUser);
    if (currentUserName) {
      const nameMatch = operators.find(operator =>
        this.normalizeText(operator.operator_name) === currentUserName
      );

      if (nameMatch?.operator_id) {
        this.selectedOperator = nameMatch.operator_id.toString();
        return;
      }
    }

    this.selectedOperator = '';
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
    this.router.navigate(['/standalone/checklist/instance'], { queryParams: { id: instanceId } });
  }

  ngOnInit(): void {
    this.isStandaloneMode = this.router.url?.includes('/standalone/checklist/execution');
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
  }

}
