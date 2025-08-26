import { Component, EventEmitter, Input, Output, ViewChild, TemplateRef, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SharedModule } from '@app/shared/shared.module';
import { NgxBarcode6Module } from 'ngx-barcode6';
import { ToastrService } from 'ngx-toastr';
import { ZebraLabelService, ZebraLabelTemplate } from '@app/shared/services/zebra-label.service';
import { ZebraLabelPrintModalService } from '@app/shared/components/zebra-label-print-modal/zebra-label-print-modal.service';
import { SerialNumberService } from '@app/core/services/serial-number.service';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import moment from 'moment';

interface SerialNumberConfig {
  prefix?: string;
  includeDate?: boolean;
  includeTime?: boolean;
  dateFormat?: string;
  timeFormat?: string;
  includeRandomNumbers?: boolean;
  randomNumberLength?: number;
  suffix?: string;
  separator?: string;
  customFormat?: string;
}

@Component({
  standalone: true,
  imports: [SharedModule, NgxBarcode6Module],
  selector: 'app-serial-number-generator',
  templateUrl: './serial-number-generator.component.html',
  styleUrls: ['./serial-number-generator.component.scss']
})
export class SerialNumberGeneratorComponent {
  @Input() config: SerialNumberConfig = {};
  @Input() showForm: boolean = true;
  @Input() autoGenerate: boolean = false;
  @Input() usedFor: string = 'demo'; // What this serial number will be used for
  @Input() saveToDatabase: boolean = true; // Whether to save to database
  @Output() serialNumberGenerated = new EventEmitter<string>();
  @Output() configChanged = new EventEmitter<SerialNumberConfig>();
  @ViewChild('advancedConfigOffcanvas') advancedConfigOffcanvas!: TemplateRef<any>;

  form: FormGroup;
  generatedSerialNumber: string = '';
  previewSerialNumber: string = '';
  showBarcode: boolean = false;
  showLabelPreview: boolean = false;
  showAllTemplates: boolean = false;
  showAdvancedConfig: boolean = false;
  labelPreviewHtml: string = '';
  allTemplatesPreviewHtml: string[] = [];
  zebraTemplates: ZebraLabelTemplate[] = [];
  selectedTemplate: string = 'serial-number-standard';
  isGenerating: boolean = false;
  isSerialNumberSaved: boolean = false; // Track if current serial number is saved to database
  activePreset: string = ''; // Track which preset is currently active

  constructor(
    private fb: FormBuilder, 
    private toastrService: ToastrService,
    private zebraLabelService: ZebraLabelService,
    private zebraLabelPrintModalService: ZebraLabelPrintModalService,
    private serialNumberService: SerialNumberService,
    private offcanvasService: NgbOffcanvas,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForm();
    this.zebraTemplates = this.zebraLabelService.getTemplates();
  }

  ngOnInit() {
    if (this.config) {
      this.form.patchValue(this.config);
    }
    
    if (this.autoGenerate) {
      this.generateSerialNumber();
    }

    // Watch for form changes to update preview
    this.form.valueChanges.subscribe(() => {
      // Handle timestamp preset custom format updates
      if (this.activePreset === 'timestamp') {
        this.updateTimestampCustomFormat();
      }
      
      this.updatePreview();
      
      // Clear active preset if user manually changes values (simplified logic)
      if (this.activePreset && this.detectManualChange()) {
        this.activePreset = '';
      }
    });

    this.updatePreview();
  }

  // Simplified method to detect if user made manual changes vs preset application
  private detectManualChange(): boolean {
    // For now, we'll keep the preset active until user explicitly clears it
    // This prevents the preset from being cleared too aggressively
    return false;
  }

  private initializeForm() {
    this.form = this.fb.group({
      prefix: ['SN'], // Default prefix
      includeDate: [true], // Default include date
      includeTime: [false], // Default no time to keep it simple
      dateFormat: ['YYYYMMDD'], // Default date format
      timeFormat: ['HHmmss'],
      includeRandomNumbers: [true], // Default include random numbers
      randomNumberLength: [4, [Validators.min(1), Validators.max(10)]], // Default 4 digits
      suffix: [''], // No suffix by default
      separator: ['-'], // Default separator
      customFormat: ['']
    });
  }

  updatePreview() {
    const config = this.form.value;
    this.previewSerialNumber = this.buildSerialNumber(config);
  }

