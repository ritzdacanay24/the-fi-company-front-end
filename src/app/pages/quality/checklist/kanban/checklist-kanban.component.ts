import { Component, Inject, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { PhotoChecklistConfigService, ChecklistInstance, ChecklistTemplate } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { WorkOrderInfoService } from '@app/core/api/work-order/work-order-info.service';
import { SharedModule } from '@app/shared/shared.module';

type ChecklistStatus = 'draft' | 'in_progress' | 'review' | 'completed' | 'submitted';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-checklist-kanban',
  templateUrl: './checklist-kanban.component.html',
  styleUrls: ['./checklist-kanban.component.scss']
})
export class ChecklistKanbanComponent implements OnInit, OnDestroy {
  loading = false;
  openChecklists: ChecklistInstance[] = [];
  filteredChecklists: ChecklistInstance[] = [];
  checklistTemplates: ChecklistTemplate[] = [];

  selectedOperator = '';
  searchText = '';

  woNumber = '';
  partNumber = '';
  serialNumber = '';
  selectedTemplateId = '';
  createLoading = false;
  createError = '';

  currentUser: any = null;
  private readonly standaloneBodyClass = 'standalone-checklist-kanban';

  readonly columns: Array<{ status: ChecklistStatus; label: string; icon: string; badgeClass: string }> = [
    { status: 'draft', label: 'Draft', icon: 'mdi-file-document-edit-outline', badgeClass: 'text-bg-secondary' },
    { status: 'in_progress', label: 'In Progress', icon: 'mdi-progress-clock', badgeClass: 'text-bg-primary' },
    { status: 'review', label: 'Review', icon: 'mdi-eye-check-outline', badgeClass: 'text-bg-warning' },
    { status: 'completed', label: 'Completed', icon: 'mdi-check-circle-outline', badgeClass: 'text-bg-success' },
    { status: 'submitted', label: 'Submitted', icon: 'mdi-send-check-outline', badgeClass: 'text-bg-info' }
  ];

  constructor(
    private photoChecklistConfigService: PhotoChecklistConfigService,
    private workOrderInfoService: WorkOrderInfoService,
    private authService: AuthenticationService,
    private router: Router,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.currentUser = this.authService.currentUser();
  }

  ngOnInit(): void {
    this.renderer.addClass(this.document.body, this.standaloneBodyClass);
    this.loadTemplates();
    this.loadChecklists();
  }

  ngOnDestroy(): void {
    try {
      this.renderer.removeClass(this.document.body, this.standaloneBodyClass);
    } catch {
      // ignore
    }
  }

  loadTemplates(): void {
    this.photoChecklistConfigService.getTemplates().pipe(first()).subscribe(templates => {
      this.checklistTemplates = (templates || []).filter(t => t.is_active && !t.is_draft && !!t.published_at);
    });
  }

  loadChecklists(): void {
    this.loading = true;
    this.photoChecklistConfigService.getInstances().pipe(first()).subscribe(data => {
      this.loading = false;
      this.openChecklists = data || [];
      this.applyDefaultOperatorFilter();
      this.applyFilters();
    }, () => {
      this.loading = false;
    });
  }

  applyFilters(): void {
    const search = this.normalizeText(this.searchText);

    this.filteredChecklists = this.openChecklists.filter(checklist => {
      if (this.selectedOperator && checklist.operator_id?.toString() !== this.selectedOperator) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = this.normalizeText([
        checklist.work_order_number,
        checklist.serial_number,
        checklist.part_number,
        checklist.operator_name,
        checklist.template_name,
        this.getTemplateName(checklist.template_id?.toString() || '')
      ].join(' '));

      return haystack.includes(search);
    });
  }

  clearFilters(): void {
    this.searchText = '';
    this.applyDefaultOperatorFilter();
    this.applyFilters();
  }

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

  getTemplateName(templateId: string): string {
    const template = this.checklistTemplates.find(t => t.id?.toString() === templateId);
    return template?.name || 'Unknown Template';
  }

