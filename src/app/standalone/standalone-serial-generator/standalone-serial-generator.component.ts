import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { ToastrService } from "ngx-toastr";
import moment from "moment";
import { SerialNumberService, GeneratedSerialNumber, SerialNumberTemplate } from "@app/core/services/serial-number.service";
import { AuthenticationService } from "@app/core/services/auth.service";
import { PublicFormWrapperComponent } from "../public-form-wrapper/public-form-wrapper.component";
import { NgxBarcode6Module } from "ngx-barcode6";

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PublicFormWrapperComponent, NgxBarcode6Module],
  selector: "app-standalone-serial-generator",
  templateUrl: "./standalone-serial-generator.component.html",
  styleUrls: ["./standalone-serial-generator.component.scss"],
})
export class StandaloneSerialGeneratorComponent implements OnInit {
  constructor(
    private fb: FormBuilder,
    private api: SerialNumberService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  form: FormGroup;
  templates: SerialNumberTemplate[] = [];
  isLoading = false;
  submitted = false;
  isAuthenticated = false;
  currentUser: any = null;
  showSuccessMessage = false;
  generatedSerials: GeneratedSerialNumber[] = [];
  generationDetails: any = null;

  onAuthenticationComplete(event: any): void {
    console.log('Authentication complete:', event);
    this.isAuthenticated = true;
    this.currentUser = event?.user || this.authenticationService.currentUserValue;
    this.loadTemplates();
  }

  onUserLoggedOut(): void {
    console.log('User logged out');
    this.isAuthenticated = false;
    this.currentUser = null;
    this.showSuccessMessage = false;
    this.resetForm();
  }

  initializeForm(): void {
    this.form = this.fb.group({
      template: ['', Validators.required],
      prefix: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]{2,5}$/)]],
      count: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
      used_for: [''],
      notes: [''],
      consume_immediately: [true]
    });

    // Watch template changes to auto-populate prefix
    this.form.get('template')?.valueChanges.subscribe((templateId) => {
      const selectedTemplate = this.templates.find(t => t.template_id == templateId);
      if (selectedTemplate && selectedTemplate.template_id !== 'OTHER_001' && selectedTemplate.config?.prefix) {
        this.form.patchValue({ prefix: selectedTemplate.config.prefix || '' }, { emitEvent: false });
      } else if (selectedTemplate && selectedTemplate.template_id === 'OTHER_001') {
        // For "Other" template, clear the prefix and allow manual entry
        this.form.patchValue({ prefix: '' }, { emitEvent: false });
      }
    });
  }

  async loadTemplates(): Promise<void> {
    try {
      this.api.getTemplates(false).subscribe({
        next: (response: SerialNumberTemplate[]) => {
          this.templates = response || [];
        },
        error: (error) => {
          console.error('Error loading templates:', error);
          this.toastrService.error('Failed to load templates');
        }
      });
    } catch (error) {
      console.error('Error loading templates:', error);
      this.toastrService.error('Failed to load templates');
    }
  }

  get isOtherTemplate(): boolean {
    return this.form.get('template')?.value === 'OTHER_001';
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      this.toastrService.warning("Please fill in all required fields correctly");
      Object.keys(this.form.controls).forEach(key => {
        this.form.controls[key].markAsTouched();
      });
      return;
    }

    try {
      this.isLoading = true;
      const formData = this.form.value;
      const prefix = formData.prefix.toUpperCase();
      const count = formData.count;
      const template = this.templates.find(t => t.template_id == formData.template);
      const usedFor = formData.used_for || null;
      const notes = formData.notes || null;
      const consumeImmediately = formData.consume_immediately || false;
      
      // Call API to generate serial numbers
      this.api.generateBatch(formData.template, prefix, count, usedFor, notes, consumeImmediately).subscribe({
        next: (response) => {
          this.isLoading = false;
          
          if (response.success && response.serials) {
            // Store the generated serials
            this.generatedSerials = response.serials;
            this.generationDetails = {
              template_id: formData.template,
              prefix: prefix,
              count: count,
              template_name: template?.name || 'Unknown',
              generated_count: response.serials.length,
              timestamp: moment().format("YYYY-MM-DD HH:mm:ss"),
              used_for: usedFor,
              notes: notes,
              consume_immediately: consumeImmediately
            };
            
            this.toastrService.success(`Successfully Generated ${this.generatedSerials.length} Serial Numbers!`);
            this.showSuccessMessage = true;
            this.submitted = false;
          } else {
            throw new Error(response.error || 'Failed to generate serial numbers');
          }
        },
        error: (err) => {
          this.isLoading = false;
          let errorMessage = 'An error occurred while generating serial numbers';
          
          if (err?.error?.error) {
            errorMessage = err.error.error;
          } else if (err?.error?.message) {
            errorMessage = err.error.message;
          } else if (err?.message) {
            errorMessage = err.message;
          }
          
          this.toastrService.error(errorMessage, 'Error', {
            timeOut: 5000,
            closeButton: true,
            progressBar: true
          });
          console.error('Error generating serial numbers:', err);
        }
      });
    } catch (err) {
      this.isLoading = false;
      this.toastrService.error('An unexpected error occurred', 'Error');
      console.error('Error:', err);
    }
  }

  createAnother(): void {
    this.showSuccessMessage = false;
    this.generatedSerials = [];
    this.generationDetails = null;
    this.resetForm();
  }

  resetForm() {
    this.submitted = false;
    if (this.form) {
      this.form.reset({
        template: '',
        prefix: '',
        count: 10,
        used_for: '',
        notes: '',
        consume_immediately: false
      });
    }
  }

  logout(): void {
    // Logout from authentication service
    this.authenticationService.logout();
    this.onUserLoggedOut();
  }

  formatTimestamp(timestamp: string): string {
    if (!timestamp) return '';
    return moment(timestamp).format('MM/DD/YYYY hh:mm A');
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.toastrService.success('Copied to clipboard!');
    }).catch(() => {
      this.toastrService.error('Failed to copy to clipboard');
    });
  }

  copyAllSerials(): void {
    const allSerials = this.generatedSerials.map(s => s.serial_number).join('\n');
    this.copyToClipboard(allSerials);
  }

  exportToCSV(): void {
    if (!this.generatedSerials.length) return;

    const csvContent = [
      ['Serial Number', 'Prefix', 'Template', 'Generated By', 'Generated At'].join(','),
      ...this.generatedSerials.map(serial => [
        serial.serial_number,
        this.generationDetails.prefix,
        this.generationDetails.template_name,
        this.currentUser?.full_name || '',
        this.generationDetails.timestamp
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serial-numbers-${this.generationDetails.prefix}-${moment().format('YYYY-MM-DD')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    this.toastrService.success('Serial numbers exported successfully!');
  }

  printSerialNumbers(): void {
    if (!this.generatedSerials.length) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.toastrService.error('Please allow pop-ups to print');
      return;
    }

    // Generate print content with barcodes
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Serial Numbers - ${this.generationDetails.prefix} - ${moment().format('YYYY-MM-DD')}</title>
        <style>
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            color: #333;
          }
          .header-info {
            margin-top: 10px;
            font-size: 12px;
            color: #666;
          }
          .serial-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-top: 20px;
          }
          .serial-item {
            border: 1px solid #ddd;
            padding: 15px;
            text-align: center;
            page-break-inside: avoid;
            background: white;
          }
          .serial-number {
            font-family: 'Courier New', monospace;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
          }
          .barcode-container {
            margin: 10px 0;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .barcode-container svg {
            max-width: 100%;
            height: auto;
          }
          .serial-info {
            font-size: 10px;
            color: #666;
            margin-top: 8px;
          }
          @media print {
            body {
              padding: 10px;
            }
            .serial-grid {
              gap: 10px;
            }
            .serial-item {
              border: 1px solid #000;
            }
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      </head>
      <body>
        <div class="header">
          <h1>Generated Serial Numbers</h1>
          <div class="header-info">
            <strong>Template:</strong> ${this.generationDetails.template_name} | 
            <strong>Prefix:</strong> ${this.generationDetails.prefix} | 
            <strong>Count:</strong> ${this.generatedSerials.length} | 
            <strong>Generated:</strong> ${this.formatTimestamp(this.generationDetails.timestamp)}
            ${this.generationDetails.used_for ? `<br><strong>Used For:</strong> ${this.generationDetails.used_for}` : ''}
          </div>
        </div>
        <div class="serial-grid">
          ${this.generatedSerials.map((serial, index) => `
            <div class="serial-item">
              <div class="serial-number">${serial.serial_number}</div>
              <div class="barcode-container">
                <svg id="barcode-${index}"></svg>
              </div>
              <div class="serial-info">
                #${index + 1} of ${this.generatedSerials.length}
              </div>
            </div>
          `).join('')}
        </div>
        <script>
          // Generate barcodes after content loads
          window.onload = function() {
            ${this.generatedSerials.map((serial, index) => `
              try {
                JsBarcode("#barcode-${index}", "${serial.serial_number}", {
                  format: "CODE128",
                  width: 2,
                  height: 50,
                  displayValue: true,
                  fontSize: 12,
                  margin: 5
                });
              } catch(e) {
                console.error('Error generating barcode for ${serial.serial_number}:', e);
              }
            `).join('\n')}
            
            // Auto-print after a short delay to ensure barcodes are rendered
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    this.toastrService.success('Opening print dialog...');
  }
}
