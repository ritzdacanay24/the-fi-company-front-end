import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { AuthenticationService } from '@app/core/services/auth.service';

export interface ULLabel {
  id: number;
  ul_number: string;
  prefix?: string;
  numeric_part: number;
  description?: string;
  category?: string;
  status: 'available' | 'used';
  dateCreated: Date;
  dateUsed?: Date;
}

export interface UsageFormData {
  serial_number: string;
  quantity: number;
  date_used: string;
  user_signature: string;
  customer: string;
}

@Component({
  selector: 'app-record-usage-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './record-usage-form.component.html',
  styleUrls: ['./record-usage-form.component.scss']
})
export class RecordUsageFormComponent implements OnInit, OnChanges {
  @Input() selectedUL: ULLabel | null = null;
  @Output() usageSubmitted = new EventEmitter<UsageFormData>();
  @Output() cancelled = new EventEmitter<void>();

  usageForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authenticationService: AuthenticationService
  ) {
    this.usageForm = this.createForm();
  }

  ngOnInit(): void {
    this.prefillFormWithUserData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedUL'] && this.selectedUL) {
      this.prefillFormWithUserData();
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      serial_number: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9]+$/)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      date_used: [new Date().toISOString().substring(0, 10), Validators.required],
      user_signature: ['', [Validators.required, Validators.minLength(2)]],
      customer: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  private prefillFormWithUserData(): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      this.usageForm.patchValue({
        user_signature: currentUser.full_name || currentUser.first_name + ' ' + currentUser.last_name || '',
        customer: this.getDefaultCustomer()
      });
    }
  }

  private getCurrentUser(): any {
    return this.authenticationService.currentUserValue;
  }

  private getDefaultCustomer(): string {
    // You can customize this logic based on your business rules
    const user = this.getCurrentUser();
    return user?.default_customer || user?.company || '';
  }

  getCurrentUserDisplayName(): string {
    const user = this.getCurrentUser();
    return user?.full_name || 
           (user?.first_name + ' ' + user?.last_name) || 
           user?.username || 
           'Unknown User';
  }

  getCurrentUserEmail(): string {
    const user = this.getCurrentUser();
    return user?.email || '';
  }

  onSubmit(): void {
    if (this.usageForm.valid && this.selectedUL) {
      const formData: UsageFormData = this.usageForm.value;
      this.usageSubmitted.emit(formData);
      
      // Reset form after successful submission
      this.usageForm.reset();
      this.prefillFormWithUserData();
    }
  }

  onCancel(): void {
    this.cancelled.emit();
    this.usageForm.reset();
    this.prefillFormWithUserData();
  }

  // Helper method to get form control error messages
  getFieldError(fieldName: string): string | null {
    const field = this.usageForm.get(fieldName);
    if (field && field.invalid && field.touched) {
      if (field.errors?.['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors?.['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors?.['pattern']) {
        return `${this.getFieldLabel(fieldName)} contains invalid characters`;
      }
      if (field.errors?.['min']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['min'].min}`;
      }
    }
    return null;
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'serial_number': 'Serial Number',
      'quantity': 'Quantity',
      'date_used': 'Date Used',
      'user_signature': 'User Signature',
      'customer': 'Customer'
    };
    return labels[fieldName] || fieldName;
  }

  // Helper method to check if field has error
  hasFieldError(fieldName: string): boolean {
    const field = this.usageForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }
}
