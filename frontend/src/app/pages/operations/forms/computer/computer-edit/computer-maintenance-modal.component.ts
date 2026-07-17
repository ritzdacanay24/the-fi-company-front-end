import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { InlineAttachmentDropzoneComponent } from '@app/shared/components/inline-attachment-dropzone/inline-attachment-dropzone.component';
import { PendingAttachmentsListComponent } from '@app/shared/components/attachments/pending-attachments-list/pending-attachments-list.component';

@Component({
  standalone: true,
  selector: 'app-computer-maintenance-modal',
  imports: [CommonModule, ReactiveFormsModule, InlineAttachmentDropzoneComponent, PendingAttachmentsListComponent],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">{{ mode === 'edit' ? 'Edit Computer Maintenance' : 'Add Computer Maintenance' }}</h5>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>

    <div class="modal-body" [formGroup]="form">
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label required">Service Date</label>
          <input type="date" class="form-control" formControlName="service_date">
        </div>
        <div class="col-md-6">
          <label class="form-label">Usage Hours</label>
          <input type="number" class="form-control" formControlName="usage_hours" placeholder="Optional usage hours">
        </div>
        <div class="col-12">
          <label class="form-label required">Service Type</label>
          <input type="text" class="form-control" formControlName="service_type" placeholder="PM, battery service, tires, etc.">
        </div>
        <div class="col-12">
          <label class="form-label">Description</label>
          <textarea rows="3" class="form-control" formControlName="description" placeholder="Optional notes"></textarea>
        </div>
        <div class="col-md-6">
          <label class="form-label">Vendor</label>
          <input type="text" class="form-control" formControlName="vendor_name" placeholder="Optional vendor">
        </div>
        <div class="col-md-6">
          <label class="form-label">Cost</label>
          <input type="number" min="0" step="0.01" class="form-control" formControlName="cost" placeholder="Optional cost">
        </div>
        <div class="col-md-6">
          <label class="form-label">Ticket / Invoice #</label>
          <input type="text" class="form-control" formControlName="ticket_no" placeholder="Optional reference">
        </div>
        <div class="col-md-6">
          <label class="form-label">Next Service Date</label>
          <input type="date" class="form-control" formControlName="next_service_date">
        </div>
        <div class="col-md-6">
          <label class="form-label">Next Service Usage Hours</label>
          <input type="number" class="form-control" formControlName="next_service_usage_hours" placeholder="Optional next-service usage">
        </div>

        <div class="col-12" *ngIf="mode === 'create'">
          <div class="pt-2 border-top">
            <h6 class="mb-2">Maintenance Attachments (Optional)</h6>
            <app-inline-attachment-dropzone (filesAdded)="onAttachmentFilesAdded($event)"></app-inline-attachment-dropzone>
            <div class="mt-2">
              <app-pending-attachments-list
                [files]="selectedFiles"
                [helperText]="'Selected files upload after this maintenance entry is created.'"
                (removeRequested)="removeFile($event)">
              </app-pending-attachments-list>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <button type="button" class="btn btn-outline-secondary" (click)="activeModal.dismiss()">Cancel</button>
      <button type="button" class="btn btn-primary" [disabled]="form.invalid" (click)="save()">
        {{ mode === 'edit' ? 'Save Changes' : 'Save Maintenance' }}
      </button>
    </div>
  `,
})
export class ComputerMaintenanceModalComponent {
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() initialData: any = null;

  form: FormGroup;
  selectedFiles: File[] = [];

  constructor(
    public readonly activeModal: NgbActiveModal,
    private readonly fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      service_date: ['', Validators.required],
      usage_hours: [null],
      service_type: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      vendor_name: ['', [Validators.maxLength(255)]],
      cost: [null],
      ticket_no: ['', [Validators.maxLength(100)]],
      next_service_date: [''],
      next_service_usage_hours: [null],
    });
  }

  ngOnInit(): void {
    if (this.mode !== 'edit' || !this.initialData) {
      return;
    }

    this.form.patchValue({
      service_date: String(this.initialData?.service_date || '').slice(0, 10),
      usage_hours: this.initialData?.usage_hours ?? null,
      service_type: String(this.initialData?.service_type || ''),
      description: String(this.initialData?.description || ''),
      vendor_name: String(this.initialData?.vendor_name || ''),
      cost: this.initialData?.cost ?? null,
      ticket_no: String(this.initialData?.ticket_no || ''),
      next_service_date: String(this.initialData?.next_service_date || '').slice(0, 10),
      next_service_usage_hours: this.initialData?.next_service_usage_hours ?? null,
    });
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    this.activeModal.close({
      service_date: String(value?.service_date || '').trim(),
      usage_hours: value?.usage_hours === null || value?.usage_hours === undefined || value?.usage_hours === ''
        ? null
        : Number(value.usage_hours),
      service_type: String(value?.service_type || '').trim(),
      description: String(value?.description || '').trim(),
      vendor_name: String(value?.vendor_name || '').trim(),
      cost: value?.cost === null || value?.cost === undefined || value?.cost === ''
        ? null
        : Number(value.cost),
      ticket_no: String(value?.ticket_no || '').trim(),
      next_service_date: String(value?.next_service_date || '').trim(),
      next_service_usage_hours: value?.next_service_usage_hours === null || value?.next_service_usage_hours === undefined || value?.next_service_usage_hours === ''
        ? null
        : Number(value.next_service_usage_hours),
      files: this.mode === 'create' ? [...this.selectedFiles] : [],
    });
  }

  onAttachmentFilesAdded(files: File[]): void {
    this.selectedFiles = [...this.selectedFiles, ...(files || [])];
  }

  removeFile(index: number): void {
    if (index < 0 || index >= this.selectedFiles.length) {
      return;
    }

    this.selectedFiles.splice(index, 1);
    this.selectedFiles = [...this.selectedFiles];
  }
}
