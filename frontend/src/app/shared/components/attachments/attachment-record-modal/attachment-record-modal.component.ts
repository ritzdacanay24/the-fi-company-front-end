import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import { FormBuilder, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: "app-attachment-record-modal",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">Attachment Record</h5>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>

    <div class="modal-body" [formGroup]="form">
      <div class="border rounded p-3 mb-3 bg-light-subtle">
        <h6 class="mb-3">Summary</h6>
        <div class="row g-2 small">
          <div class="col-md-6"><span class="text-muted">Main ID:</span> {{ mainId || '-' }}</div>
          <div class="col-md-6"><span class="text-muted">Field:</span> {{ fieldName || '-' }}</div>
          <div class="col-md-6"><span class="text-muted">Extension:</span> {{ extension || '-' }}</div>
          <div class="col-md-6"><span class="text-muted">Created By:</span> {{ createdBy || '-' }}</div>
          <div class="col-md-6"><span class="text-muted">Storage Source:</span> {{ storageSource || '-' }}</div>
          <div class="col-md-6"><span class="text-muted">Bucket:</span> {{ storageBucket || '-' }}</div>
          <div class="col-12"><span class="text-muted">Storage Key:</span> {{ storageKey || '-' }}</div>
          <div class="col-12"><span class="text-muted">Created At:</span> {{ createdAt ? (createdAt | date:'MMM d, y h:mm a') : '-' }}</div>
        </div>
      </div>

      <div class="mb-3">
        <label class="form-label">File Name</label>
        <input class="form-control" [value]="fileName" readonly>
      </div>

      <div class="row g-3 mb-3">
        <div class="col-md-6">
          <label class="form-label">Attachment ID</label>
          <input class="form-control" [value]="attachmentId" readonly>
        </div>
        <div class="col-md-6">
          <label class="form-label">Status</label>
          <input class="form-control" [value]="isActive ? 'Active' : 'Inactive'" readonly>
        </div>
      </div>

      <div class="mb-3">
        <label class="form-label">Title</label>
        <input class="form-control" formControlName="title" placeholder="Optional title">
      </div>

      <div class="mb-0">
        <label class="form-label">Description</label>
        <textarea class="form-control" rows="4" formControlName="description" placeholder="Optional description"></textarea>
      </div>
    </div>

    <div class="modal-footer">
      <button type="button" class="btn btn-outline-secondary" (click)="activeModal.dismiss()">Cancel</button>
      <button type="button" class="btn btn-primary" [disabled]="isSaving" (click)="save()">
        <span *ngIf="isSaving" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        Save
      </button>
    </div>
  `,
})
export class AttachmentRecordModalComponent {
  @Input() attachmentId: number | string | null = null;
  @Input() fileName = "";
  @Input() isActive = true;
  @Input() initialTitle = "";
  @Input() initialDescription = "";
  @Input() mainId: number | string | null = null;
  @Input() extension = "";
  @Input() createdBy = "";
  @Input() fieldName = "";
  @Input() storageBucket = "";
  @Input() storageSource = "";
  @Input() storageKey = "";
  @Input() createdAt: string | null = null;

  form: FormGroup;
  isSaving = false;

  constructor(
    public readonly activeModal: NgbActiveModal,
    private readonly fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      title: [""],
      description: [""],
    });
  }

  ngOnInit(): void {
    this.form.patchValue({
      title: this.initialTitle || "",
      description: this.initialDescription || "",
    });
  }

  save(): void {
    this.isSaving = true;

    const value = this.form.getRawValue();
    this.activeModal.close({
      title: String(value?.title || "").trim(),
      description: String(value?.description || "").trim(),
    });
  }
}
