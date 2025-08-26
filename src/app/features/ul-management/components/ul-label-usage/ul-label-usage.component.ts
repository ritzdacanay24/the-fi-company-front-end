import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { ULLabelService } from '../../services/ul-label.service';
import { ULLabel, ULLabelUsage } from '../../models/ul-label.model';
import { Observable, of } from 'rxjs';
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AgGridModule } from 'ag-grid-angular';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule, NgSelectModule],
  selector: 'app-ul-label-usage',
  templateUrl: './ul-label-usage.component.html',
  styleUrls: ['./ul-label-usage.component.scss']
})
export class ULLabelUsageComponent implements OnInit {
  usageForm: FormGroup;
  isLoading = false;
  selectedULLabel: ULLabel | null = null;
  ulNumbers: string[] = [];
  
  // Properties for ng-select
  availableULNumbers: ULLabel[] = [];
  isLoadingULNumbers = false;

  constructor(
    private fb: FormBuilder,
    private ulLabelService: ULLabelService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.usageForm = this.fb.group({
      ul_number: ['', Validators.required],
      eyefi_serial_number: ['', [Validators.required, Validators.minLength(3)]],
      quantity_used: [1, [Validators.required, Validators.min(1)]],
      date_used: [new Date().toISOString().substring(0, 10), Validators.required],
      user_signature: ['', [Validators.required, Validators.minLength(2)]],
      user_name: ['', [Validators.required, Validators.minLength(2)]],
      customer_name: ['', [Validators.required, Validators.minLength(2)]],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadULNumbers();
    
    // Check if UL number was passed via route
    const ulNumber = this.route.snapshot.paramMap.get('ulNumber');
    if (ulNumber) {
      this.usageForm.patchValue({ ul_number: ulNumber });
      this.onULNumberSelected(ulNumber);
    }
  }

  loadULNumbers(): void {
    this.ulLabelService.getULNumbers().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.ulNumbers = response.data;
        } else {
          this.ulNumbers = [];
          this.toastr.warning('No UL numbers available');
        }
      },
      error: (error) => {
        console.error('Error loading UL numbers:', error);
        this.ulNumbers = [];
        this.toastr.error('Error loading UL numbers');
      }
    });
  }

  // Bootstrap typeahead search function
  searchULNumbers = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 2 ? []
        : this.ulNumbers.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
    );

  // Formatter for the input field
  ulNumberFormatter = (ulNumber: string) => ulNumber;

  // Handle typeahead selection
  onULNumberSelected(ulNumber: string): void {
    if (ulNumber && ulNumber.length > 2) {
      // Update the form control value first
      this.usageForm.patchValue({ ul_number: ulNumber });
      
      this.ulLabelService.validateULNumber(ulNumber).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.selectedULLabel = response.data;
            this.toastr.success(`UL Label found: ${this.selectedULLabel.description}`);
          } else {
            this.selectedULLabel = null;
            this.toastr.warning('UL Number not found in database');
          }
        },
        error: (error) => {
          console.error('Validation error:', error);
          this.selectedULLabel = null;
          this.toastr.error('Error validating UL Number');
        }
      });
    } else {
      this.selectedULLabel = null;
    }
  }

  // Handle blur event for manual entry
  onULNumberBlur(value: string): void {
    if (value && value !== this.usageForm.get('ul_number')?.value) {
      this.usageForm.patchValue({ ul_number: value });
      this.onULNumberSelected(value);
    }
  }

  onSubmit(): void {
    if (this.usageForm.valid) {
      if (!this.selectedULLabel) {
        this.toastr.error('Please select a valid UL Number');
        return;
      }

      this.isLoading = true;
      const usageData: ULLabelUsage = {
        ...this.usageForm.value,
        ul_label_id: this.selectedULLabel.id
      };
      
      this.ulLabelService.recordULLabelUsage(usageData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.toastr.success('UL Label usage recorded successfully!');
            this.resetForm();
          } else {
            this.toastr.error(response.message || 'Failed to record usage');
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Usage recording error:', error);
          this.toastr.error('Error recording UL Label usage');
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  resetForm(): void {
    this.usageForm.reset();
    this.usageForm.patchValue({
      quantity_used: 1,
      date_used: new Date().toISOString().substring(0, 10)
    });
    this.selectedULLabel = null;
  }

  generateSignature(): void {
    // Simple signature generation based on user name and timestamp
    const userName = this.usageForm.get('user_name')?.value;
    if (userName) {
      const timestamp = new Date().getTime().toString().slice(-6);
      const signature = `${userName.replace(/\s/g, '').toUpperCase()}-${timestamp}`;
      this.usageForm.patchValue({ user_signature: signature });
      this.toastr.info('Signature generated');
    } else {
      this.toastr.warning('Please enter user name first');
    }
  }

  navigateToReport(): void {
    this.router.navigate(['../usage-report'], { relativeTo: this.route });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.usageForm.controls).forEach(key => {
      const control = this.usageForm.get(key);
      control?.markAsTouched();
    });
  }

  // Helper methods for validation
  isFieldInvalid(fieldName: string): boolean {
    const field = this.usageForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.usageForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return `${fieldName.replace('_', ' ')} is required`;
      if (field.errors['minlength']) return `${fieldName.replace('_', ' ')} is too short`;
      if (field.errors['min']) return `${fieldName.replace('_', ' ')} must be at least ${field.errors['min'].min}`;
    }
    return '';
  }

  // Debug method to check form validity
  getInvalidFields(): string[] {
    const invalidFields: string[] = [];
    Object.keys(this.usageForm.controls).forEach(key => {
      const control = this.usageForm.get(key);
      if (control && control.invalid) {
        invalidFields.push(key);
      }
    });
    return invalidFields;
  }

  // Quick fill methods for common scenarios
  quickFillProduction(): void {
    this.usageForm.patchValue({
      user_name: 'Production Team',
      customer_name: 'Standard Production'
    });
  }

  quickFillTesting(): void {
    this.usageForm.patchValue({
      user_name: 'Quality Assurance',
      customer_name: 'Internal Testing'
    });
  }

  quickFillCustomer(): void {
    this.usageForm.patchValue({
      user_name: 'Customer Service',
      customer_name: 'Customer Order'
    });
  }
}
