import { PhotosService } from './photos/photos.service';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { WorkOrderInfoService } from '@app/core/api/work-order/work-order-info.service';
import { QualityPhotoChecklistService } from '@app/core/api/quality-photo-checklist/quality-photo-checklist-service';
import { PhotoChecklistConfigService, ChecklistTemplate, ChecklistInstance } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { SharedModule } from '@app/shared/shared.module';
import { AuthenticationService } from '@app/core/services/auth.service';

@Component({
  standalone:true, 
  imports:[SharedModule],
  selector: 'app-checklist-execution',
  templateUrl: './checklist-execution.component.html',
  styleUrls: ['./checklist-execution.component.scss']
})
export class ChecklistExecutionComponent implements OnInit {

  // Updated to use dynamic data instead of hardcoded
  checklistTemplates: ChecklistTemplate[] = [];
  openChecklists: ChecklistInstance[] = [];
  filteredChecklists: ChecklistInstance[] = [];
  loading: boolean;

  // Filter properties
  selectedStatus: string = '';
  selectedTemplate: string = '';
  selectedOperator: string = ''; // Filter by operator

  constructor(
    private photosService: PhotosService,
    private qualityPhotoChecklistService: QualityPhotoChecklistService,
    private workOrderInfoService: WorkOrderInfoService,
    private photoChecklistConfigService: PhotoChecklistConfigService,
    private router: Router,
    private authService: AuthenticationService
  ) { }
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
      this.checklistTemplates = templates;
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
      // Load ALL checklists and let UI filters handle the filtering
      // Exclude only 'submitted' status since those are truly finalized
      this.openChecklists = data.filter(instance => 
        instance.status !== 'submitted'
      );
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
    this.router.navigate(['/quality/checklist/instance'], { queryParams: { id: instanceId } });
  }

  ngOnInit(): void {
    // Set default filter to current user
    const currentUser = this.authService.currentUser();
    if (currentUser?.id) {
      this.selectedOperator = currentUser.id.toString();
    }
    
    this.getOpenChecklists();
    this.filteredChecklists = [...this.openChecklists]; // Initialize filtered list
  }

}
