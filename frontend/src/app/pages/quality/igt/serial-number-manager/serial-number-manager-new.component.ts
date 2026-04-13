import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '@app/shared/shared.module';
import { SerialNumberService } from '../services/serial-number.service';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-serial-number-manager',
  templateUrl: './serial-number-manager.component.html',
  styleUrls: ['./serial-number-manager.component.scss']
})
export class SerialNumberManagerComponent implements OnInit {
  showRangeGenerator = false;
  isGenerating = false;
  isLoadingStats = false;

  // Alert management
  showSuccessAlert = false;
  showErrorAlert = false;
  successMessage = '';
  errorMessage = '';

  // Statistics
  statistics: any = null;

  // Range generation form
  rangeForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private toastrService: ToastrService,
    private serialNumberService: SerialNumberService
  ) {
    this.rangeForm = this.fb.group({
      prefix: [''],
      category: ['gaming', Validators.required],
      startNumber: [1, [Validators.required, Validators.min(1)]],
      count: [100, [Validators.required, Validators.min(1), Validators.max(10000)]],
      padding: [4]
    });
  }

  ngOnInit(): void {
    this.loadStatistics();
  }

  async loadStatistics(): Promise<void> {
    try {
      this.isLoadingStats = true;
      this.statistics = await this.serialNumberService.getUsageStatistics();
    } catch (error) {
      console.error('Error loading statistics:', error);
      this.showError('Failed to load statistics');
    } finally {
      this.isLoadingStats = false;
    }
  }

  navigateToUpload(): void {
    this.router.navigate(['../serial-upload'], { relativeTo: this.activatedRoute });
  }

  getPreviewSerials(): string[] {
    const formValue = this.rangeForm.value;
    if (!formValue.startNumber || !formValue.count) {
      return [];
    }

    const prefix = formValue.prefix || '';
    const startNum = parseInt(formValue.startNumber);
    const padding = parseInt(formValue.padding) || 0;
    
    const previews: string[] = [];
    for (let i = 0; i < Math.min(3, formValue.count); i++) {
      const num = startNum + i;
      const paddedNum = padding > 0 ? num.toString().padStart(padding, '0') : num.toString();
      previews.push(prefix + paddedNum);
    }
    
    return previews;
  }

  async generateRange(): Promise<void> {
    if (!this.rangeForm.valid) return;

    try {
      this.isGenerating = true;
      const formValue = this.rangeForm.value;
      
      // Generate serial numbers array
      const serialNumbers: { serial_number: string; category: string }[] = [];
      const prefix = formValue.prefix || '';
      const startNum = parseInt(formValue.startNumber);
      const count = parseInt(formValue.count);
      const padding = parseInt(formValue.padding) || 0;
      
      for (let i = 0; i < count; i++) {
        const num = startNum + i;
        const paddedNum = padding > 0 ? num.toString().padStart(padding, '0') : num.toString();
        serialNumbers.push({
          serial_number: prefix + paddedNum,
          category: formValue.category
        });
      }

      // Upload the generated range
      const result = await this.serialNumberService.bulkUploadWithOptions({
        serialNumbers,
        duplicateStrategy: 'skip', // Skip duplicates for range generation
        category: formValue.category
      });

      this.showSuccess(`Successfully generated ${result.created} serial numbers`);
      this.showRangeGenerator = false;
      this.rangeForm.reset({
        prefix: '',
        category: 'gaming',
        startNumber: 1,
        count: 100,
        padding: 4
      });
      
      // Reload statistics
      this.loadStatistics();

    } catch (error) {
      console.error('Error generating range:', error);
      this.showError('Failed to generate serial number range');
    } finally {
      this.isGenerating = false;
    }
  }

  showSuccess(message: string): void {
    this.successMessage = message;
    this.showSuccessAlert = true;
    this.showErrorAlert = false;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.hideSuccessAlert();
    }, 5000);
  }

  showError(message: string): void {
    this.errorMessage = message;
    this.showErrorAlert = true;
    this.showSuccessAlert = false;
    
    // Auto-hide after 8 seconds
    setTimeout(() => {
      this.hideErrorAlert();
    }, 8000);
  }

  hideSuccessAlert(): void {
    this.showSuccessAlert = false;
  }

  hideErrorAlert(): void {
    this.showErrorAlert = false;
  }
}
