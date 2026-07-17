import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { InlineAttachmentDropzoneComponent } from "@app/shared/components/inline-attachment-dropzone/inline-attachment-dropzone.component";
import { PendingAttachmentsListComponent } from "@app/shared/components/attachments/pending-attachments-list/pending-attachments-list.component";

@Component({
  standalone: true,
  selector: "app-vehicle-maintenance-modal",
  imports: [CommonModule, ReactiveFormsModule, InlineAttachmentDropzoneComponent, PendingAttachmentsListComponent],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">{{ mode === 'edit' ? 'Edit Maintenance Service' : 'Add Maintenance Service' }}</h5>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>

    <div class="modal-body" [formGroup]="form">
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label required">Service Date</label>
          <input type="date" class="form-control" formControlName="service_date">
        </div>
        <div class="col-md-6">
          <label class="form-label">Mileage</label>
          <input type="number" class="form-control" formControlName="mileage" placeholder="Optional mileage">
        </div>
        <div class="col-12">
          <label class="form-label required">Service Type</label>
          <input type="text" class="form-control" formControlName="service_type" placeholder="Oil change, brake service, tire rotation, etc.">
        </div>
        <div class="col-12">
          <label class="form-label">Description</label>
          <textarea rows="4" class="form-control" formControlName="description" placeholder="Optional maintenance notes"></textarea>
        </div>
        <div class="col-md-6">
          <label class="form-label">Vendor</label>
          <input type="text" class="form-control" formControlName="vendor_name" placeholder="Optional shop or service provider">
        </div>
        <div class="col-md-6">
          <label class="form-label">Cost</label>
          <input type="number" min="0" step="0.01" class="form-control" formControlName="cost" placeholder="Optional total cost">
        </div>
        <div class="col-md-6">
          <label class="form-label">Work Order / Invoice #</label>
          <input type="text" class="form-control" formControlName="work_order_no" placeholder="Optional reference number">
        </div>
        <div class="col-md-6">
          <label class="form-label">Next Service Date</label>
          <input type="date" class="form-control" formControlName="next_service_date">
        </div>
        <div class="col-md-6">
          <label class="form-label">Next Service Mileage</label>
          <input type="number" class="form-control" formControlName="next_service_mileage" placeholder="Optional next service mileage">
        </div>

        <div class="col-12" *ngIf="mode === 'create'">
          <div class="pt-2 border-top">
            <h6 class="mb-2">Service Attachments (Optional)</h6>
            <p class="text-muted small mb-2">Add receipts, invoices, work orders, or photos for this service record.</p>

            <app-inline-attachment-dropzone
              (filesAdded)="onAttachmentFilesAdded($event)">
            </app-inline-attachment-dropzone>

            <div class="mt-2">
              <app-pending-attachments-list
                [files]="selectedFiles"
                [helperText]="'Selected files will upload after this maintenance service is saved.'"
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
        {{ mode === 'edit' ? 'Save Changes' : 'Save Service' }}
      </button>
    </div>
  `,
})
export class VehicleMaintenanceModalComponent {
  @Input() mode: "create" | "edit" = "create";
  @Input() initialData: any = null;

  form: FormGroup;
  selectedFiles: File[] = [];

  constructor(
    public readonly activeModal: NgbActiveModal,
    private readonly fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      service_date: ["", Validators.required],
      mileage: [null],
      service_type: ["", [Validators.required, Validators.maxLength(255)]],
      description: [""],
      vendor_name: ["", [Validators.maxLength(255)]],
      cost: [null],
      work_order_no: ["", [Validators.maxLength(100)]],
      next_service_date: [""],
      next_service_mileage: [null],
    });
  }

  ngOnInit(): void {
    if (this.mode !== 'edit' || !this.initialData) {
      return;
    }

    this.form.patchValue({
      service_date: String(this.initialData?.service_date || '').slice(0, 10),
      mileage: this.initialData?.mileage ?? null,
      service_type: String(this.initialData?.service_type || ''),
      description: String(this.initialData?.description || ''),
      vendor_name: String(this.initialData?.vendor_name || ''),
      cost: this.initialData?.cost ?? null,
      work_order_no: String(this.initialData?.work_order_no || ''),
      next_service_date: String(this.initialData?.next_service_date || '').slice(0, 10),
      next_service_mileage: this.initialData?.next_service_mileage ?? null,
    });
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    this.activeModal.close({
      service_date: String(value?.service_date || "").trim(),
      mileage: value?.mileage === null || value?.mileage === undefined || value?.mileage === ""
        ? null
        : Number(value.mileage),
      service_type: String(value?.service_type || "").trim(),
      description: String(value?.description || "").trim(),
      vendor_name: String(value?.vendor_name || "").trim(),
      cost: value?.cost === null || value?.cost === undefined || value?.cost === ""
        ? null
        : Number(value.cost),
      work_order_no: String(value?.work_order_no || "").trim(),
      next_service_date: String(value?.next_service_date || "").trim(),
      next_service_mileage: value?.next_service_mileage === null || value?.next_service_mileage === undefined || value?.next_service_mileage === ""
        ? null
        : Number(value.next_service_mileage),
      files: this.mode === 'create' ? [...this.selectedFiles] : [],
    });
  }

  onAttachmentFilesAdded(files: File[]): void {
    this.addFiles(files || []);
  }

  removeFile(index: number): void {
    if (index < 0 || index >= this.selectedFiles.length) {
      return;
    }

    this.selectedFiles.splice(index, 1);
    this.selectedFiles = [...this.selectedFiles];
  }

  private addFiles(files: File[]): void {
    if (!files.length) {
      return;
    }

    const dedupedFiles = new Map(
      this.selectedFiles.map((file) => [this.getFileKey(file), file]),
    );

    files.forEach((file) => {
      dedupedFiles.set(this.getFileKey(file), file);
    });

    this.selectedFiles = Array.from(dedupedFiles.values());
  }

  private getFileKey(file: File): string {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }
}