  // Update timestamp custom format based on checkbox changes
  private updateTimestampCustomFormat() {
    if (this.activePreset !== 'timestamp') {
      return;
    }

    const includeDate = this.form.get('includeDate')?.value;
    const includeTime = this.form.get('includeTime')?.value;
    const includeRandomNumbers = this.form.get('includeRandomNumbers')?.value;
    const dateFormat = this.form.get('dateFormat')?.value || 'YYYYMMDD';
    const timeFormat = this.form.get('timeFormat')?.value || 'HHmmss';
    const randomNumberLength = this.form.get('randomNumberLength')?.value || 4;

    let customFormatParts: string[] = [];

    // Always include timestamp as the base
    customFormatParts.push('{TIMESTAMP}');
    
    // Add date if enabled
    if (includeDate) {
      customFormatParts.push(`{DATE:${dateFormat}}`);
    }
    
    // Add time if enabled
    if (includeTime) {
      customFormatParts.push(`{TIME:${timeFormat}}`);
    }
    
    // Add random numbers if enabled
    if (includeRandomNumbers) {
      customFormatParts.push(`{RANDOM:${randomNumberLength}}`);
    }

    // Join with hyphens
    const newCustomFormat = customFormatParts.join('-');
    
    // Only update if different to avoid infinite loop
    const currentCustomFormat = this.form.get('customFormat')?.value;
    if (currentCustomFormat !== newCustomFormat) {
      this.form.patchValue({ customFormat: newCustomFormat }, { emitEvent: false });
    }
  }

  generateSerialNumber() {
    this.isGenerating = true;
    this.isSerialNumberSaved = false; // Reset saved status
    
    // Always generate locally first for preview
    const config = this.form.value;
    this.generatedSerialNumber = this.buildSerialNumber(config);
    this.serialNumberGenerated.emit(this.generatedSerialNumber);
    this.configChanged.emit(config);
    this.isGenerating = false;
    
    this.toastrService.success('Serial number generated! Click "Use This Serial Number" to save to database.');
    
    // Auto-generate label preview if it's currently shown
    if (this.showLabelPreview) {
      this.generateLabelPreview();
    }
  }

  generatePreviewOnly() {
    const config = this.form.value;
    this.previewSerialNumber = this.buildSerialNumber(config);
    this.isSerialNumberSaved = false; // Reset saved status for preview
    this.toastrService.info('Preview generated (not saved to database)');
  }

  useCurrentSerialNumber() {
    const serialNumber = this.generatedSerialNumber || this.previewSerialNumber;
    if (!serialNumber) {
      this.toastrService.warning('Please generate a serial number first');
      return;
    }

    if (this.saveToDatabase) {
      // Save to database first, then emit
      this.saveSerialNumberToDatabase(serialNumber);
    } else {
      // Just emit for local use
      this.serialNumberGenerated.emit(serialNumber);
      this.toastrService.success(`Serial number "${serialNumber}" is ready to use!`);
    }
  }

  private saveSerialNumberToDatabase(serialNumber: string) {
    // Create a template ID based on current configuration
    const templateId = this.createTemplateId();
    
    // Note: The API generates its own serial number, so we'll need to modify the API
    // to accept a pre-generated serial number, or save the template and generate normally
    this.serialNumberService.generateSerial(templateId, this.usedFor).subscribe({
      next: (response) => {
        if (response.success) {
          this.isSerialNumberSaved = true;
          // Use the API-generated serial number instead of our local one
          this.generatedSerialNumber = response.data.serial_number;
          this.serialNumberGenerated.emit(this.generatedSerialNumber);
          this.toastrService.success(`Serial number "${this.generatedSerialNumber}" saved to database and ready to use!`);
        } else {
          this.toastrService.error('Failed to save serial number: ' + response.message);
          // Still emit the local serial number as fallback
          this.serialNumberGenerated.emit(serialNumber);
        }
      },
      error: (error) => {
        console.error('Database Error:', error);
        this.toastrService.warning('Database unavailable - using serial number locally');
        // Still emit the local serial number as fallback
        this.serialNumberGenerated.emit(serialNumber);
      }
    });
  }

