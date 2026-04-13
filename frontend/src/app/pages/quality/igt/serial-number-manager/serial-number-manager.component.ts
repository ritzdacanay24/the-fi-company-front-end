import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '@app/shared/shared.module';
import { SerialNumberService } from '../services/serial-number.service';
import { Location } from '@angular/common';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-serial-number-manager',
  templateUrl: './serial-number-manager.component.html',
  styleUrls: ['./serial-number-manager.component.scss']
})
export class SerialNumberManagerComponent implements OnInit {
  isGenerating = false;
  isLoadingStats = false;

  // Statistics
  statistics: any = null;

  // Range generation form
  rangeForm: FormGroup;
  
  // Preview handling
  showAllPreview = false;
  rangeValidation: any = null;
  
  // Navigation and old modal behavior
  showRangeGenerator = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private toastrService: ToastrService,
    private serialNumberService: SerialNumberService,
    private location: Location
  ) {
    this.rangeForm = this.fb.group({
      prefix: ['Z'],
      startNumber: [1, [Validators.required, Validators.min(0)]],
      endNumber: [100, [Validators.required, Validators.min(0)]],
      count: [100, [Validators.required, Validators.min(1), Validators.max(10000)]], // For old template compatibility
      padding: [4],
      duplicateStrategy: ['skip'],
      category: ['gaming', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadStatistics();
    this.onRangeFormChange(); // Initialize preview
  }

  async loadStatistics(): Promise<void> {
    try {
      this.isLoadingStats = true;
      this.statistics = await this.serialNumberService.getUsageStatistics();
    } catch (error) {
      console.error('Error loading statistics:', error);
      this.toastrService.error('Failed to load statistics');
    } finally {
      this.isLoadingStats = false;
    }
  }

  goBack(): void {
    this.location.back();
  }

  onRangeFormChange(): void {
    if (this.rangeForm.valid) {
      this.validateRange();
    }
  }

  async validateRange(): Promise<void> {
    const preview = this.getPreviewRange();
    if (preview.length === 0) {
      this.rangeValidation = null;
      return;
    }

    try {
      // For now, just create a basic validation structure
      // This would be enhanced with actual service call when available
      this.rangeValidation = {
        newSerials: preview,
        activeDuplicates: [],
        softDeletedDuplicates: []
      };
    } catch (error) {
      console.error('Error validating range:', error);
      this.rangeValidation = null;
    }
  }

  getPreviewRange(): string[] {
    const formValue = this.rangeForm.value;
    if (!formValue.startNumber || !formValue.endNumber || formValue.startNumber > formValue.endNumber) {
      return [];
    }

    const prefix = formValue.prefix || '';
    const startNum = parseInt(formValue.startNumber);
    const endNum = parseInt(formValue.endNumber);
    const padding = parseInt(formValue.padding) || 0;
    
    const serials: string[] = [];
    for (let i = startNum; i <= endNum; i++) {
      const paddedNum = padding > 0 ? i.toString().padStart(padding, '0') : i.toString();
      serials.push(prefix + paddedNum);
    }
    
    return serials;
  }

  getDisplayPreviewRangeWithStatus(): Array<{serial: string}> {
    const range = this.getPreviewRange();
    const displayRange = this.showAllPreview ? range : range.slice(0, 10);
    return displayRange.map(serial => ({ serial }));
  }

  getRemainingPreviewCount(): number {
    const range = this.getPreviewRange();
    return Math.max(0, range.length - 10);
  }

  togglePreviewDisplay(): void {
    this.showAllPreview = !this.showAllPreview;
  }

  getSerialDuplicateStatus(serial: string): { color: string; icon: string } {
    if (!this.rangeValidation) {
      return { color: 'bg-secondary', icon: 'mdi-help' };
    }

    if (this.rangeValidation.activeDuplicates?.includes(serial)) {
      return { color: 'bg-danger', icon: 'mdi-close-circle' };
    }
    if (this.rangeValidation.softDeletedDuplicates?.includes(serial)) {
      return { color: 'bg-warning', icon: 'mdi-alert-circle-outline' };
    }
    return { color: 'bg-success', icon: 'mdi-check-circle' };
  }

  getSerialStatusDescription(serial: string): string {
    if (!this.rangeValidation) {
      return 'Checking...';
    }

    if (this.rangeValidation.activeDuplicates?.includes(serial)) {
      return 'Already exists (active)';
    }
    if (this.rangeValidation.softDeletedDuplicates?.includes(serial)) {
      return 'Previously deleted';
    }
    return 'Available for creation';
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
      const endNum = parseInt(formValue.endNumber);
      const padding = parseInt(formValue.padding) || 0;
      
      for (let i = startNum; i <= endNum; i++) {
        const paddedNum = padding > 0 ? i.toString().padStart(padding, '0') : i.toString();
        serialNumbers.push({
          serial_number: prefix + paddedNum,
          category: formValue.category
        });
      }

      // Upload the generated range using the simple bulk upload API
      const result = await this.serialNumberService.bulkUpload(serialNumbers);

      this.toastrService.success(`Successfully generated ${serialNumbers.length} serial numbers`);
      
      // Reset form
      this.rangeForm.reset({
        prefix: 'Z',
        startNumber: 1,
        endNumber: 100,
        padding: 4,
        duplicateStrategy: 'skip',
        category: 'gaming'
      });
      
      // Reload statistics
      this.loadStatistics();

    } catch (error) {
      console.error('Error generating range:', error);
      this.toastrService.error('Failed to generate serial number range');
    } finally {
      this.isGenerating = false;
    }
  }

  // Method for the old template structure that still exists
  navigateToUpload(): void {
    this.router.navigate(['../serial-upload'], { relativeTo: this.activatedRoute });
  }

  // Method for old template preview (count-based instead of range-based)
  getPreviewSerials(): string[] {
    const formValue = this.rangeForm.value;
    if (!formValue.startNumber) {
      return [];
    }

    const prefix = formValue.prefix || '';
    const startNum = parseInt(formValue.startNumber);
    const count = formValue.count || 0;
    const padding = parseInt(formValue.padding) || 0;
    
    const previews: string[] = [];
    for (let i = 0; i < Math.min(3, count); i++) {
      const num = startNum + i;
      const paddedNum = padding > 0 ? num.toString().padStart(padding, '0') : num.toString();
      previews.push(prefix + paddedNum);
    }
    
    return previews;
  }
}
