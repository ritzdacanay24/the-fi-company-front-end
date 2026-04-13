import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { QualityDocument, QualityRevision, CreateRevisionRequest } from '@app/core/api/quality-version-control/quality-version-control.service';

export interface RevisionAction {
  action: string;
  label: string;
  shortLabel?: string; // Short version for mobile display
  icon: string;
  class: string;
  enabled: boolean;
}

@Component({
  selector: 'app-revision-workflow',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './revision-workflow.component.html',
  styleUrls: ['./revision-workflow.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RevisionWorkflowComponent implements OnInit {
  @Input() selectedDocument: QualityDocument | null = null;
  @Input() documentRevisions: QualityRevision[] = [];
  @Input() creating = false;

  @Output() createRevision = new EventEmitter<CreateRevisionRequest>();
  @Output() revisionAction = new EventEmitter<{action: string, revision: QualityRevision}>();
  @Output() downloadRevision = new EventEmitter<QualityRevision>();

  createRevisionForm: FormGroup;
  showCreateForm = false;

  constructor(private fb: FormBuilder) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // Reset form when document changes
    if (this.selectedDocument) {
      this.initializeForm();
    }
  }

  private initializeForm(): void {
    this.createRevisionForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      change_description: ['', Validators.required],
      effective_date: [this.formatDate(new Date()), Validators.required]
    });
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (this.showCreateForm) {
      this.initializeForm();
    }
  }

  onCreateRevision(): void {
    if (this.createRevisionForm.valid && this.selectedDocument) {
      const documentId = typeof this.selectedDocument.id === 'string' 
        ? parseInt(this.selectedDocument.id) 
        : this.selectedDocument.id;
        
      const request: CreateRevisionRequest = {
        document_id: documentId,
        ...this.createRevisionForm.value
      };
      
      this.createRevision.emit(request);
      this.showCreateForm = false;
      this.initializeForm();
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.createRevisionForm.controls).forEach(key => {
        this.createRevisionForm.get(key)?.markAsTouched();
      });
    }
  }

  onRevisionAction(action: string, revision: QualityRevision): void {
    this.revisionAction.emit({ action, revision });
  }

  onDownloadRevision(revision: QualityRevision): void {
    this.downloadRevision.emit(revision);
  }

  getRevisionActions(revision: QualityRevision): RevisionAction[] {
    const actions: RevisionAction[] = [];
    
    // Download action - always available
    actions.push({
      action: 'download',
      label: 'Download',
      shortLabel: 'Get',
      icon: 'mdi-download',
      class: 'btn-outline-primary',
      enabled: true
    });

    switch (revision.status?.toLowerCase()) {
      case 'draft':
        actions.push({
          action: 'submit',
          label: 'Submit for Approval',
          shortLabel: 'Submit',
          icon: 'mdi-send',
          class: 'btn-outline-success',
          enabled: true
        });
        break;

      case 'pending_approval':
        // Approver actions
        actions.push({
          action: 'approve',
          label: 'Approve',
          shortLabel: 'OK',
          icon: 'mdi-check',
          class: 'btn-outline-success',
          enabled: true
        });
        actions.push({
          action: 'reject',
          label: 'Reject',
          shortLabel: 'No',
          icon: 'mdi-close',
          class: 'btn-outline-danger',
          enabled: true
        });
        // Author can withdraw
        actions.push({
          action: 'withdraw',
          label: 'Withdraw',
          shortLabel: 'Undo',
          icon: 'mdi-undo',
          class: 'btn-outline-warning',
          enabled: true
        });
        break;

      case 'approved':
        // Already approved - no actions except download
        break;

      case 'rejected':
        // Can resubmit
        actions.push({
          action: 'submit',
          label: 'Resubmit',
          shortLabel: 'Retry',
          icon: 'mdi-send',
          class: 'btn-outline-success',
          enabled: true
        });
        break;
    }

    return actions;
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'draft': 'bg-secondary',
      'pending_approval': 'bg-warning',
      'approved': 'bg-success',
      'superseded': 'bg-info',
      'obsolete': 'bg-danger',
      'rejected': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
  }

  getStatusText(status: string): string {
    return status?.replace('_', ' ').toUpperCase() || 'UNKNOWN';
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  getNextRevisionNumber(): number {
    if (!this.documentRevisions.length) return 1;
    return Math.max(...this.documentRevisions.map(r => r.revision_number)) + 1;
  }

  isCurrentRevision(revision: QualityRevision): boolean {
    return revision.is_current || false;
  }

  trackByRevisionId(index: number, revision: QualityRevision): any {
    return revision.id;
  }
}