  private generateWithAPI() {
    // Create a template ID based on current configuration
    const templateId = this.createTemplateId();
    
    this.serialNumberService.generateSerial(templateId, this.usedFor).subscribe({
      next: (response) => {
        this.isGenerating = false;
        if (response.success) {
          this.generatedSerialNumber = response.data.serial_number;
          this.serialNumberGenerated.emit(this.generatedSerialNumber);
          this.configChanged.emit(this.form.value);
          this.toastrService.success('Serial number generated and saved to database!');
          
          // Auto-generate label preview if it's currently shown
          if (this.showLabelPreview) {
            this.generateLabelPreview();
          }
        } else {
          this.toastrService.error('Failed to generate serial number: ' + response.message);
          // Fallback to local generation
          this.generateLocally();
        }
      },
      error: (error) => {
        this.isGenerating = false;
        console.error('API Error:', error);
        this.toastrService.warning('Database unavailable, generating locally');
        // Fallback to local generation
        this.generateLocally();
      }
    });
  }

  private generateLocally() {
    const config = this.form.value;
    this.generatedSerialNumber = this.buildSerialNumber(config);
    this.serialNumberGenerated.emit(this.generatedSerialNumber);
    this.configChanged.emit(config);
    this.isGenerating = false;
    
    if (this.saveToDatabase) {
      this.toastrService.warning('Generated locally - database not available');
    } else {
      this.toastrService.success('Serial number generated locally');
    }
    
    // Auto-generate label preview if it's currently shown
    if (this.showLabelPreview) {
      this.generateLabelPreview();
    }
  }

  private createTemplateId(): string {
    // Create a unique template ID based on current configuration
    const config = this.form.value;
    const configHash = btoa(JSON.stringify(config)).substring(0, 8);
    return `temp_${configHash}`;
  }

  private buildSerialNumber(config: SerialNumberConfig): string {
    let result = '';
    
    if (config.customFormat) {
      // Parse custom format first
      result = this.parseCustomFormat(config.customFormat);
      
      // Apply prefix and suffix to custom format using separator
      const parts: string[] = [];
      
      if (config.prefix) {
        parts.push(config.prefix);
      }
      
      parts.push(result);
      
      if (config.suffix) {
        parts.push(config.suffix);
      }
      
      const separator = config.separator || '-';
      return parts.length > 1 ? parts.join(separator) : result;
    } else {
      // Use structured format
      const parts: string[] = [];

      // Add prefix
      if (config.prefix) {
        parts.push(config.prefix);
      }

      // Add date
      if (config.includeDate) {
        const dateFormat = config.dateFormat || 'YYYYMMDD';
        parts.push(moment().format(dateFormat));
      }

      // Add time
      if (config.includeTime) {
        const timeFormat = config.timeFormat || 'HHmmss';
        parts.push(moment().format(timeFormat));
      }

      // Add random numbers
      if (config.includeRandomNumbers) {
        const length = config.randomNumberLength || 4;
        const randomNumber = this.generateRandomNumber(length);
        parts.push(randomNumber);
      }

      // Add suffix
      if (config.suffix) {
        parts.push(config.suffix);
      }

      const separator = config.separator || '-';
      return parts.join(separator);
    }
  }

  private parseCustomFormat(customFormat: string): string {
    let result = customFormat;
    
    // Replace placeholders with actual values
    result = result.replace(/\{DATE:(.*?)\}/g, (match, format) => {
      return moment().format(format);
    });
    
    result = result.replace(/\{TIME:(.*?)\}/g, (match, format) => {
      return moment().format(format);
    });
    
    result = result.replace(/\{RANDOM:(\d+)\}/g, (match, length) => {
      return this.generateRandomNumber(parseInt(length));
    });
    
    result = result.replace(/\{TIMESTAMP\}/g, () => {
      return moment().unix().toString();
    });
    
    result = result.replace(/\{YEAR\}/g, () => {
      return moment().format('YYYY');
    });
    
    result = result.replace(/\{MONTH\}/g, () => {
      return moment().format('MM');
    });
    
    result = result.replace(/\{DAY\}/g, () => {
      return moment().format('DD');
    });

    return result;
  }

