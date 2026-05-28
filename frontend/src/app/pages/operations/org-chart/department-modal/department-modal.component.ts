import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { DepartmentService, Department } from '../services/department.service';

@Component({
  selector: 'app-department-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-header">
      <div>
        <h4 class="modal-title mb-0">{{ isEditMode ? 'Edit Department' : 'Add Department' }}</h4>
        <small class="text-muted">Manage department placeholder groupings for the org chart.</small>
      </div>
      <button type="button" class="btn-close" (click)="close()" aria-label="Close"></button>
    </div>

    <div class="modal-body">
      <form [formGroup]="departmentForm" class="row g-4">
        <div class="col-12">
          <div class="border rounded-3 p-3 p-md-4 bg-light-subtle">
            <div class="mb-3">
              <h6 class="mb-1 fw-semibold">Department Details</h6>
              <div class="small text-muted">This name is used for the department placeholder and assignment list.</div>
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
  isLoading = false;
  isEditMode = false;
  canDelete = false;

  constructor(
    private fb: FormBuilder,
    private departmentService: DepartmentService,
    private activeModal: NgbActiveModal,
  ) {
    this.initializeForm();
  }

  ngOnInit() {
    this.isEditMode = !!this.currentDepartment;
    this.canDelete = this.isEditMode && (!this.currentDepartment?.user_count || this.currentDepartment.user_count === 0);
    this.populateForm();
  }

  initializeForm() {
    this.departmentForm = this.fb.group({
      department_name: ['', [Validators.required, Validators.minLength(2)]],
      display_order: [0, [Validators.min(0)]]
    });
  }

  populateForm() {
    if (this.currentDepartment) {
      this.departmentForm.patchValue({
        department_name: this.currentDepartment.department_name,
        display_order: this.currentDepartment.display_order || 0
      });
    } else {
      this.departmentForm.reset();
      this.departmentForm.patchValue({
        display_order: 0
      });
    }
  }

  // Removed loadAvailableUsers - not needed for simplified department creation

  onSubmit() {
    console.log('onSubmit called');
    console.log('Form valid:', this.departmentForm.valid);
    console.log('Form value:', this.departmentForm.value);
    console.log('Form errors:', this.departmentForm.errors);
    console.log('Is loading:', this.isLoading);
    
    if (this.departmentForm.valid && !this.isLoading) {
      console.log('Starting API call...');
      this.isLoading = true;
      const formData = { ...this.departmentForm.value };
      
      // Convert null strings to actual null values
      Object.keys(formData).forEach(key => {
        if (formData[key] === '' || formData[key] === 'null') {
          formData[key] = null;
        }
      });

      console.log('Processed form data:', formData);
      console.log('Is edit mode:', this.isEditMode);

      const operation = this.isEditMode 
        ? this.departmentService.updateDepartment({ ...this.currentDepartment, ...formData })
        : this.departmentService.createDepartment(formData);

      console.log('Making API call...');
      operation.subscribe({
        next: (response) => {
          console.log('API Response:', response);
          this.isLoading = false;
          if (response.success) {
            this.activeModal.close({ saved: true, deleted: false });
          } else {
            alert('Error: ' + (response as any).error);
          }
        },
        error: (error) => {
          console.error('API Error:', error);
          this.isLoading = false;
          alert('Error saving department: ' + error.message);
        }
      });
    } else {
      console.log('Form validation failed or already loading');
      if (!this.departmentForm.valid) {
        console.log('Form validation errors:');
        Object.keys(this.departmentForm.controls).forEach(key => {
          const control = this.departmentForm.get(key);
          if (control?.invalid) {
            console.log(`${key}:`, control.errors);
          }
        });
      }
    }
  }

  deleteDepartment() {
    if (this.currentDepartment && confirm('Are you sure you want to delete this department? This action cannot be undone.')) {
      this.isLoading = true;
      
      this.departmentService.deleteDepartment(this.currentDepartment.id).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.activeModal.close({ saved: false, deleted: true });
          } else {
            alert('Error: ' + (response as any).error);
          }
        },
        error: (error) => {
          this.isLoading = false;
          alert('Error deleting department: ' + error.message);
        }
      });
    }
  }

  close() {
    this.activeModal.dismiss('dismiss');
  }
}