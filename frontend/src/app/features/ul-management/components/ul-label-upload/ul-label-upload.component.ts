import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '@app/shared/shared.module';
import { ULLabelService } from '../../services/ul-label.service';
import { ULLabel } from '../../models/ul-label.model';
import { BreadcrumbComponent, BreadcrumbItem } from "@app/shared/components/breadcrumb/breadcrumb.component";
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

interface RangePreviewRow {
  ul_number: string;
  status: 'valid' | 'duplicate' | 'error';
}

interface RangeValidationSummary {
  valid: number;
  duplicates: number;
  errors: number;
  total: number;
}

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
  private readonly maxRangeSize = 1000;
  rangePreviewRows: RangePreviewRow[] = [];
  rangeValidationSummary: RangeValidationSummary | null = null;
  rangeValidationError = '';

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
      description: ['UL certified product', [Validators.required, Validators.minLength(5)]],
      category: ['New', Validators.required],
      manufacturer: [''],
      status: ['active', Validators.required]
    });
  }

  ngOnInit(): void {
    this.rangeForm.valueChanges.subscribe(() => {
      this.refreshRangePreview();
    });
    this.refreshRangePreview();
  }

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

      this.ulLabelService.createLabel(ulLabel).subscribe({
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
      if (totalNumbers > this.maxRangeSize) {
        this.toastr.error(`Range too large. Maximum ${this.maxRangeSize} UL numbers per upload.`);
        return;
      }

      if (!this.canSubmitRangeUpload()) {
        this.toastr.error('Fix duplicate or invalid UL numbers before upload.');
        return;
      }

      this.isLoading = true;
      this.uploadProgress = 0;

      // Use the new range upload method
      this.ulLabelService.createLabelsFromRange(formData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.toastr.success(`Successfully uploaded ${response.data.uploaded_count} UL numbers from range!`);
            if (response.data.errors && response.data.errors.length > 0) {
              this.toastr.warning(`${response.data.errors.length} numbers already existed and were skipped`);
            }
            this.rangeForm.reset();
            this.rangeForm.patchValue({ status: 'active', description: 'UL certified product', category: 'New' });
            this.rangePreviewRows = [];
            this.rangeValidationSummary = null;
            this.rangeValidationError = '';
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

  getRangeCount(): number {
    return this.rangePreviewRows.length;
  }

  canSubmitRangeUpload(): boolean {
    if (!this.rangeForm.valid || !this.rangeValidationSummary) {
      return false;
    }

    return this.rangeValidationSummary.valid > 0
      && this.rangeValidationSummary.duplicates === 0
      && this.rangeValidationSummary.errors === 0;
  }

  onBulkUpload(): void {
    if (!this.selectedFile) {
      this.toastr.error('Please select a file first');
      return;
    }

    this.isLoading = true;
    this.uploadProgress = 0;

    this.ulLabelService.uploadLabelsFile(this.selectedFile).subscribe({
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

  private async refreshRangePreview(): Promise<void> {
    const numbers = this.generateUlNumbersFromRange();

    if (numbers.length === 0) {
      this.rangePreviewRows = [];
      this.rangeValidationSummary = null;
      this.rangeValidationError = '';
      return;
    }

    this.rangePreviewRows = numbers.map((ulNumber) => ({
      ul_number: ulNumber,
      status: 'valid',
    }));

    await this.validateRangePreview();
  }

  private generateUlNumbersFromRange(): string[] {
    const formData = this.rangeForm.value;
    const startNum = Number(formData.start_number);
    const endNum = Number(formData.end_number);

    if (!Number.isFinite(startNum) || !Number.isFinite(endNum) || startNum <= 0 || endNum <= 0 || startNum > endNum) {
      return [];
    }

    const total = endNum - startNum + 1;
    if (total > this.maxRangeSize) {
      return [];
    }

    const categoryPrefix = this.getCategoryPrefix(formData.category);
    const numbers: string[] = [];
    for (let i = startNum; i <= endNum; i += 1) {
      numbers.push(`${categoryPrefix}${i}`);
    }

    return numbers;
  }

  private getCategoryPrefix(category: unknown): 'Q' | 'T' {
    return String(category || '').trim().toLowerCase() === 'used' ? 'T' : 'Q';
  }

  private async validateRangePreview(): Promise<void> {
    const rows = this.rangePreviewRows;
    if (rows.length === 0) {
      this.rangeValidationSummary = null;
      return;
    }

    try {
      const response = await firstValueFrom(this.ulLabelService.checkExistingUlNumbers(rows.map((r) => r.ul_number)));
      const existingNumbers = Array.isArray(response?.data) ? response.data : [];
      const existingSet = new Set(existingNumbers.map((num: unknown) => String(num || '').trim()));

      let valid = 0;
      let duplicates = 0;
      let errors = 0;

      this.rangePreviewRows = rows.map((row) => {
        if (!row.ul_number || row.ul_number.length < 2) {
          errors += 1;
          return { ...row, status: 'error' };
        }

        if (existingSet.has(row.ul_number)) {
          duplicates += 1;
          return { ...row, status: 'duplicate' };
        }

        valid += 1;
        return { ...row, status: 'valid' };
      });

      this.rangeValidationSummary = {
        valid,
        duplicates,
        errors,
        total: rows.length,
      };
      this.rangeValidationError = '';
    } catch (error) {
      this.rangeValidationError = 'Unable to validate duplicates right now. Please try again.';
      this.rangeValidationSummary = null;
      console.error('UL range validation error:', error);
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'valid':
        return 'bg-success';
      case 'duplicate':
        return 'bg-warning';
      case 'error':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'valid':
        return 'mdi mdi-check-circle';
      case 'duplicate':
        return 'mdi mdi-alert-circle';
      case 'error':
        return 'mdi mdi-close-circle';
      default:
        return 'mdi mdi-help-circle';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'valid':
        return 'Valid';
      case 'duplicate':
        return 'Duplicate';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
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
    this.router.navigate(['../labels-report'], { relativeTo: this.activatedRoute });
  }
}
