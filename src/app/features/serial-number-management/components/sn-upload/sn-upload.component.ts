import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SerialNumberService } from '../../services/serial-number.service';

interface UploadResult {
  success: boolean;
  message: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors?: string[];
}

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  selector: 'app-sn-upload',
  templateUrl: './sn-upload.component.html',
  styleUrls: ['./sn-upload.component.scss']
})
export class SnUploadComponent {
  @Output() uploadCompleted = new EventEmitter<UploadResult>();

  uploadForm: FormGroup;
  selectedFile: File | null = null;
  isUploading = false;
  uploadResult: UploadResult | null = null;
  dragOver = false;

  acceptedFormats = ['.csv', '.xlsx', '.xls'];
  maxFileSize = 5 * 1024 * 1024; // 5MB

  sampleData = [
    ['serial_number', 'product_model', 'hardware_version', 'firmware_version', 'manufacture_date', 'batch_number'],
    ['EYE2024001001', 'EyeFi Pro X1', '1.2.0', '2.1.4', '2024-01-15', 'BATCH-2024-0115'],
    ['EYE2024001002', 'EyeFi Pro X1', '1.2.0', '2.1.4', '2024-01-15', 'BATCH-2024-0115'],
    ['EYE2024001003', 'EyeFi Standard S2', '1.1.0', '2.0.3', '2024-01-15', 'BATCH-2024-0115']
  ];

  // Range input properties
  inputMethod: 'range' | 'list' = 'range';
  rangePrefix = 'eyefi';
  rangeStart: number | null = null;
  rangeEnd: number | null = null;
  rangePadding = '3';
  individualList = '';
  previewSerialNumbers: string[] = [];

  constructor(
    private fb: FormBuilder,
    private serialNumberService: SerialNumberService
  ) {
    this.uploadForm = this.fb.group({
      file: [null, Validators.required],
      productModel: ['EyeFi Pro X1'],
      batchNumber: [''],
      overwriteExisting: [false],
      validateOnly: [false]
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.selectFile(event.dataTransfer.files[0]);
    }
  }

  selectFile(file: File) {
    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!this.acceptedFormats.includes(fileExtension)) {
      alert(`Invalid file format. Please upload a file with one of these formats: ${this.acceptedFormats.join(', ')}`);
      return;
    }

    // Validate file size
    if (file.size > this.maxFileSize) {
      alert(`File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit.`);
      return;
    }

    this.selectedFile = file;
    this.uploadForm.patchValue({ file: file });
    this.uploadResult = null;
  }

  removeFile() {
    this.selectedFile = null;
    this.uploadForm.patchValue({ file: null });
    this.uploadResult = null;
  }

  uploadFile() {
    if (!this.selectedFile || this.uploadForm.invalid) return;

    this.isUploading = true;
    this.uploadResult = null;

    // Simulate upload process
    this.simulateUpload().then((result) => {
      this.isUploading = false;
      this.uploadResult = result;
      this.uploadCompleted.emit(result);
    }).catch((error) => {
      this.isUploading = false;
      this.uploadResult = {
        success: false,
        message: 'Upload failed: ' + error.message,
        totalRows: 0,
        successCount: 0,
        errorCount: 0
      };
    });
  }

