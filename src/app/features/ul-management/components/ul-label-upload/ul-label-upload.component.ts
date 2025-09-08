import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '@app/shared/shared.module';
import { ULLabelService } from '../../services/ul-label.service';
import { ULLabel } from '../../models/ul-label.model';
import { BreadcrumbComponent, BreadcrumbItem } from "@app/shared/components/breadcrumb/breadcrumb.component";
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  standalone: true,
  imports: [SharedModule, BreadcrumbComponent],
  selector: 'app-ul-label-upload',
  templateUrl: './ul-label-upload.component.html',
  styleUrls: ['./ul-label-upload.component.scss']
})
export class ULLabelUploadComponent implements OnInit {
  uploadForm: FormGroup;
  rangeForm: FormGroup;
  isLoading = false;
  selectedFile: File | null = null;
  uploadProgress = 0;
  showBulkUpload = false;
  showRangeUpload = false;

  // Upload mode: 'single', 'bulk', 'range'
  uploadMode = 'single';

  constructor(
    private fb: FormBuilder,
    private ulLabelService: ULLabelService,
    private toastr: ToastrService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.uploadForm = this.fb.group({
      ul_number: ['', [Validators.required, Validators.pattern(/^[A-Z0-9-]+$/)]],
      description: ['', [Validators.required, Validators.minLength(5)]],
      category: ['', Validators.required],
      manufacturer: [''],
      part_number: [''],
      certification_date: [''],
      expiry_date: [''],
      status: ['active', Validators.required]
    });

    this.rangeForm = this.fb.group({
      start_number: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      end_number: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      prefix: ['', Validators.pattern(/^[A-Z]*$/)],
      suffix: ['', Validators.pattern(/^[A-Z0-9-]*$/)],
      description: ['UL certified product', [Validators.required, Validators.minLength(5)]],
      category: ['', Validators.required],
      manufacturer: [''],
      part_number: [''],
      certification_date: [''],
      expiry_date: [''],
      status: ['active', Validators.required]
    });
  }

