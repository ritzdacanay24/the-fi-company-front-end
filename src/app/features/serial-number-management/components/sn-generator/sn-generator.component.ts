import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'app-sn-generator',
  templateUrl: './sn-generator.component.html',
  styleUrls: ['./sn-generator.component.scss']
})
export class SnGeneratorComponent {
  @Output() serialNumbersGenerated = new EventEmitter<any>();
  @Output() manualSerialNumberAdded = new EventEmitter<{serialNumber: string, productModel: string}>();

  generateForm: FormGroup;
  addForm: FormGroup;
  showAddForm = false;
  isGenerating = false;

  productModels = [
    'EyeFi Pro X1',
    'EyeFi Standard S2', 
    'EyeFi Enterprise E3',
    'EyeFi Lite L1',
    'EyeFi Advanced A2'
  ];

  constructor(private fb: FormBuilder) {
    this.generateForm = this.fb.group({
      prefix: ['EYE', [Validators.required, Validators.pattern(/^[A-Z]{2,4}$/)]],
      startNumber: [1, [Validators.required, Validators.min(1)]],
      quantity: [10, [Validators.required, Validators.min(1), Validators.max(1000)]],
      productModel: ['EyeFi Pro X1', Validators.required],
      batchNumber: ['', Validators.pattern(/^[A-Z0-9-]{0,20}$/)],
      manufactureDate: [new Date().toISOString().split('T')[0], Validators.required]
    });

    this.addForm = this.fb.group({
      serialNumber: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]{8,15}$/)]],
      productModel: ['EyeFi Pro X1', Validators.required],
      hardwareVersion: [''],
      firmwareVersion: [''],
      manufactureDate: [new Date().toISOString().split('T')[0]],
      batchNumber: ['']
    });
  }

  generateSerialNumbers() {
    if (this.generateForm.valid && !this.isGenerating) {
      this.isGenerating = true;
      const formValue = this.generateForm.value;
      
      // Simulate API call delay
      setTimeout(() => {
        this.serialNumbersGenerated.emit({
          type: 'batch',
          data: formValue
        });
        this.isGenerating = false;
      }, 2000);
    }
  }

  generateQuickBatch(count: number) {
    if (!this.isGenerating) {
      this.isGenerating = true;
      
      // Use default values for quick generation
      const batchData = {
        prefix: 'EYE',
        startNumber: this.getNextSequentialNumber(),
        quantity: count,
        productModel: 'EyeFi Pro X1',
        manufactureDate: new Date().toISOString().split('T')[0],
        batchNumber: this.generateBatchNumber()
      };
      
      setTimeout(() => {
        this.serialNumbersGenerated.emit({
          type: 'quick',
          data: batchData
        });
        this.isGenerating = false;
      }, 1500);
    }
  }

  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm) {
      this.addForm.reset();
      this.addForm.patchValue({
        productModel: 'EyeFi Pro X1',
        manufactureDate: new Date().toISOString().split('T')[0]
      });
    }
  }

  addManualSerialNumber() {
    if (this.addForm.valid) {
      const formValue = this.addForm.value;
      this.manualSerialNumberAdded.emit({
        serialNumber: formValue.serialNumber,
        productModel: formValue.productModel,
        ...formValue
      });
      this.addForm.reset();
      this.showAddForm = false;
    }
  }

  private getNextSequentialNumber(): number {
    // This would typically come from the backend
    // For now, return a reasonable default
    const currentYear = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    return parseInt(`${currentYear}${month}001`);
  }

  private generateBatchNumber(): string {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    return `BATCH-${year}-${month}${day}`;
  }

  // Validation helpers
  get prefixError() {
    const control = this.generateForm.get('prefix');
    if (control?.errors && control.touched) {
      if (control.errors['required']) return 'Prefix is required';
      if (control.errors['pattern']) return 'Prefix must be 2-4 uppercase letters';
    }
    return null;
  }

  get quantityError() {
    const control = this.generateForm.get('quantity');
    if (control?.errors && control.touched) {
      if (control.errors['required']) return 'Quantity is required';
      if (control.errors['min']) return 'Minimum quantity is 1';
      if (control.errors['max']) return 'Maximum quantity is 1000';
    }
    return null;
  }

  get serialNumberError() {
    const control = this.addForm.get('serialNumber');
    if (control?.errors && control.touched) {
      if (control.errors['required']) return 'Serial number is required';
      if (control.errors['pattern']) return 'Serial number must be 8-15 alphanumeric characters';
    }
    return null;
  }
}