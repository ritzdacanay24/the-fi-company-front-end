import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

export interface OpenPositionModalOption {
  id: number;
  label: string;
}

export interface OpenPositionModalResult {
  action: 'create' | 'update' | 'fill' | 'close';
  title: string;
  managerId: number | null;
  department: string | null;
  location: string | null;
  filledByUserId: number | null;
}

@Component({
  standalone: true,
  selector: 'app-open-position-modal',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-header">
      <div>
        <h5 class="modal-title mb-0">{{ mode === 'create' ? 'Create Open Position' : 'Manage Open Position' }}</h5>
        <small class="text-muted">
          {{ mode === 'create' ? 'Add a vacancy directly to the org chart.' : 'Edit, fill, or close this vacancy.' }}
        </small>
      </div>
      <button type="button" class="btn-close" (click)="dismiss()" aria-label="Close"></button>
    </div>

    <div class="modal-body">
      <form [formGroup]="form" class="row g-3">
        <div class="col-12">
          <label class="form-label">Position Title <span class="text-danger">*</span></label>
          <input
            type="text"
            class="form-control"
            placeholder="e.g. Warehouse Supervisor"
            formControlName="title"
            [class.is-invalid]="form.get('title')?.touched && form.get('title')?.invalid" />
          <div class="invalid-feedback" *ngIf="form.get('title')?.touched && form.get('title')?.invalid">
            Position title is required.
          </div>
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label">Reports To</label>
          <select class="form-select" formControlName="managerId">
            <option [ngValue]="null">No manager</option>
            <option *ngFor="let manager of managerOptions" [ngValue]="manager.id">{{ manager.label }}</option>
          </select>
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label">Department Group</label>
          <select class="form-select" formControlName="department">
            <option [ngValue]="null">Unassigned</option>
            <option *ngFor="let department of departmentOptions" [ngValue]="department">{{ department }}</option>
          </select>
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label">Location</label>
          <select class="form-select" formControlName="location">
            <option [ngValue]="null">Unassigned</option>
            <option *ngFor="let location of locationOptions" [ngValue]="location">{{ location }}</option>
          </select>
        </div>

        <div class="col-12" *ngIf="mode === 'manage'">
          <label class="form-label">Filled By</label>
          <select class="form-select" formControlName="filledByUserId">
            <option [ngValue]="null">Select a user</option>
            <option *ngFor="let user of fillUserOptions" [ngValue]="user.id">{{ user.label }}</option>
          </select>
        </div>
      </form>
    </div>

    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="dismiss()">Cancel</button>
      <button *ngIf="mode === 'manage'" type="button" class="btn btn-outline-danger" (click)="closePosition()">
        Close Position
      </button>
      <button *ngIf="mode === 'manage'" type="button" class="btn btn-outline-success" (click)="fillPosition()">
        Fill Position
      </button>
      <button type="button" class="btn btn-primary" [disabled]="form.invalid" (click)="submit()">
        {{ mode === 'create' ? 'Create Open Position' : 'Save Changes' }}
      </button>
    </div>
  `,
})
export class OpenPositionModalComponent implements OnInit {
  @Input() mode: 'create' | 'manage' = 'create';
  @Input() positionId: number | null = null;
  @Input() managerOptions: OpenPositionModalOption[] = [];
  @Input() departmentOptions: string[] = [];
  @Input() locationOptions: string[] = [];
  @Input() fillUserOptions: OpenPositionModalOption[] = [];
  @Input() initialValue: Partial<OpenPositionModalResult> | null = null;

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    managerId: [null as number | null],
    department: [null as string | null],
    location: [null as string | null],
    filledByUserId: [null as number | null],
  });

  constructor(private readonly fb: FormBuilder, private readonly activeModal: NgbActiveModal) {}

  ngOnInit(): void {
    this.managerOptions = [...(this.managerOptions || [])].sort((left, right) => left.label.localeCompare(right.label));
    this.departmentOptions = [...(this.departmentOptions || [])].sort((left, right) => left.localeCompare(right));
    this.locationOptions = [...(this.locationOptions || [])].sort((left, right) => left.localeCompare(right));
    this.fillUserOptions = [...(this.fillUserOptions || [])].sort((left, right) => left.label.localeCompare(right.label));

    if (this.initialValue) {
      this.form.patchValue({
        title: this.initialValue.title || '',
        managerId: this.initialValue.managerId ?? null,
        department: this.initialValue.department ?? null,
        location: this.initialValue.location ?? null,
        filledByUserId: this.initialValue.filledByUserId ?? null,
      });
    }
  }

  dismiss(): void {
    this.activeModal.dismiss('dismiss');
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const result: OpenPositionModalResult = {
      action: this.mode === 'create' ? 'create' : 'update',
      title: String(value.title || '').trim(),
      managerId: value.managerId != null ? Number(value.managerId) : null,
      department: value.department ? String(value.department).trim() : null,
      location: value.location ? String(value.location).trim() : null,
      filledByUserId: value.filledByUserId != null ? Number(value.filledByUserId) : null,
    };

    this.activeModal.close(result);
  }

  fillPosition(): void {
    if (this.positionId == null) {
      return;
    }

    const value = this.form.getRawValue();
    const result: OpenPositionModalResult = {
      action: 'fill',
      title: String(value.title || '').trim(),
      managerId: value.managerId != null ? Number(value.managerId) : null,
      department: value.department ? String(value.department).trim() : null,
      location: value.location ? String(value.location).trim() : null,
      filledByUserId: value.filledByUserId != null ? Number(value.filledByUserId) : null,
    };

    this.activeModal.close(result);
  }

  closePosition(): void {
    if (this.positionId == null) {
      return;
    }

    const value = this.form.getRawValue();
    const result: OpenPositionModalResult = {
      action: 'close',
      title: String(value.title || '').trim(),
      managerId: value.managerId != null ? Number(value.managerId) : null,
      department: value.department ? String(value.department).trim() : null,
      location: value.location ? String(value.location).trim() : null,
      filledByUserId: value.filledByUserId != null ? Number(value.filledByUserId) : null,
    };

    this.activeModal.close(result);
  }
}
