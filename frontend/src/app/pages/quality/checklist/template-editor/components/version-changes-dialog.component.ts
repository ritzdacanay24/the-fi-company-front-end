import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface VersionChanges {
  field_changes?: Array<{
    field: string;
    old_value: any;
    new_value: any;
  }>;
  items_added?: any[];
  items_removed?: any[];
  items_modified?: Array<{
    title: string;
    changes: Array<{
      field: string;
      old_value: any;
      new_value: any;
    }>;
  }>;
  has_changes: boolean;
}

export interface VersionChangesDialogResult {
  action: 'create-version' | 'cancel';
  revisionDescription?: string;
  notes?: string;
}

@Component({
  selector: 'app-version-changes-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  template: `
    <div class="modal-header bg-warning bg-opacity-10">
      <h5 class="modal-title">
        <i class="mdi mdi-alert text-warning me-2"></i>
        Changes Detected
      </h5>
      <button type="button" class="btn-close" (click)="onCancel()"></button>
    </div>

    <div class="modal-body">
      <!-- Summary Banner -->
      <div class="alert alert-info">
        <div class="d-flex align-items-start">
          <i class="mdi mdi-information me-2"></i>
          <div>
            <strong>{{ templateName }}</strong>
            <div class="text-muted small mt-1">
              {{ getSummary() }}
            </div>
          </div>
        </div>
      </div>

      <!-- Info Message -->
      <div class="alert alert-success">
        <i class="mdi mdi-check-circle me-2"></i>
        A new version will be created to preserve history and maintain audit trail. The previous version will remain available for reference.
      </div>

      <!-- Change Details - All Expanded by Default -->
      <div class="changes-list">
        <!-- Field Changes -->
        <div class="mb-4" *ngIf="changes.field_changes && changes.field_changes.length > 0">
          <h6 class="text-primary mb-3">
            <i class="mdi mdi-pencil me-2"></i>
            Field Changes ({{ changes.field_changes.length }})
          </h6>
          <div *ngFor="let change of changes.field_changes" class="field-change mb-3 p-3 bg-light rounded border">
            <div class="mb-2">
              <span class="badge bg-secondary">{{ formatFieldName(change.field) }}</span>
            </div>
            <div class="row g-2">
              <div class="col-5">
                <div class="text-muted small">Previous Value:</div>
                <div class="border rounded p-2 bg-white">
                  <pre class="mb-0" *ngIf="isObject(change.old_value); else oldSimple">{{ formatValue(change.old_value) }}</pre>
                  <ng-template #oldSimple><span class="text-danger text-decoration-line-through">{{ formatValue(change.old_value) }}</span></ng-template>
                </div>
              </div>
              <div class="col-2 d-flex align-items-center justify-content-center">
                <i class="mdi mdi-arrow-right"></i>
              </div>
              <div class="col-5">
                <div class="text-muted small">New Value:</div>
                <div class="border rounded p-2 bg-white">
                  <pre class="mb-0" *ngIf="isObject(change.new_value); else newSimple">{{ formatValue(change.new_value) }}</pre>
                  <ng-template #newSimple><span class="text-success fw-bold">{{ formatValue(change.new_value) }}</span></ng-template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Items Added -->
        <div class="mb-4" *ngIf="changes.items_added && changes.items_added.length > 0">
          <h6 class="text-success mb-3">
            <i class="mdi mdi-plus-circle me-2"></i>
            Items Added ({{ changes.items_added.length }})
          </h6>
          <div *ngFor="let item of changes.items_added; let i = index" 
               class="border-start border-success border-3 p-2 mb-2 bg-light rounded">
            <div class="d-flex align-items-start">
              <span class="badge bg-success me-2">{{ item.order_index || i + 1 }}</span>
              <div class="flex-fill">
                <div class="fw-bold">{{ item.title }}</div>
                <div class="text-muted small" *ngIf="item.description">
                  {{ item.description }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Items Removed -->
        <div class="mb-4" *ngIf="changes.items_removed && changes.items_removed.length > 0">
          <h6 class="text-danger mb-3">
            <i class="mdi mdi-minus-circle me-2"></i>
            Items Removed ({{ changes.items_removed.length }})
          </h6>
          <div *ngFor="let item of changes.items_removed; let i = index" 
               class="border-start border-danger border-3 p-2 mb-2 bg-light rounded text-decoration-line-through">
            <div class="d-flex align-items-start">
              <span class="badge bg-danger me-2">{{ item.order_index || i + 1 }}</span>
              <div class="flex-fill">
                <div>{{ item.title }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Items Modified -->
        <div class="mb-4" *ngIf="changes.items_modified && changes.items_modified.length > 0">
          <h6 class="text-warning mb-3">
            <i class="mdi mdi-pencil-box me-2"></i>
            Items Modified ({{ changes.items_modified.length }})
          </h6>
          <div *ngFor="let item of changes.items_modified; let i = index" 
               class="border-start border-warning border-3 p-2 mb-3 bg-light rounded border">
            <div class="d-flex align-items-start mb-2">
              <span class="badge bg-warning text-dark me-2">{{ i + 1 }}</span>
              <div class="fw-bold">{{ item.title }}</div>
            </div>
            
            <div class="ms-4">
              <div *ngFor="let change of item.changes" class="mb-2">
                <div class="small text-muted">{{ formatFieldName(change.field) }}:</div>
                <div class="d-flex gap-2 align-items-start flex-wrap">
                  <div>
                    <pre class="mb-0 text-danger text-decoration-line-through small" *ngIf="isObject(change.old_value); else oldItemSimple">{{ formatValue(change.old_value) }}</pre>
                    <ng-template #oldItemSimple><span class="text-danger text-decoration-line-through small">{{ formatValue(change.old_value) }}</span></ng-template>
                  </div>
                  <i class="mdi mdi-arrow-right small"></i>
                  <div>
                    <pre class="mb-0 text-success fw-bold small" *ngIf="isObject(change.new_value); else newItemSimple">{{ formatValue(change.new_value) }}</pre>
                    <ng-template #newItemSimple><span class="text-success fw-bold small">{{ formatValue(change.new_value) }}</span></ng-template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Revision Description Input (Required for Document Control) -->
      <div class="mt-4">
        <label class="form-label fw-bold">
          Revision Description <span class="text-danger">*</span>
        </label>
        <textarea 
          class="form-control" 
          [(ngModel)]="revisionDescription"
          rows="2"
          required
          placeholder="Brief summary of changes (e.g., Added 3 inspection items, updated photo requirements)"></textarea>
        <div class="form-text">Required: This will appear in the revision history and change log</div>
      </div>

      <!-- Additional Notes Input (Optional) -->
      <div class="mt-3">
        <label class="form-label">Additional Notes (Optional)</label>
        <textarea 
          class="form-control" 
          [(ngModel)]="versionNotes"
          rows="3"
          placeholder="Detailed explanation, reason for change, impact analysis, etc..."></textarea>
        <div class="form-text">Optional: Additional context for this revision</div>
      </div>
    </div>

    <div class="modal-footer border-top">
      <button type="button" class="btn btn-secondary" (click)="onCancel()">
        <i class="mdi mdi-close me-1"></i>
        Cancel
      </button>
      
      <button type="button" 
              class="btn btn-success"
              (click)="onCreateVersion()"
              [disabled]="!revisionDescription || revisionDescription.trim() === ''">
        <i class="mdi mdi-plus-circle me-1"></i>
        Create New Version
      </button>
    </div>
  `,
  styles: [`
    .field-change {
      background: #f8f9fa;
    }
  `]
})
export class VersionChangesDialogComponent {
  @Input() changes!: VersionChanges;
  @Input() currentVersion!: string;
  @Input() templateName!: string;
  
  revisionDescription = '';
  versionNotes = '';

  constructor(public activeModal: NgbActiveModal) {}

  getSummary(): string {
    const parts = [];
    if (this.changes.field_changes?.length) {
      parts.push(`${this.changes.field_changes.length} field change(s)`);
    }
    if (this.changes.items_added?.length) {
      parts.push(`${this.changes.items_added.length} item(s) added`);
    }
    if (this.changes.items_removed?.length) {
      parts.push(`${this.changes.items_removed.length} item(s) removed`);
    }
    if (this.changes.items_modified?.length) {
      parts.push(`${this.changes.items_modified.length} item(s) modified`);
    }
    return parts.join(', ');
  }

  formatFieldName(field: string): string {
    return field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '(empty)';
    }
    if (typeof value === 'object') {
      // Pretty print objects as JSON
      return JSON.stringify(value, null, 2);
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  }

  isObject(value: any): boolean {
    return typeof value === 'object' && value !== null;
  }

  onCreateVersion(): void {
    // Validate required field
    if (!this.revisionDescription || this.revisionDescription.trim() === '') {
      alert('Revision description is required');
      return;
    }

    this.activeModal.close({
      action: 'create-version',
      revisionDescription: this.revisionDescription.trim(),
      notes: this.versionNotes.trim() || undefined
    } as VersionChangesDialogResult);
  }

  onCancel(): void {
    this.activeModal.dismiss('cancel');
  }
}
