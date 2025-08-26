import { Component } from '@angular/core';
import { SerialNumberGeneratorComponent } from '@app/shared/components/serial-number-generator/serial-number-generator.component';
import { SharedModule } from '@app/shared/shared.module';

interface SerialNumberTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  config: any;
  example: string;
}

@Component({
  standalone: true,
  imports: [SharedModule, SerialNumberGeneratorComponent],
  selector: 'app-serial-number-demo',
  templateUrl: './serial-number-demo.component.html',
  styleUrls: ['./serial-number-demo.component.scss']
})
export class SerialNumberDemoComponent {
  title = 'Serial Number Generator';
  icon = 'mdi mdi-barcode';

  currentSerialNumber: string = '';
  serialHistory: string[] = [];
  selectedTemplate: SerialNumberTemplate | null = null;

  templates: SerialNumberTemplate[] = [
    {
      id: 'product-standard',
      name: 'Product Standard',
      description: 'Standard product serial numbers with date and random digits',
      icon: 'mdi mdi-package-variant',
      category: 'Product',
      config: {
        prefix: 'PROD',
        includeDate: true,
        dateFormat: 'YYYYMMDD',
        includeRandomNumbers: true,
        randomNumberLength: 4,
        separator: '-'
      },
      example: 'PROD-20250819-1234'
    },
    {
      id: 'asset-tag',
      name: 'Asset Tag',
      description: 'Asset tracking tags with short date format',
      icon: 'mdi mdi-tag',
      category: 'Asset',
      config: {
        prefix: 'AT',
        includeDate: true,
        dateFormat: 'YYMMDD',
        includeRandomNumbers: true,
        randomNumberLength: 4,
        separator: '-'
      },
      example: 'AT-250819-5678'
    },
    {
      id: 'work-order',
      name: 'Work Order',
      description: 'Work orders with date, time and sequence number',
      icon: 'mdi mdi-clipboard-text',
      category: 'Operations',
      config: {
        prefix: 'WO',
        includeDate: true,
        dateFormat: 'YYYYMMDD',
        includeTime: true,
        timeFormat: 'HHmmss',
        includeRandomNumbers: true,
        randomNumberLength: 4,
        separator: '-'
      },
      example: 'WO-20250819-143052-9012'
    },
    {
      id: 'transaction-id',
      name: 'Transaction ID',
      description: 'Transaction identifiers with timestamp',
      icon: 'mdi mdi-cash-register',
      category: 'Financial',
      config: {
        customFormat: '{TIMESTAMP}-{RANDOM:4}'
      },
      example: '1724072252-3456'
    },
    {
      id: 'batch-number',
      name: 'Batch Number',
      description: 'Manufacturing batch numbers',
      icon: 'mdi mdi-package-variant-closed',
      category: 'Manufacturing',
      config: {
        prefix: 'BATCH',
        includeDate: true,
        dateFormat: 'YYMMDD',
        includeRandomNumbers: true,
        randomNumberLength: 3,
        separator: '-',
        suffix: 'A'
      },
      example: 'BATCH-250819-123-A'
    },
    {
      id: 'service-ticket',
      name: 'Service Ticket',
      description: 'Service and support ticket numbers',
      icon: 'mdi mdi-wrench',
      category: 'Service',
      config: {
        prefix: 'ST',
        includeDate: true,
        dateFormat: 'YYYYMMDD',
        includeRandomNumbers: true,
        randomNumberLength: 5,
        separator: '-'
      },
      example: 'ST-20250819-12345'
    },
    {
      id: 'quality-control',
      name: 'Quality Control',
      description: 'QC inspection and test numbers',
      icon: 'mdi mdi-check-circle',
      category: 'Quality',
      config: {
        prefix: 'QC',
        includeDate: true,
        dateFormat: 'YYMMDD',
        includeTime: true,
        timeFormat: 'HHmm',
        includeRandomNumbers: true,
        randomNumberLength: 2,
        separator: '-'
      },
      example: 'QC-250819-1430-12'
    },
    {
      id: 'shipment-tracking',
      name: 'Shipment Tracking',
      description: 'Shipping and logistics tracking numbers',
      icon: 'mdi mdi-truck',
      category: 'Logistics',
      config: {
        prefix: 'SHIP',
        includeDate: true,
        dateFormat: 'YYYYMMDD',
        includeRandomNumbers: true,
        randomNumberLength: 6,
        separator: ''
      },
      example: 'SHIP20250819123456'
    }
  ];

  onSerialNumberGenerated(serialNumber: string) {
    this.currentSerialNumber = serialNumber;
    this.serialHistory.unshift(serialNumber);
    
    // Keep only last 10 generated serial numbers
    if (this.serialHistory.length > 10) {
      this.serialHistory = this.serialHistory.slice(0, 10);
    }
  }

  applyTemplate(template: SerialNumberTemplate) {
    this.selectedTemplate = template;
  }

  clearTemplate() {
    this.selectedTemplate = null;
  }

  getTemplatesByCategory(category: string): SerialNumberTemplate[] {
    return this.templates.filter(template => template.category === category);
  }

  getCategories(): string[] {
    return [...new Set(this.templates.map(template => template.category))];
  }

  clearHistory() {
    this.serialHistory = [];
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Serial number copied to clipboard');
    });
  }
}