  ngOnInit(): void { }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.xlsx')) {
        this.toastr.error('Please select a CSV or Excel file');
        return;
      }
      this.selectedFile = file;
    }
  }

  onSubmit(): void {
    if (this.uploadForm.valid) {
      this.isLoading = true;
      const ulLabel: ULLabel = this.uploadForm.value;

      this.ulLabelService.createULLabel(ulLabel).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.toastr.success('UL Label uploaded successfully!');
            this.uploadForm.reset();
            this.uploadForm.patchValue({ status: 'active' });
          } else {
            this.toastr.error(response.message || 'Failed to upload UL Label');
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Upload error:', error);
          this.toastr.error('Error uploading UL Label');
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  onRangeUpload(): void {
    if (this.rangeForm.valid) {
      const formData = this.rangeForm.value;
      const startNum = parseInt(formData.start_number);
      const endNum = parseInt(formData.end_number);

      // Validation
      if (startNum >= endNum) {
        this.toastr.error('End number must be greater than start number');
        return;
      }

      const totalNumbers = endNum - startNum + 1;
      if (totalNumbers > 1000) {
        this.toastr.error('Range too large. Maximum 1000 UL numbers per upload.');
        return;
      }

      this.isLoading = true;
      this.uploadProgress = 0;

      // Generate UL labels from range
      const ulLabels: Partial<ULLabel>[] = [];
      for (let i = startNum; i <= endNum; i++) {
        const ulNumber = `${formData.prefix}${i}${formData.suffix}`;
        ulLabels.push({
          ul_number: ulNumber,
          description: formData.description,
          category: formData.category,
          manufacturer: formData.manufacturer || null,
          part_number: formData.part_number || null,
          certification_date: formData.certification_date || null,
          expiry_date: formData.expiry_date || null,
          status: formData.status
        });
      }

      // Bulk upload the generated range
      this.ulLabelService.bulkCreateULLabels(ulLabels).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.toastr.success(`Successfully uploaded ${response.data.uploaded_count} UL numbers from range!`);
            if (response.data.errors && response.data.errors.length > 0) {
              this.toastr.warning(`${response.data.errors.length} numbers already existed and were skipped`);
            }
            this.rangeForm.reset();
            this.rangeForm.patchValue({ status: 'active', description: 'UL certified product' });
          } else {
            this.toastr.error(response.message || 'Range upload failed');
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Range upload error:', error);
          this.toastr.error('Error uploading UL number range');
        }
      });
    } else {
      this.markFormGroupTouched(this.rangeForm);
    }
  }

  generatePreview(): string[] {
    if (!this.rangeForm.valid) return [];

    const formData = this.rangeForm.value;
    const startNum = parseInt(formData.start_number);
    const endNum = parseInt(formData.end_number);

    if (isNaN(startNum) || isNaN(endNum) || startNum >= endNum) return [];

    const preview: string[] = [];
    const maxPreview = Math.min(5, endNum - startNum + 1);

    for (let i = 0; i < maxPreview; i++) {
      const num = startNum + i;
      preview.push(`${formData.prefix}${num}${formData.suffix}`);
    }

    if (endNum - startNum + 1 > 5) {
      preview.push('...');
      preview.push(`${formData.prefix}${endNum}${formData.suffix}`);
    }

    return preview;
  }

  getRangeCount(): number {
    if (!this.rangeForm.valid) return 0;

    const formData = this.rangeForm.value;
    const startNum = parseInt(formData.start_number);
    const endNum = parseInt(formData.end_number);

    if (isNaN(startNum) || isNaN(endNum) || startNum >= endNum) return 0;

    return endNum - startNum + 1;
  }

  onBulkUpload(): void {
    if (!this.selectedFile) {
      this.toastr.error('Please select a file first');
      return;
    }

    this.isLoading = true;
    this.uploadProgress = 0;

    this.ulLabelService.bulkUploadULLabels(this.selectedFile).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.toastr.success(`Successfully uploaded ${response.data.uploaded_count} UL Labels`);
          if (response.data.errors && response.data.errors.length > 0) {
            this.toastr.warning(`${response.data.errors.length} records had errors`);
          }
          this.selectedFile = null;
          const fileInput = document.getElementById('bulkFile') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        } else {
          this.toastr.error(response.message || 'Bulk upload failed');
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Bulk upload error:', error);
        this.toastr.error('Error during bulk upload');
      }
    });
  }

  downloadTemplate(): void {
    // Create a CSV template file
    const csvContent = 'ul_number,description,category,manufacturer,part_number,certification_date,expiry_date,status\\n' +
      'E123456,Sample UL Label,Electronics,Sample Manufacturer,PN-001,2024-01-01,2026-01-01,active';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ul_labels_template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private markFormGroupTouched(formGroup?: FormGroup): void {
    const group = formGroup || this.uploadForm;
    Object.keys(group.controls).forEach(key => {
      const control = group.get(key);
      control?.markAsTouched();
    });
  }

  // Helper methods for validation
  isFieldInvalid(fieldName: string, formGroup?: FormGroup): boolean {
    const group = formGroup || this.uploadForm;
    const field = group.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string, formGroup?: FormGroup): string {
    const group = formGroup || this.uploadForm;
    const field = group.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return `${fieldName.replace('_', ' ')} is required`;
      if (field.errors['pattern']) return `${fieldName.replace('_', ' ')} format is invalid`;
      if (field.errors['minlength']) return `${fieldName.replace('_', ' ')} is too short`;
    }
    return '';
  }

  // Breadcrumb navigation
  breadcrumbItems(): BreadcrumbItem[] {
    return [
      { label: 'Dashboard', link: '/dashboard' },
      { label: 'UL Management', link: '/ul-management' },
      { label: 'Upload UL Labels' }
    ];
  }

  // Navigation methods
  goBack(): void {
    this.router.navigate(['../ul-management'], { relativeTo: this.activatedRoute });
  }
}