  private generateRandomNumber(length: number): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  // Simplified preset configurations
  usePreset(presetType: string) {
    this.activePreset = presetType;
    
    // Clear all values first
    this.form.patchValue({
      prefix: '',
      suffix: '',
      separator: '-',
      includeDate: false,
      includeTime: false,
      dateFormat: 'YYYYMMDD',
      timeFormat: 'HHmmss',
      includeRandomNumbers: false,
      randomNumberLength: 4,
      customFormat: ''
    });

    // Apply preset-specific values
    switch (presetType) {
      case 'simple':
        this.form.patchValue({
          includeDate: true,
          dateFormat: 'YYMMDD',
          includeRandomNumbers: true,
          randomNumberLength: 3,
          separator: ''
        });
        break;
        
      case 'standard':
        this.form.patchValue({
          prefix: 'SN',
          includeDate: true,
          dateFormat: 'YYYYMMDD',
          includeRandomNumbers: true,
          randomNumberLength: 4,
          separator: '-'
        });
        break;
        
      case 'detailed':
        this.form.patchValue({
          prefix: 'PROD',
          includeDate: true,
          includeTime: true,
          dateFormat: 'YYYYMMDD',
          timeFormat: 'HHmmss',
          includeRandomNumbers: true,
          randomNumberLength: 4,
          separator: '-'
        });
        break;
        
      case 'timestamp':
        this.form.patchValue({
          customFormat: '{TIMESTAMP}-{RANDOM:4}',
          includeRandomNumbers: true,
          randomNumberLength: 4
        });
        break;
    }
    
    this.updatePreview();
    this.toastrService.info(`Applied ${presetType} preset`);
  }

  // Clear active preset and reset to default values
  clearPreset() {
    this.activePreset = '';
    
    // Reset to a clean default state
    this.form.patchValue({
      prefix: 'SN',
      suffix: '',
      separator: '-',
      includeDate: true,
      includeTime: false,
      dateFormat: 'YYYYMMDD',
      timeFormat: 'HHmmss',
      includeRandomNumbers: true,
      randomNumberLength: 4,
      customFormat: ''
    });
    
    this.updatePreview();
    this.toastrService.info('Preset cleared, using default configuration');
  }

  // Helper method to format preset name for display
  getPresetDisplayName(preset: string): string {
    if (!preset) return '';
    return preset.charAt(0).toUpperCase() + preset.slice(1);
  }

  // Simplified field relevance check
  isFieldRelevant(fieldName: string): boolean {
    const customFormat = this.form.get('customFormat')?.value;
    const hasCustomFormat = customFormat && customFormat.trim().length > 0;
    
    // Basic settings are always enabled
    if (['prefix', 'suffix', 'separator'].includes(fieldName)) {
      return true;
    }
    
    // For timestamp preset, keep all fields enabled even though it uses custom format
    if (this.activePreset === 'timestamp') {
      return true;
    }
    
    // Structured fields are disabled only when custom format is used (and not timestamp preset)
    if (['includeDate', 'dateFormat', 'includeTime', 'timeFormat', 'includeRandomNumbers', 'randomNumberLength'].includes(fieldName)) {
      return !hasCustomFormat;
    }
    
    // Custom format is always enabled
    return true;
  }

