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

interface PreviewRow {
  serial_number: string;
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
  private readonly fixedCategory = 'gaming';
  rangeStart = '';
  rangeEnd = '';
  rangeError = '';
  private readonly maxRangeSize = 5000;

  // Manual Entry
  manualSerialNumbers = '';
  manualPreview: PreviewRow[] = [];

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

  trackBySerial(_index: number, row: PreviewRow): string {
    return row.serial_number;
  }

  onRangeChange(): void {
    this.rangeError = '';
    const start = this.rangeStart.trim();
    const end = this.rangeEnd.trim();

    if (!start || !end) {
      this.manualPreview = [];
      this.validationSummary = null;
      return;
    }

    const generated = this.generateSerialRange(start, end);
    if (!generated) {
      this.manualPreview = [];
      this.validationSummary = null;
      return;
    }

    this.manualSerialNumbers = generated.join('\n');
    this.manualPreview = generated.map(serial => ({ serial_number: serial, status: 'valid' as const }));
    this.validateSerialNumbers();
  }

  private generateSerialRange(start: string, end: string): string[] | null {
    const pattern = /^([a-zA-Z_-]*)(\d+)$/;
    const startMatch = start.match(pattern);
    const endMatch = end.match(pattern);

    if (!startMatch || !endMatch) {
      this.rangeError = 'Use serials like z8301 to z8400 (same prefix + numeric suffix).';
      return null;
    }

    const startPrefix = startMatch[1];
    const endPrefix = endMatch[1];
    if (startPrefix.toLowerCase() !== endPrefix.toLowerCase()) {
      this.rangeError = 'Start and end serials must have the same prefix.';
      return null;
    }

    const startNumber = Number(startMatch[2]);
    const endNumber = Number(endMatch[2]);
    if (!Number.isFinite(startNumber) || !Number.isFinite(endNumber) || startNumber > endNumber) {
      this.rangeError = 'End serial must be greater than or equal to start serial.';
      return null;
    }

    const count = endNumber - startNumber + 1;
    if (count > this.maxRangeSize) {
      this.rangeError = `Range too large (${count}). Maximum allowed is ${this.maxRangeSize}.`;
      return null;
    }

    const padLength = Math.max(startMatch[2].length, endMatch[2].length);
    const normalizedPrefix = startPrefix;
    const serials: string[] = [];

    for (let i = startNumber; i <= endNumber; i++) {
      serials.push(`${normalizedPrefix}${String(i).padStart(padLength, '0')}`);
    }

    return serials;
  }

  private getManualSerials(): string[] {
    return this.manualSerialNumbers
      .split(/[\n,]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private async validateSerialNumbers(): Promise<void> {
    try {
      const serialsToValidate = this.getManualSerials();

      if (serialsToValidate.length === 0) {
        this.validationSummary = null;
        return;
      }

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

      this.manualPreview = this.manualPreview.map((row) => {
        if (!row.serial_number || row.serial_number.length < 2) {
          return { ...row, status: 'error' as const };
        }
        if (existingSerials.includes(row.serial_number)) {
          return { ...row, status: 'duplicate' as const };
        }
        return { ...row, status: 'valid' as const };
      });

    } catch (error) {
      console.error('Error validating serial numbers:', error);
      this.toastrService.error('Error validating serial numbers', 'Validation Error');
    }
  }

  canUpload(): boolean {
    if (!this.validationSummary) return false;
    return this.validationSummary.valid > 0
      && this.validationSummary.duplicates === 0
      && this.validationSummary.errors === 0;
  }

  async uploadSerialNumbers(): Promise<void> {
    if (!this.canUpload()) return;

    try {
      this.isUploading = true;

      const serials = this.getManualSerials();
      const serialNumbers = serials.map(serial => ({
        serial_number: serial,
        category: this.fixedCategory
      }));

      const result = await this.serialNumberService.bulkUploadRange({ serialNumbers });

      this.toastrService.success(
        `Successfully uploaded ${result.created} serial numbers`,
        'Upload Complete'
      );

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