  private async simulateUpload(): Promise<UploadResult> {
    // In a real implementation, you would call:
    // return this.serialNumberService.bulkUploadSerialNumbers(this.selectedFile!).toPromise();
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate processing
        const randomSuccess = Math.random() > 0.2; // 80% success rate
        const totalRows = Math.floor(Math.random() * 100) + 10;
        const errorCount = randomSuccess ? Math.floor(Math.random() * 5) : Math.floor(totalRows * 0.3);
        const successCount = totalRows - errorCount;

        const result: UploadResult = {
          success: randomSuccess,
          message: randomSuccess 
            ? `Successfully processed ${successCount} of ${totalRows} rows.`
            : `Upload completed with errors. ${successCount} successful, ${errorCount} failed.`,
          totalRows,
          successCount,
          errorCount,
          errors: errorCount > 0 ? [
            'Row 5: Duplicate serial number EYE2024001005',
            'Row 12: Invalid product model "Unknown Model"',
            'Row 18: Missing required field: serial_number'
          ].slice(0, errorCount) : undefined
        };

        resolve(result);
      }, 2000); // Simulate 2-second upload
    });
  }

  downloadTemplate() {
    // Create CSV content
    const csvContent = this.sampleData.map(row => row.join(',')).join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'serial-number-template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  resetUpload() {
    this.selectedFile = null;
    this.uploadResult = null;
    this.uploadForm.reset({
      file: null,
      productModel: 'EyeFi Pro X1',
      batchNumber: '',
      overwriteExisting: false,
      validateOnly: false
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'csv':
        return 'fa-file-csv';
      case 'xlsx':
      case 'xls':
        return 'fa-file-excel';
      default:
        return 'fa-file';
    }
  }

  // Validation helpers
  get fileError() {
    const control = this.uploadForm.get('file');
    if (control?.errors && control.touched) {
      if (control.errors['required']) return 'Please select a file to upload';
    }
    return null;
  }

  // Range input methods
  isValidRange(): boolean {
    return !!(this.rangePrefix && 
              this.rangeStart !== null && 
              this.rangeEnd !== null &&
              this.rangeStart > 0 && 
              this.rangeEnd >= this.rangeStart);
  }

  getRangeCount(): number {
    if (!this.isValidRange()) return 0;
    return (this.rangeEnd! - this.rangeStart!) + 1;
  }

  generatePreview(): void {
    if (!this.isValidRange()) return;

    this.previewSerialNumbers = [];
    const padding = parseInt(this.rangePadding);
    
    for (let i = this.rangeStart!; i <= this.rangeEnd!; i++) {
      const paddedNumber = padding > 0 ? i.toString().padStart(padding, '0') : i.toString();
      const separator = this.rangePrefix ? '-' : '';
      this.previewSerialNumbers.push(`${this.rangePrefix}${separator}${paddedNumber}`);
    }
  }

  parseIndividualList(): void {
    if (!this.individualList?.trim()) {
      this.previewSerialNumbers = [];
      return;
    }

    this.previewSerialNumbers = this.individualList
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  addRangeToDatabase(): void {
    if (this.inputMethod === 'range' && !this.isValidRange()) return;
    if (this.inputMethod === 'list' && this.previewSerialNumbers.length === 0) return;

    this.isUploading = true;

    const serialNumbers = this.previewSerialNumbers.map(serial => ({
      serial_number: serial,
      product_model: 'EyeFi Pro X1', // Default model
      status: 'available',
      created_at: new Date().toISOString()
    }));

    // Call the service to create the serial numbers
    this.serialNumberService.createSerialNumbersFromRange({ serialNumbers }).subscribe({
      next: (result) => {
        this.uploadResult = {
          success: true,
          message: `Successfully added ${serialNumbers.length} serial numbers`,
          totalRows: serialNumbers.length,
          successCount: serialNumbers.length,
          errorCount: 0
        };
        this.uploadCompleted.emit(this.uploadResult);
        this.isUploading = false;
        
        // Reset form
        this.resetForm();
      },
      error: (error) => {
        this.uploadResult = {
          success: false,
          message: 'Failed to add serial numbers: ' + (error.message || 'Unknown error'),
          totalRows: serialNumbers.length,
          successCount: 0,
          errorCount: serialNumbers.length,
          errors: [error.message || 'Unknown error']
        };
        this.isUploading = false;
      }
    });
  }

  resetForm(): void {
    this.rangePrefix = 'eyefi';
    this.rangeStart = null;
    this.rangeEnd = null;
    this.rangePadding = '3';
    this.individualList = '';
    this.previewSerialNumbers = [];
    this.uploadResult = null;
  }
}