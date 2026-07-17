import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { FeatureType } from '@app/shared/enums/feature.enum';
import { FeatureAttachmentsPanelComponent } from '@app/shared/components/attachments/feature-attachments-panel/feature-attachments-panel.component';
import { PmTaskRecord } from './services/project-manager-tasks-data.service';

@Component({
  standalone: true,
  selector: 'app-pm-task-attachment-modal',
  imports: [SharedModule, FeatureAttachmentsPanelComponent],
  template: `
    <div class="modal-header">
      <div>
        <h5 class="modal-title mb-0">Attachments</h5>
        <small class="text-muted">{{ task.taskName }}</small>
      </div>
      <button type="button" class="btn-close" (click)="activeModal.close(true)"></button>
    </div>

    <div class="modal-body">
      <ng-container *ngIf="resourceId; else saveFirstHint">
        <app-feature-attachments-panel
          [feature]="feature"
          [resourceId]="resourceId"
          [viewMode]="'table'"
          [showDelete]="true">
        </app-feature-attachments-panel>
      </ng-container>

      <ng-template #saveFirstHint>
        <div class="text-muted small py-2">Save or select a project first to enable task attachments.</div>
      </ng-template>
    </div>

    <div class="modal-footer py-2">
      <button type="button" class="btn btn-outline-secondary btn-sm" (click)="activeModal.close(true)">Close</button>
    </div>
  `
})
export class PmTaskAttachmentModalComponent {
  @Input() task!: PmTaskRecord;
  @Input() resourceId: number | null = null;

  readonly feature = FeatureType.PROJECT_MANAGER_TASK;

  constructor(public readonly activeModal: NgbActiveModal) {}
}
