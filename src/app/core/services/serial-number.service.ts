import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import moment from 'moment';

export interface SerialNumberTemplate {
  id?: number;
  template_id: string;
  name: string;
  description: string;
  config: any;
  is_default?: boolean;
  is_active?: boolean;
  usage_count?: number;
  used_count?: number;
  unused_count?: number;
}

export interface GeneratedSerialNumber {
  id: number;
  serial_number: string;
  template_id: string;
  template_name: string;
  used_for: string;
  reference_id: string;
  reference_table: string;
  is_used: boolean;
  generated_by: number;
  generated_at: string;
  used_at?: string;
  notes?: string;
  status: string;
}

export interface SerialNumberBatch {
  id: number;
  batch_id: string;
  template_id: string;
  template_name: string;
  total_count: number;
  generated_count: number;
  used_count: number;
  status: string;
  purpose: string;
  created_at: string;
  completed_at?: string;
  generation_progress_percent: number;
  usage_percent: number;
}

@Injectable({
  providedIn: 'root'
})
export class SerialNumberService {
  
  private readonly API_URL = 'serial-number';
  private readonly STORAGE_KEY = 'serial_number_templates';

  constructor(private http: HttpClient) { }

  // API Methods
  
  /**
   * Generate a single serial number
   */
  generateSerial(
    template_id: string, 
    used_for?: string, 
    reference_id?: string, 
    reference_table?: string,
    notes?: string,
    consume_immediately?: boolean
  ): Observable<any> {
    return this.http.post(`${this.API_URL}/index.php`, {
      action: 'generate',
      template_id,
      used_for,
      reference_id,
      reference_table,
      notes,
      consume_immediately
    });
  }

  /**
   * Mark serial number as used
   */
  useSerial(serial_number: string, reference_id: string, reference_table: string, notes?: string): Observable<any> {
    return this.http.post(`${this.API_URL}/index.php`, {
      action: 'use_serial',
      serial_number,
      reference_id,
      reference_table,
      notes
    });
  }

  /**
   * Save template configuration
   */
  saveTemplate(template: SerialNumberTemplate): Observable<any> {
    return this.http.post(`${this.API_URL}/index.php`, {
      action: 'save_template',
      template_id: template.template_id,
      name: template.name,
      description: template.description,
      config: template.config,
      is_default: template.is_default
    });
  }

  /**
   * Get all templates
   */
  getTemplates(include_inactive: boolean = false): Observable<any> {
    return this.http.get(`${this.API_URL}/index.php?action=templates&include_inactive=${include_inactive}`);
  }
  
  /**
   * Generate batch of serial numbers
   */
  generateBatch(
    template_id: string, 
    prefix: string, 
    count: number,
    used_for?: string,
    notes?: string,
    consume_immediately?: boolean
  ): Observable<any> {
    return this.http.post(`${this.API_URL}/index.php`, {
      action: 'generate_batch',
      template_id,
      prefix,
      count,
      used_for,
      notes,
      consume_immediately
    });
  }

  /**
   * Get serial number history
   */
  getSerialHistory(limit: number = 100, template_id?: string, status?: string): Observable<any> {
    let url = `${this.API_URL}/index.php?action=history&limit=${limit}`;
    if (template_id) url += `&template_id=${template_id}`;
    if (status) url += `&status=${status}`;
    return this.http.get(url);
  }

  /**
   * Validate serial number
   */
  validateSerial(serial_number: string): Observable<any> {
    return this.http.post(`${this.API_URL}/index.php`, {
      action: 'validate',
      serial_number
    });
  }

  // Local Methods (for offline generation)

  /**
   * Generate a simple serial number quickly
   */
  generateQuick(type: 'simple' | 'standard' | 'detailed' | 'timestamp' = 'standard'): string {
    switch (type) {
      case 'simple':
        return `${moment().format('YYMMDD')}${this.generateRandomNumber(3)}`;
      case 'standard':
        return `SN-${moment().format('YYYYMMDD')}-${this.generateRandomNumber(4)}`;
      case 'detailed':
        return `PROD-${moment().format('YYYYMMDD')}-${moment().format('HHmmss')}-${this.generateRandomNumber(4)}`;
      case 'timestamp':
        return `${moment().unix()}-${this.generateRandomNumber(4)}`;
      default:
        return `SN-${moment().format('YYYYMMDD')}-${this.generateRandomNumber(4)}`;
    }
  }