  getColumnItems(status: ChecklistStatus): ChecklistInstance[] {
    return this.filteredChecklists.filter(item => item.status === status);
  }

  getStatusCount(status: ChecklistStatus): number {
    return this.getColumnItems(status).length;
  }

  getProgressClass(progress: number | undefined): string {
    const value = progress || 0;
    if (value >= 100) {
      return 'bg-success';
    }
    if (value >= 50) {
      return 'bg-warning';
    }
    return 'bg-secondary';
  }

  openChecklist(instanceId: number): void {
    this.router.navigate(['/standalone/checklist/instance'], {
      queryParams: {
        id: instanceId,
        returnTo: 'kanban'
      }
    });
  }

  openExecutionList(): void {
    this.router.navigate(['/standalone/checklist/execution']);
  }

  loadWorkOrderDetails(): void {
    this.createError = '';
    const wo = (this.woNumber || '').trim();
    if (!wo) {
      this.createError = 'Enter a work order number first.';
      return;
    }

    const woNumber = Number(wo);
    if (!Number.isFinite(woNumber)) {
      this.createError = 'Work order must be numeric.';
      return;
    }

    this.createLoading = true;
    this.workOrderInfoService.getDataByWorkOrderNumber(woNumber).pipe(first()).subscribe(data => {
      this.createLoading = false;

      if (!data?.mainDetails) {
        this.partNumber = '';
        this.serialNumber = '';
        this.createError = 'Work order not found.';
        return;
      }

      this.partNumber = data.mainDetails.wo_part || '';
      this.serialNumber = data.mainDetails.wo_serial || '';

      if (!this.getTemplateOptions().some(template => template.id?.toString() === this.selectedTemplateId)) {
        this.selectedTemplateId = '';
      }
    }, () => {
      this.createLoading = false;
      this.createError = 'Could not load work order details.';
    });
  }

  getTemplateOptions(): ChecklistTemplate[] {
    const part = (this.partNumber || '').trim().toLowerCase();
    if (!part) {
      return this.checklistTemplates;
    }

    const matches = this.checklistTemplates.filter(template =>
      (template.part_number || '').trim().toLowerCase() === part
    );

    return matches.length > 0 ? matches : this.checklistTemplates;
  }

  startInspection(): void {
    this.createError = '';
    if (!(this.woNumber || '').trim()) {
      this.createError = 'Work order is required.';
      return;
    }

    if (!this.partNumber) {
      this.createError = 'Load a valid work order first.';
      return;
    }

    if (!this.selectedTemplateId) {
      this.createError = 'Select a checklist template.';
      return;
    }

    const templateId = Number(this.selectedTemplateId);
    if (!Number.isFinite(templateId)) {
      this.createError = 'Invalid template selection.';
      return;
    }

    const currentUser = this.authService.currentUser();
    const operatorId = this.getCurrentUserIdCandidates(currentUser)[0] || null;

    const instanceData: Partial<ChecklistInstance> = {
      template_id: templateId,
      work_order_number: this.woNumber.trim(),
      part_number: this.partNumber,
      serial_number: this.serialNumber || '',
      status: 'in_progress',
      operator_id: operatorId ? Number(operatorId) : null,
      operator_name: currentUser
        ? `${currentUser.first_name || currentUser.firstName || ''} ${currentUser.last_name || currentUser.lastName || ''}`.trim()
        : 'Unknown User'
    };

    this.createLoading = true;
    this.photoChecklistConfigService.createInstance(instanceData).pipe(first()).subscribe(response => {
      this.createLoading = false;
      this.router.navigate(['/standalone/checklist/instance'], {
        queryParams: {
          id: response.instance_id,
          returnTo: 'kanban'
        }
      });
    }, () => {
      this.createLoading = false;
      this.createError = 'Failed to start inspection. Please try again.';
    });
  }

  trackByChecklistId(index: number, item: ChecklistInstance): number {
    return item.id;
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

  private applyDefaultOperatorFilter(): void {
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
}
