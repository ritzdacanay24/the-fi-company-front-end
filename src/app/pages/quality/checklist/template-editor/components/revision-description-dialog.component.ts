import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-revision-description-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-header bg-primary text-white">
      <h5 class="modal-title">
        <i class="mdi mdi-file-document-edit me-2"></i>
        Describe Your Changes
      </h5>
      <button type="button" class="btn-close btn-close-white" (click)="activeModal.dismiss()"></button>
    </div>
    
    <div class="modal-body">
      <div class="alert alert-info mb-4">
        <i class="mdi mdi-information me-2"></i>
        <div>
          <strong>Template: {{ templateName }}</strong>
          <p class="mb-1 mt-2">Creating New Version: <strong>{{ nextVersion }}</strong> (from {{ currentVersion }})</p>
          <p class="mb-0 small text-muted">
            A new version will be created to preserve history. The previous version will remain available for reference.
          </p>
        </div>
      </div>

      <div class="mb-3">
        <label for="nextVersionInput" class="form-label">
          <strong>New Version</strong>
          <span class="text-danger">*</span>
        </label>
        <input
          id="nextVersionInput"
          type="text"
          class="form-control"
          [(ngModel)]="nextVersion"
          placeholder="e.g. 1.2"
          [class.is-invalid]="showValidation && !nextVersion.trim()">
        <div class="form-text">
          <i class="mdi mdi-tag-outline me-1"></i>
          Choose the version number for this new revision.
        </div>
        <div class="invalid-feedback" *ngIf="showValidation && !nextVersion.trim()">
          Version is required.
        </div>
      </div>

      <div class="mb-3">
        <label for="revisionDescription" class="form-label">
          <strong>What changes did you make?</strong>
          <span class="text-danger">*</span>
        </label>
        <textarea 
          id="revisionDescription"
          class="form-control" 
          [(ngModel)]="revisionDescription"
          rows="5"
          placeholder="Example: Added new inspection step for cable torque specifications, updated photo requirements for connector pins, fixed typo in step 3 description"
          [class.is-invalid]="showValidation && !revisionDescription.trim()">
        </textarea>
        <div class="form-text">
          <i class="mdi mdi-lightbulb-on-outline me-1"></i>
          Briefly describe what was added, removed, or modified in this template.
        </div>
        <div class="invalid-feedback" *ngIf="showValidation && !revisionDescription.trim()">
          Please provide a description of your changes.
        </div>
      </div>

      <div class="mb-3">
        <label for="versionNotes" class="form-label">
          Additional Notes <span class="text-muted small">(Optional)</span>
        </label>
        <textarea 
          id="versionNotes"
          class="form-control" 
          [(ngModel)]="versionNotes"
          rows="3"
          placeholder="Example: These changes were requested by QA team to align with new ISO requirements">
        </textarea>
        <div class="form-text">
          <i class="mdi mdi-note-text-outline me-1"></i>
          Add any additional context, reasons, or related references.
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" (click)="activeModal.dismiss()">
        <i class="mdi mdi-close me-1"></i>
        Cancel
      </button>
      <button type="button" class="btn btn-success" (click)="confirm()">
        <i class="mdi mdi-check-circle me-1"></i>
        Create Version {{ nextVersion }}
      </button>
    </div>
  `,
  styles: [`
    textarea {
      font-size: 0.95rem;
    }
    
    .form-label {
      font-weight: 500;
    }
  `]
})
export class RevisionDescriptionDialogComponent implements OnInit {
  @Input() templateName: string = '';
  @Input() currentVersion: string = '1.0';
  @Input() nextVersion: string = '1.1';
  
  revisionDescription: string = '';
  versionNotes: string = '';
  showValidation: boolean = false;

  constructor(public activeModal: NgbActiveModal) {}

  ngOnInit(): void {
    // No auto-fill for now
  }

  confirm(): void {
    // Validate that description is not empty
    if (!this.nextVersion.trim() || !this.revisionDescription.trim()) {
      this.showValidation = true;
      return;
    }

    // Return the data to the parent
    this.activeModal.close({
      nextVersion: this.nextVersion.trim(),
      revisionDescription: this.revisionDescription.trim(),
      notes: this.versionNotes.trim()
    });
  }
}