  // Simplified help text
  getFieldHelpText(fieldName: string): string {
    const customFormat = this.form.get('customFormat')?.value;
    const hasCustomFormat = customFormat && customFormat.trim().length > 0;
    
    switch (fieldName) {
      case 'prefix':
        return hasCustomFormat ? 'Added before the custom format' : 'Text at the beginning';
      case 'suffix':
        return hasCustomFormat ? 'Added after the custom format' : 'Text at the end';
      case 'separator':
        return 'Character used to separate parts';
      default:
        // For timestamp preset, don't show "not used" message
        if (this.activePreset === 'timestamp') {
          return '';
        }
        return hasCustomFormat && !this.isFieldRelevant(fieldName) ? 
          'Not used with custom format' : '';
    }
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.toastrService.success('Serial number copied to clipboard!');
    });
  }

  // Simplified offcanvas handling
  openAdvancedConfig() {
    const offcanvasRef = this.offcanvasService.open(this.advancedConfigOffcanvas, {
      position: 'end',
      backdrop: true,
      keyboard: true,
      scroll: false
    });

    // Simple form change subscription - just update preview
    const subscription = this.form.valueChanges.subscribe(() => {
      this.updatePreview();
    });

    // Clean up subscription when offcanvas is closed
    offcanvasRef.result.finally(() => subscription.unsubscribe());
    offcanvasRef.dismissed.subscribe(() => subscription.unsubscribe());
  }

  getQuickGenerate(type: 'simple' | 'detailed' | 'timestamp'): string {
    switch (type) {
      case 'simple':
        return `${moment().format('YYMMDD')}${this.generateRandomNumber(3)}`;
      case 'detailed':
        return `PROD-${moment().format('YYYYMMDD')}-${moment().format('HHmmss')}-${this.generateRandomNumber(4)}`;
      case 'timestamp':
        return `${moment().unix()}-${this.generateRandomNumber(4)}`;
      default:
        return `SN-${moment().format('YYYYMMDD')}-${this.generateRandomNumber(4)}`;
    }
  }

  toggleBarcodePreview() {
    this.showBarcode = !this.showBarcode;
  }

  toggleLabelPreview() {
    this.showLabelPreview = !this.showLabelPreview;
    if (this.showLabelPreview) {
      this.generateLabelPreview();
    }
  }

  generateLabelPreview() {
    const serialNumber = this.generatedSerialNumber || this.previewSerialNumber;
    if (!serialNumber) {
      this.toastrService.warning('Please generate a serial number first');
      return;
    }

    try {
      if (this.showAllTemplates) {
        // Generate previews for all templates
        this.allTemplatesPreviewHtml = this.zebraTemplates.map(template => {
          const preview = this.zebraLabelService.generateHtmlPreview(template.id, serialNumber, {
            quantity: 1,
            partNumber: '',
            dateTime: moment().format('MM/DD/YYYY HH:mm')
          });
          return preview.html;
        });
        this.labelPreviewHtml = ''; // Clear single preview
      } else {
        // Generate preview for selected template only
        const preview = this.zebraLabelService.generateHtmlPreview(this.selectedTemplate, serialNumber, {
          quantity: 1,
          partNumber: '',
          dateTime: moment().format('MM/DD/YYYY HH:mm')
        });
        this.labelPreviewHtml = preview.html;
        this.allTemplatesPreviewHtml = []; // Clear all previews
      }
    } catch (error) {
      this.toastrService.error('Error generating label preview: ' + error.message);
    }
  }

  onTemplateChange(templateId: string) {
    this.selectedTemplate = templateId;
    if (this.showLabelPreview) {
      this.generateLabelPreview();
    }
  }

  printZebraLabel(serialNumber?: string) {
    const sn = serialNumber || this.generatedSerialNumber || this.previewSerialNumber;
    
    if (!sn) {
      this.toastrService.warning('Please generate a serial number first');
      return;
    }

    this.zebraLabelService.printLabel(this.selectedTemplate, sn, {
      quantity: 1,
      partNumber: '',
      dateTime: moment().format('MM/DD/YYYY HH:mm')
    });
  }

  printBatchZebraLabels() {
    const sn = this.generatedSerialNumber || this.previewSerialNumber;
    
    if (!sn) {
      this.toastrService.warning('Please generate a serial number first');
      return;
    }

    // Prompt for quantity
    const quantity = prompt('How many labels do you want to print?', '1');
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) < 1) {
      return;
    }

    this.zebraLabelService.printLabel(this.selectedTemplate, sn, {
      quantity: Number(quantity),
      partNumber: '',
      dateTime: moment().format('MM/DD/YYYY HH:mm')
    });
  }

  downloadZebraTemplate(serialNumber?: string) {
    const sn = serialNumber || this.generatedSerialNumber || this.previewSerialNumber;
    
    if (!sn) {
      this.toastrService.warning('Please generate a serial number first');
      return;
    }

    this.zebraLabelService.downloadZplFile(this.selectedTemplate, sn, {
      quantity: 1,
      partNumber: '',
      dateTime: moment().format('MM/DD/YYYY HH:mm')
    });
  }

  getSelectedTemplateName(): string {
    const template = this.zebraTemplates.find(t => t.id === this.selectedTemplate);
    return template ? template.name : '';
  }

  previewZebraLabel(): string {
    const sn = this.generatedSerialNumber || this.previewSerialNumber;
    if (!sn) return '';
    
    return this.zebraLabelService.previewLabel(this.selectedTemplate, sn, {
      quantity: 1,
      partNumber: '',
      dateTime: moment().format('MM/DD/YYYY HH:mm')
    });
  }

  openAdvancedPrintModal() {
    const sn = this.generatedSerialNumber || this.previewSerialNumber;
    
    if (!sn) {
      this.toastrService.warning('Please generate a serial number first');
      return;
    }

    this.zebraLabelPrintModalService.open({
      serialNumber: sn,
      title: 'Print Serial Number Label',
      partNumber: ''
    });
  }
}
