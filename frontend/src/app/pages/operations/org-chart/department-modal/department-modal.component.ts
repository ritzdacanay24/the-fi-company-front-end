import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NotificationService } from '@app/core/services/notification.service';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';
import { DepartmentService, Department, User } from '../services/department.service';

@Component({
  selector: 'app-department-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-header">
      <div>
        <h4 class="modal-title mb-0">{{ isEditMode ? 'Edit Department' : 'Add Department' }}</h4>
        <small class="text-muted">Use departments to group people in the org chart.</small>
      </div>
      <button type="button" class="btn-close" (click)="close()" aria-label="Close"></button>
    </div>

    <div class="modal-body">
      <form [formGroup]="departmentForm" class="row g-4">
        <div class="col-12">
          <div class="border rounded-3 p-3 p-md-4 bg-light-subtle">
            <div class="mb-3">
              <h6 class="mb-1 fw-semibold">Department Details</h6>
              <div class="small text-muted">This controls the department name shown in the chart and department list.</div>
            </div>

            <div class="alert alert-light border mb-3" role="note">
              <div class="small text-muted mb-0">
                Departments group people together. Reporting lines still come from each person's manager.
              </div>
            </div>

            <div>
              <label for="department_name" class="form-label">Department Name <span class="text-danger">*</span></label>
              <input
                id="department_name"
                type="text"
                class="form-control"
                formControlName="department_name"
                placeholder="Enter department name"
                [class.is-invalid]="departmentForm.get('department_name')?.invalid && departmentForm.get('department_name')?.touched"
              />
              <div class="invalid-feedback" *ngIf="departmentForm.get('department_name')?.invalid && departmentForm.get('department_name')?.touched">
                Department name is required.
              </div>
            </div>

            <div class="mt-3">
              <label for="department_head_user_id" class="form-label">Department Lead</label>
              <select id="department_head_user_id" class="form-select" formControlName="department_head_user_id">
                <option [ngValue]="null">No department lead</option>
                <option *ngFor="let user of availableUsers" [ngValue]="user.id">
                  {{ user.name }}<span *ngIf="user.title"> · {{ user.title }}</span>
                </option>
              </select>
              <div class="form-text">Use this for the functional owner of the department. Reporting lines still come from each person's manager.</div>
            </div>

            <div class="mt-3">
              <label for="display_order" class="form-label">Display Order</label>
              <input id="display_order" type="number" min="0" class="form-control" formControlName="display_order" />
            </div>
          </div>
        </div>
      </form>
    </div>

    <div class="modal-footer justify-content-between">
      <button
        type="button"
        class="btn btn-outline-danger"
        *ngIf="isEditMode && canDelete"
        (click)="deleteDepartment()"
        [disabled]="isLoading">
        Delete Department
      </button>
      <div class="d-flex gap-2 ms-auto">
        <button type="button" class="btn btn-light" (click)="close()" [disabled]="isLoading">Cancel</button>
        <button type="button" class="btn btn-primary" (click)="onSubmit()" [disabled]="departmentForm.invalid || isLoading">
          <i class="mdi mdi-loading mdi-spin me-1" *ngIf="isLoading"></i>
          {{ isEditMode ? 'Update Department' : 'Create Department' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .form-label {
      font-weight: 500;
      color: #495057;
      margin-bottom: 0.5rem;
    }

    .form-control:focus,
    .form-select:focus {
      border-color: var(--vz-primary);
      box-shadow: 0 0 0 0.2rem rgba(64, 81, 137, 0.12);
    }

    .form-control, .form-select {
      border-radius: 6px;
      border: 1px solid #ced4da;
      transition: all 0.15s ease-in-out;
    }

    .invalid-feedback {
      display: block;
    }

    .text-danger {
      color: #dc3545 !important;
    }
  `]
})
export class DepartmentModalComponent implements OnInit {
  @Input() currentDepartment: Department | null = null;

  departmentForm: FormGroup;
  availableUsers: User[] = [];
  isLoading = false;
  isEditMode = false;
  canDelete = false;

  constructor(
    private fb: FormBuilder,
    private departmentService: DepartmentService,
    private notificationService: NotificationService,
    private activeModal: NgbActiveModal,
  ) {
    this.initializeForm();
  }

  ngOnInit() {
    this.isEditMode = !!this.currentDepartment;
    this.canDelete = this.isEditMode && (!this.currentDepartment?.user_count || this.currentDepartment.user_count === 0);
    this.populateForm();
    this.loadAvailableUsers();
  }

  initializeForm() {
    this.departmentForm = this.fb.group({
      department_name: ['', [Validators.required, Validators.minLength(2)]],
      department_head_user_id: [null],
      display_order: [0, [Validators.min(0)]]
    });
  }

  populateForm() {
    if (this.currentDepartment) {
      this.departmentForm.patchValue({
        department_name: this.currentDepartment.department_name,
        department_head_user_id: this.currentDepartment.department_head_user_id ?? null,
        display_order: this.currentDepartment.display_order || 0
      });
    } else {
      this.departmentForm.reset();
      this.departmentForm.patchValue({
        department_head_user_id: null,
        display_order: 0
      });
    }
  }

  loadAvailableUsers() {
    this.departmentService.getAvailableUsers().subscribe({
      next: (response) => {
        if (response.success) {
          this.availableUsers = response.data;
        }
      },
      error: () => {
        this.availableUsers = [];
      }
    });
  }

  onSubmit() {
    if (this.departmentForm.valid && !this.isLoading) {
      this.isLoading = true;
      const formData = { ...this.departmentForm.value };
      
      // Convert null strings to actual null values
      Object.keys(formData).forEach(key => {
        if (formData[key] === '' || formData[key] === 'null') {
          formData[key] = null;
        }
      });

      const operation = this.isEditMode 
        ? this.departmentService.updateDepartment({ ...this.currentDepartment, ...formData })
        : this.departmentService.createDepartment(formData);

      operation.subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.notificationService.success(this.isEditMode ? 'Department updated successfully.' : 'Department created successfully.');
            this.activeModal.close({ saved: true, deleted: false });
          } else {
            this.notificationService.error((response as any).error || 'Failed to save department.', false);
          }
        },
        error: (error) => {
          console.error('API Error:', error);
          this.isLoading = false;
          this.notificationService.error(error, false);
        }
      });
    }
  }

  async deleteDepartment() {
    if (!this.currentDepartment) {
      return;
    }

    const result = await SweetAlert.confirmV1({
      title: 'Delete Department?',
      text: 'Are you sure you want to delete this department? This action cannot be undone.',
      confirmButtonText: 'Delete Department',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    this.isLoading = true;
    
    this.departmentService.deleteDepartment(this.currentDepartment.id).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.notificationService.success('Department deleted successfully.');
          this.activeModal.close({ saved: false, deleted: true });
        } else {
          this.notificationService.error((response as any).error || 'Failed to delete department.', false);
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.notificationService.error(error, false);
      }
    });
  }

  close() {
    this.activeModal.dismiss('dismiss');
  }
}