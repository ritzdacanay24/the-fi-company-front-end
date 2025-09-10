import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '@app/shared/shared.module';
import { SerialNumberService } from '../services/serial-number.service';

interface UploadValidationSummary {
  valid: number;
  duplicates: number;
  errors: number;
  total: number;
}

interface CSVPreviewRow {
  serial_number: string;
  category: string;
  status: 'valid' | 'duplicate' | 'error';
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-serial-number-upload',
  templateUrl: './serial-number-upload.component.html',
  styleUrls: ['./serial-number-upload.component.scss']
})
export class SerialNumberUploadComponent implements OnInit {
  selectedUploadMethod: 'csv' | 'manual' = 'csv';
  defaultCategory = 'gaming';
  manualCategory = 'gaming';
  duplicateStrategy: 'skip' | 'replace' | 'error' = 'skip';
  
  // CSV Upload
  selectedFile: File | null = null;
  csvPreview: CSVPreviewRow[] = [];
  
  // Manual Entry
  manualSerialNumbers = '';
  manualPreview: string[] = [];
  
  // Validation
  validationSummary: UploadValidationSummary | null = null;
  
  // Loading states
  isUploading = false;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private toastrService: ToastrService,
    private serialNumberService: SerialNumberService
  ) {}

  ngOnInit(): void {
    // Initialize component
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.activatedRoute });
  }

  onUploadMethodChange(): void {
    // Clear previous data when switching methods
    this.csvPreview = [];
    this.manualPreview = [];
    this.validationSummary = null;
    this.selectedFile = null;
    this.manualSerialNumbers = '';
  }

  onFileSelect(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      this.selectedFile = file;
      this.parseCSV(file);
    } else {
      this.toastrService.error('Please select a valid CSV file', 'Invalid File');
    }
  }

  private parseCSV(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      this.processCsvText(csvText);
    };
    reader.readAsText(file);
  }

  private processCsvText(csvText: string): void {
    const lines = csvText.split('\n').filter(line => line.trim());
    const preview: CSVPreviewRow[] = [];
    
    // Skip header if it exists
    const startIndex = this.isHeaderRow(lines[0]) ? 1 : 0;
    
    for (let i = startIndex; i < Math.min(lines.length, startIndex + 50); i++) {
      const columns = lines[i].split(',').map(col => col.trim().replace(/"/g, ''));
      if (columns[0]) {
        preview.push({
          serial_number: columns[0],
          category: columns[1] || this.defaultCategory,
          status: 'valid' // Will be validated against existing serials
        });
      }
    }
    
    this.csvPreview = preview;
    this.validateSerialNumbers();
  }

  private isHeaderRow(line: string): boolean {
    const firstCell = line.split(',')[0].toLowerCase().trim();
    return firstCell.includes('serial') || firstCell.includes('number') || firstCell === 'sn';
  }

  onManualEntryChange(): void {
    if (!this.manualSerialNumbers.trim()) {
      this.manualPreview = [];
      this.validationSummary = null;
      return;
    }

    // Parse manual entry - support both line breaks and commas
    const serials = this.manualSerialNumbers
      .split(/[\n,]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    this.manualPreview = serials.slice(0, 50); // Show first 50 for preview
    this.validateSerialNumbers();
  }

  private async validateSerialNumbers(): Promise<void> {
    try {
      let serialsToValidate: string[] = [];
      
      if (this.selectedUploadMethod === 'csv') {
        serialsToValidate = this.csvPreview.map(row => row.serial_number);
      } else {
        serialsToValidate = this.manualPreview;
      }

      if (serialsToValidate.length === 0) {
        this.validationSummary = null;
        return;
      }

      // Call validation service (you'll need to implement this in your service)
      const existingSerials = await this.serialNumberService.checkExistingSerials(serialsToValidate);
      
      let valid = 0;
      let duplicates = 0;
      let errors = 0;

      serialsToValidate.forEach(serial => {
        if (!serial || serial.length < 2) {
          errors++;
        } else if (existingSerials.includes(serial)) {
          duplicates++;
        } else {
          valid++;
        }
      });

      this.validationSummary = {
        valid,
        duplicates,
        errors,
        total: serialsToValidate.length
      };

      // Update CSV preview with validation results
      if (this.selectedUploadMethod === 'csv') {
        this.csvPreview.forEach(row => {
          if (!row.serial_number || row.serial_number.length < 2) {
            row.status = 'error';
          } else if (existingSerials.includes(row.serial_number)) {
            row.status = 'duplicate';
          } else {
            row.status = 'valid';
          }
        });
      }

    } catch (error) {
      console.error('Error validating serial numbers:', error);
      this.toastrService.error('Error validating serial numbers', 'Validation Error');
    }
  }

  canUpload(): boolean {
    if (!this.validationSummary) return false;
    
    if (this.duplicateStrategy === 'error' && this.validationSummary.duplicates > 0) {
      return false;
    }
    
    return this.validationSummary.valid > 0 || 
           (this.duplicateStrategy !== 'error' && this.validationSummary.duplicates > 0);
  }

  async uploadSerialNumbers(): Promise<void> {
    if (!this.canUpload()) return;

    try {
      this.isUploading = true;
      
      let serialNumbers: { serial_number: string; category: string }[] = [];
      
      if (this.selectedUploadMethod === 'csv') {
        serialNumbers = this.csvPreview.map(row => ({
          serial_number: row.serial_number,
          category: row.category
        }));
      } else {
        const serials = this.manualSerialNumbers
          .split(/[\n,]/)
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        serialNumbers = serials.map(serial => ({
          serial_number: serial,
          category: this.manualCategory
        }));
      }

      const result = await this.serialNumberService.bulkUploadWithOptions({
        serialNumbers,
        duplicateStrategy: this.duplicateStrategy,
        category: this.selectedUploadMethod === 'csv' ? this.defaultCategory : this.manualCategory
      });

      this.toastrService.success(
        `Successfully uploaded ${result.created} serial numbers`,
        'Upload Complete'
      );

      // Navigate back to manager
      this.goBack();

    } catch (error) {
      console.error('Error uploading serial numbers:', error);
      this.toastrService.error('Failed to upload serial numbers', 'Upload Error');
    } finally {
      this.isUploading = false;
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'valid': return 'bg-success';
      case 'duplicate': return 'bg-warning';
      case 'error': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'valid': return 'mdi mdi-check-circle';
      case 'duplicate': return 'mdi mdi-alert-circle';
      case 'error': return 'mdi mdi-close-circle';
      default: return 'mdi mdi-help-circle';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'valid': return 'Valid';
      case 'duplicate': return 'Duplicate';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  }
}
