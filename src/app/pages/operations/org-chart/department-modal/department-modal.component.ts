import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DepartmentService, Department, User } from '../services/department.service';

@Component({
  selector: 'app-department-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal fade" id="departmentModal" tabindex="-1" [class.show]="isVisible" [style.display]="isVisible ? 'block' : 'none'">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header pb-3">
            <h5 class="modal-title">
              <i class="mdi mdi-domain me-2"></i>
              {{ isEditMode ? 'Edit Department' : 'Add New Department' }}
            </h5>
            <button type="button" class="btn-close" (click)="close()"></button>
          </div>
          
          <div class="modal-body">
            <form [formGroup]="departmentForm" (ngSubmit)="onSubmit()">
              <div class="row">
                <div class="col-md-8">
                  <div class="mb-3">
                    <label for="department_name" class="form-label">
                      Department Name <span class="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      class="form-control"
                      id="department_name"
                      formControlName="department_name"
                      placeholder="Enter department name"
                      [class.is-invalid]="departmentForm.get('department_name')?.invalid && departmentForm.get('department_name')?.touched"
                    />
                    <div class="invalid-feedback" 
                         *ngIf="departmentForm.get('department_name')?.invalid && departmentForm.get('department_name')?.touched">
                      Department name is required
                    </div>
                  </div>
                </div>
                
                <!-- <div class="col-md-4">
                  <div class="mb-3">
                    <label for="display_order" class="form-label">Display Order</label>
                    <input
                      type="number"
                      class="form-control"
                      id="display_order"
                      formControlName="display_order"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div> -->
              </div>
              
              <!-- Simplified form - no parent department or department head needed -->
              
              <div class="d-flex justify-content-between align-items-center pt-3 border-top">
                <div>
                  <button 
                    type="button" 
                    class="btn btn-danger"
                    *ngIf="isEditMode && canDelete"
                    (click)="deleteDepartment()"
                    [disabled]="isLoading"
                  >
                    <i class="mdi mdi-delete me-1"></i>Delete Department
                  </button>
                </div>
                
                <div class="d-flex gap-2">
                  <button type="button" class="btn btn-secondary" (click)="close()" [disabled]="isLoading">
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    class="btn btn-primary" 
                    [disabled]="departmentForm.invalid || isLoading"
                  >
                    <i class="mdi mdi-loading mdi-spin me-1" *ngIf="isLoading"></i>
                    <i class="mdi mdi-check me-1" *ngIf="!isLoading"></i>
                    {{ isEditMode ? 'Update' : 'Create' }} Department
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal backdrop -->
    <div class="modal-backdrop fade show" *ngIf="isVisible"></div>
  `,
  styles: [`
    .modal {
      backdrop-filter: blur(3px);
    }
    
    .modal-dialog {
      margin: 1.75rem auto;
    }
    
    .modal-content {
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
      border: none;
      border-radius: 12px;
      overflow: hidden;
    }
    
    .modal-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px 12px 0 0;
      border-bottom: none;
      padding: 1.25rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .modal-title {
      font-weight: 600;
      font-size: 1.25rem;
      margin: 0;
      display: flex;
      align-items: center;
    }
    
    .modal-title i {
      margin-right: 0.5rem;
    }
    
    .btn-close {
      filter: invert(1);
      opacity: 0.8;
      background: none;
      border: none;
      font-size: 1.25rem;
      padding: 0.25rem;
      margin: 0;
      width: auto;
      height: auto;
      line-height: 1;
    }
    
    .btn-close:hover {
      opacity: 1;
      background-color: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
    
    .modal-body {
      padding: 1.5rem;
    }
    
    .form-label {
      font-weight: 500;
      color: #495057;
      margin-bottom: 0.5rem;
    }
    
    .form-control:focus,
    .form-select:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
    }
    
    .border-top {
      border-color: #dee2e6 !important;
      margin-top: 1rem;
      padding-top: 1rem;
    }
    
    .d-flex.justify-content-between .btn {
      min-width: 120px;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
    }
    
    .btn-primary:hover {
      background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
      transform: translateY(-1px);
    }
    
    .btn-danger {
      background-color: #dc3545;
      border-color: #dc3545;
    }
    
    .btn-danger:hover {
      background-color: #c82333;
      border-color: #bd2130;
      transform: translateY(-1px);
    }
    
    .btn-secondary {
      border-color: #6c757d;
    }
    
    .btn-secondary:hover {
      transform: translateY(-1px);
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
export class DepartmentModalComponent implements OnInit, OnChanges {
  @Input() isVisible = false;
  @Input() currentDepartment: Department | null = null;
  @Output() departmentSaved = new EventEmitter<void>();
  @Output() departmentDeleted = new EventEmitter<void>();
  @Output() modalClosed = new EventEmitter<void>();

  departmentForm: FormGroup;
  isLoading = false;
  isEditMode = false;
  canDelete = false;

  constructor(
    private fb: FormBuilder,
    private departmentService: DepartmentService
  ) {
    this.initializeForm();
  }

  ngOnInit() {
    // Simplified - no need to load users for department head selection
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.isVisible) {
      this.isEditMode = !!this.currentDepartment;
      this.canDelete = this.isEditMode && (!this.currentDepartment?.user_count || this.currentDepartment.user_count === 0);
      this.populateForm();
    }
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
            this.departmentSaved.emit();
            this.close();
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
            this.departmentDeleted.emit();
            this.close();
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
    this.isVisible = false;
    this.modalClosed.emit();
  }
}