  /**
   * Generate with custom configuration (local)
   */
  generateWithConfig(config: any): string {
    if (config.customFormat) {
      return this.parseCustomFormat(config.customFormat);
    }

    const parts: string[] = [];

    if (config.prefix) {
      parts.push(config.prefix);
    }

    if (config.includeDate) {
      const dateFormat = config.dateFormat || 'YYYYMMDD';
      parts.push(moment().format(dateFormat));
    }

    if (config.includeTime) {
      const timeFormat = config.timeFormat || 'HHmmss';
      parts.push(moment().format(timeFormat));
    }

    if (config.includeRandomNumbers) {
      const length = config.randomNumberLength || 4;
      const randomNumber = this.generateRandomNumber(length);
      parts.push(randomNumber);
    }

    if (config.suffix) {
      parts.push(config.suffix);
    }

    const separator = config.separator || '-';
    return parts.join(separator);
  }

  /**
   * Generate batch of serial numbers (local)
   */
  generateBatchLocal(count: number, config: any): string[] {
    const serialNumbers: string[] = [];
    for (let i = 0; i < count; i++) {
      serialNumbers.push(this.generateWithConfig(config));
      // Small delay to ensure uniqueness when time is included
      if (config.includeTime && i < count - 1) {
        // Add a small increment to avoid duplicates in batch generation
        const now = new Date();
        now.setMilliseconds(now.getMilliseconds() + 1);
      }
    }
    return serialNumbers;
  }

  // Template Management (Local Storage)

  /**
   * Save template to local storage
   */
  saveTemplateLocal(template: SerialNumberTemplate): void {
    const templates = this.getTemplatesLocal();
    const existingIndex = templates.findIndex(t => t.template_id === template.template_id);
    
    if (existingIndex > -1) {
      templates[existingIndex] = template;
    } else {
      templates.push(template);
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates));
  }

  /**
   * Get templates from local storage
   */
  getTemplatesLocal(): SerialNumberTemplate[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : this.getDefaultTemplates();
  }

  /**
   * Delete template from local storage
   */
  deleteTemplateLocal(template_id: string): void {
    const templates = this.getTemplatesLocal().filter(t => t.template_id !== template_id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates));
  }

  /**
   * Get default templates
   */
  private getDefaultTemplates(): SerialNumberTemplate[] {
    return [
      {
        template_id: 'standard-product',
        name: 'Standard Product',
        description: 'Standard format for product serial numbers',
        config: {
          prefix: 'SN',
          includeDate: true,
          includeTime: false,
          dateFormat: 'YYYYMMDD',
          includeRandomNumbers: true,
          randomNumberLength: 4,
          separator: '-'
        },
        is_default: true,
        is_active: true
      },
      {
        template_id: 'asset-tag',
        name: 'Asset Tag',
        description: 'Format for asset tracking tags',
        config: {
          prefix: 'AT',
          includeDate: true,
          includeTime: false,
          dateFormat: 'YYMMDD',
          includeRandomNumbers: true,
          randomNumberLength: 4,
          separator: '-'
        },
        is_default: true,
        is_active: true
      },
      {
        template_id: 'work-order',
        name: 'Work Order',
        description: 'Format for work order numbers',
        config: {
          prefix: 'WO',
          includeDate: true,
          includeTime: true,
          dateFormat: 'YYYYMMDD',
          timeFormat: 'HHmmss',
          includeRandomNumbers: true,
          randomNumberLength: 4,
          separator: '-'
        },
        is_default: true,
        is_active: true
      },
      {
        template_id: 'ags-serial',
        name: 'AGS Serial',
        description: 'Format for AGS serial numbers',
        config: {
          prefix: 'AGS',
          includeDate: true,
          includeTime: false,
          dateFormat: 'YYYYMMDD',
          includeRandomNumbers: true,
          randomNumberLength: 6,
          separator: '-'
        },
        is_default: true,
        is_active: true
      }
    ];
  }

  private generateRandomNumber(length: number): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  private parseCustomFormat(customFormat: string): string {
    let result = customFormat;
    
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

  /**
   * Validate serial number format
   */
  validateSerialNumber(serialNumber: string, pattern?: string): boolean {
    if (!serialNumber || serialNumber.trim().length === 0) {
      return false;
    }

    if (pattern) {
      try {
        const regex = new RegExp(pattern);
        return regex.test(serialNumber);
      } catch (e) {
        return false;
      }
    }

    // Basic validation: alphanumeric with some special chars
    const basicPattern = /^[A-Za-z0-9\-_\.]+$/;
    return basicPattern.test(serialNumber);
  }

  /**
   * Check if serial number is unique in a given array
   */
  isUnique(serialNumber: string, existingNumbers: string[]): boolean {
    return !existingNumbers.includes(serialNumber);
  }

  /**
   * Generate EYEFI Asset Numbers in format YYYYMMDDXXX
   * Backend will generate sequential numbers for today's date
   */
  generateEyefiAssetNumbers(count: number): Promise<any> {
    return this.http.post<any>(`${this.API_URL}/index.php`, {
      action: 'generate_asset_numbers',
      count: count,
      date: moment().format('YYYY-MM-DD')
    }).toPromise();
  }
}
