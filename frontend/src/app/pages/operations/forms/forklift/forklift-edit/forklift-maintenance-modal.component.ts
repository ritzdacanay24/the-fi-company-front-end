import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { InlineAttachmentDropzoneComponent } from '@app/shared/components/inline-attachment-dropzone/inline-attachment-dropzone.component';
import { PendingAttachmentsListComponent } from '@app/shared/components/attachments/pending-attachments-list/pending-attachments-list.component';

@Component({
  standalone: true,
  selector: 'app-forklift-maintenance-modal',
  imports: [CommonModule, ReactiveFormsModule, InlineAttachmentDropzoneComponent, PendingAttachmentsListComponent],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">{{ mode === 'edit' ? 'Edit Forklift Maintenance' : 'Add Forklift Maintenance' }}</h5>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>

    <div class="modal-body" [formGroup]="form">
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label required">Service Date</label>
          <input type="date" class="form-control" formControlName="service_date">
        </div>
        <div class="col-md-6">
          <label class="form-label">Hour Meter</label>
          <input type="number" class="form-control" formControlName="hour_meter" placeholder="Optional hour meter">
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
          <label class="form-label">Work Order / Invoice #</label>
          <input type="text" class="form-control" formControlName="work_order_no" placeholder="Optional reference">
        </div>
        <div class="col-md-6">
          <label class="form-label">Next Service Date</label>
          <input type="date" class="form-control" formControlName="next_service_date">
        </div>
        <div class="col-md-6">
          <label class="form-label">Next Service Hour Meter</label>
          <input type="number" class="form-control" formControlName="next_service_hour_meter" placeholder="Optional next PM hours">
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
      <button type="button" class="btn btn-dark" [disabled]="form.invalid" (click)="save()">
        {{ mode === 'edit' ? 'Save Changes' : 'Save Maintenance' }}
      </button>
    </div>
  `,
})
export class ForkliftMaintenanceModalComponent {
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
      hour_meter: [null],
      service_type: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      vendor_name: ['', [Validators.maxLength(255)]],
      cost: [null],
      work_order_no: ['', [Validators.maxLength(100)]],
      next_service_date: [''],
      next_service_hour_meter: [null],
    });
  }

  ngOnInit(): void {
    if (this.mode !== 'edit' || !this.initialData) {
      return;
    }

    this.form.patchValue({
      service_date: String(this.initialData?.service_date || '').slice(0, 10),
      hour_meter: this.initialData?.hour_meter ?? null,
      service_type: String(this.initialData?.service_type || ''),
      description: String(this.initialData?.description || ''),
      vendor_name: String(this.initialData?.vendor_name || ''),
      cost: this.initialData?.cost ?? null,
      work_order_no: String(this.initialData?.work_order_no || ''),
      next_service_date: String(this.initialData?.next_service_date || '').slice(0, 10),
      next_service_hour_meter: this.initialData?.next_service_hour_meter ?? null,
    });
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    this.activeModal.close({
      service_date: String(value?.service_date || '').trim(),
      hour_meter: value?.hour_meter === null || value?.hour_meter === undefined || value?.hour_meter === ''
        ? null
        : Number(value.hour_meter),
      service_type: String(value?.service_type || '').trim(),
      description: String(value?.description || '').trim(),
      vendor_name: String(value?.vendor_name || '').trim(),
      cost: value?.cost === null || value?.cost === undefined || value?.cost === ''
        ? null
        : Number(value.cost),
      work_order_no: String(value?.work_order_no || '').trim(),
      next_service_date: String(value?.next_service_date || '').trim(),
      next_service_hour_meter: value?.next_service_hour_meter === null || value?.next_service_hour_meter === undefined || value?.next_service_hour_meter === ''
        ? null
        : Number(value.next_service_hour_meter),
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
