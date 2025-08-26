import { Injectable } from '@angular/core';
import { Observable, of, delay, map, throwError } from 'rxjs';
import { ULLabel, ULLabelUsage, ULLabelReport, ULUsageReport } from '../models/ul-label.model';

@Injectable({
  providedIn: 'root'
})
export class ULLabelMockService {
  private mockLabels: ULLabel[] = [
    {
      id: 1,
      ul_number: 'E123456',
      description: 'Standard Electronics Component Label',
      category: 'Electronics',
      manufacturer: 'Sample Manufacturer A',
      part_number: 'PN-001',
      certification_date: '2024-01-15',
      expiry_date: '2026-01-15',
      label_image_url: null,
      status: 'active',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      created_by: 1
    },
    {
      id: 2,
      ul_number: 'E789012',
      description: 'High Voltage Component Label',
      category: 'Electronics',
      manufacturer: 'Sample Manufacturer B',
      part_number: 'PN-002',
      certification_date: '2024-02-20',
      expiry_date: '2026-02-20',
      label_image_url: null,
      status: 'active',
      created_at: '2024-02-20T10:00:00Z',
      updated_at: '2024-02-20T10:00:00Z',
      created_by: 1
    },
    {
      id: 3,
      ul_number: 'E345678',
      description: 'Wire and Cable Assembly Label',
      category: 'Wiring',
      manufacturer: 'Sample Manufacturer C',
      part_number: 'PN-003',
      certification_date: '2024-03-10',
      expiry_date: '2026-03-10',
      label_image_url: null,
      status: 'active',
      created_at: '2024-03-10T10:00:00Z',
      updated_at: '2024-03-10T10:00:00Z',
      created_by: 1
    },
    {
      id: 4,
      ul_number: 'E901234',
      description: 'Appliance Safety Label',
      category: 'Appliances',
      manufacturer: 'Sample Manufacturer D',
      part_number: 'PN-004',
      certification_date: '2023-06-01',
      expiry_date: '2025-06-01',
      label_image_url: null,
      status: 'active',
      created_at: '2023-06-01T10:00:00Z',
      updated_at: '2023-06-01T10:00:00Z',
      created_by: 1
    },
    {
      id: 5,
      ul_number: 'E567890',
      description: 'Medical Device Component Label',
      category: 'Medical',
      manufacturer: 'Sample Manufacturer E',
      part_number: 'PN-005',
      certification_date: '2024-01-01',
      expiry_date: '2025-12-31',
      label_image_url: null,
      status: 'active',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
      created_by: 1
    },
    {
      id: 6,
      ul_number: 'E111222',
      description: 'Expired Component Label',
      category: 'Electronics',
      manufacturer: 'Sample Manufacturer F',
      part_number: 'PN-006',
      certification_date: '2022-01-01',
      expiry_date: '2024-01-01',
      label_image_url: null,
      status: 'expired',
      created_at: '2022-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
      created_by: 1
    }
  ];

  private mockUsages: ULLabelUsage[] = [
    {
      id: 1,
      ul_label_id: 1,
      ul_number: 'E123456',
      eyefi_serial_number: 'SN-20240820-0001',
      quantity_used: 2,
      date_used: '2024-08-20',
      user_signature: 'JOHN-001',
      user_name: 'John Doe',
      customer_name: 'ABC Electronics Corp',
      notes: 'Production batch #001',
      created_at: '2024-08-20T14:30:00Z',
      updated_at: '2024-08-20T14:30:00Z',
      created_by: 1
    },
    {
      id: 2,
      ul_label_id: 1,
      ul_number: 'E123456',
      eyefi_serial_number: 'SN-20240819-0002',
      quantity_used: 1,
      date_used: '2024-08-19',
      user_signature: 'JANE-002',
      user_name: 'Jane Smith',
      customer_name: 'XYZ Manufacturing',
      notes: 'Quality test unit',
      created_at: '2024-08-19T09:15:00Z',
      updated_at: '2024-08-19T09:15:00Z',
      created_by: 2
    },
    {
      id: 3,
      ul_label_id: 2,
      ul_number: 'E789012',
      eyefi_serial_number: 'SN-20240818-0003',
      quantity_used: 3,
      date_used: '2024-08-18',
      user_signature: 'BOB-003',
      user_name: 'Bob Johnson',
      customer_name: 'DEF Industries',
      notes: 'High voltage testing',
      created_at: '2024-08-18T16:45:00Z',
      updated_at: '2024-08-18T16:45:00Z',
      created_by: 3
    },
    {
      id: 4,
      ul_label_id: 3,
      ul_number: 'E345678',
      eyefi_serial_number: 'SN-20240817-0004',
      quantity_used: 1,
      date_used: '2024-08-17',
      user_signature: 'ALICE-004',
      user_name: 'Alice Brown',
      customer_name: 'GHI Automotive',
      notes: 'Wiring harness assembly',
      created_at: '2024-08-17T11:20:00Z',
      updated_at: '2024-08-17T11:20:00Z',
      created_by: 4
    },
    {
      id: 5,
      ul_label_id: 4,
      ul_number: 'E901234',
      eyefi_serial_number: 'SN-20240816-0005',
      quantity_used: 2,
      date_used: '2024-08-16',
      user_signature: 'MIKE-005',
      user_name: 'Mike Wilson',
      customer_name: 'JKL Appliances',
      notes: 'Safety compliance testing',
      created_at: '2024-08-16T13:10:00Z',
      updated_at: '2024-08-16T13:10:00Z',
      created_by: 5
    }
  ];

  private nextLabelId = 7;
  private nextUsageId = 6;

  // UL Labels CRUD Operations
  getULLabels(): Observable<{ success: boolean; data: ULLabel[]; message: string }> {
    return of({
      success: true,
      data: [...this.mockLabels],
      message: 'UL Labels retrieved successfully'
    }).pipe(delay(500)); // Simulate network delay
  }

  getULLabel(id: number): Observable<{ success: boolean; data: ULLabel; message: string }> {
    const label = this.mockLabels.find(l => l.id === id);
    if (label) {
      return of({
        success: true,
        data: { ...label },
        message: 'UL Label retrieved successfully'
      }).pipe(delay(300));
    } else {
      return throwError(() => ({ success: false, error: 'NOT_FOUND', message: 'UL Label not found' }));
    }
  }

  createULLabel(label: Partial<ULLabel>): Observable<{ success: boolean; data: { id: number }; message: string }> {
    // Check for duplicate UL number
    if (this.mockLabels.some(l => l.ul_number === label.ul_number)) {
      return throwError(() => ({ success: false, error: 'DUPLICATE_ENTRY', message: 'UL Number already exists' }));
    }

    const newLabel: ULLabel = {
      id: this.nextLabelId++,
      ul_number: label.ul_number || '',
      description: label.description || '',
      category: label.category || '',
      manufacturer: label.manufacturer || null,
      part_number: label.part_number || null,
      certification_date: label.certification_date || null,
      expiry_date: label.expiry_date || null,
      label_image_url: label.label_image_url || null,
      status: label.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 1
    };

    this.mockLabels.push(newLabel);

    return of({
      success: true,
      data: { id: newLabel.id },
      message: 'UL Label created successfully'
    }).pipe(delay(800));
  }

  updateULLabel(id: number, label: Partial<ULLabel>): Observable<{ success: boolean; data: { id: number }; message: string }> {
    const index = this.mockLabels.findIndex(l => l.id === id);
    if (index === -1) {
      return throwError(() => ({ success: false, error: 'NOT_FOUND', message: 'UL Label not found' }));
    }

    this.mockLabels[index] = {
      ...this.mockLabels[index],
      ...label,
      id,
      updated_at: new Date().toISOString()
    };

    return of({
      success: true,
      data: { id },
      message: 'UL Label updated successfully'
    }).pipe(delay(600));
  }

  deleteULLabel(id: number): Observable<{ success: boolean; message: string }> {
    const index = this.mockLabels.findIndex(l => l.id === id);
    if (index === -1) {
      return throwError(() => ({ success: false, error: 'NOT_FOUND', message: 'UL Label not found' }));
    }

    this.mockLabels.splice(index, 1);
    // Also remove related usages
    this.mockUsages = this.mockUsages.filter(u => u.ul_label_id !== id);

    return of({
      success: true,
      message: 'UL Label deleted successfully'
    }).pipe(delay(400));
  }

  // Bulk create UL Labels (for range uploads)
  bulkCreateULLabels(labels: Partial<ULLabel>[]): Observable<{ success: boolean; data: { uploaded_count: number; errors: any[] }; message: string }> {
    const errors: any[] = [];
    let uploadedCount = 0;

    labels.forEach((label, index) => {
      try {
        // Check for duplicate UL number
        if (this.mockLabels.some(l => l.ul_number === label.ul_number)) {
          errors.push({
            index: index + 1,
            ul_number: label.ul_number,
            error: 'Duplicate UL number already exists'
          });
          return;
        }

        const newLabel: ULLabel = {
          id: this.nextLabelId++,
          ul_number: label.ul_number || '',
          description: label.description || '',
          category: label.category || '',
          manufacturer: label.manufacturer || null,
          part_number: label.part_number || null,
          certification_date: label.certification_date || null,
          expiry_date: label.expiry_date || null,
          label_image_url: label.label_image_url || null,
          status: label.status || 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 1
        };

        this.mockLabels.push(newLabel);
        uploadedCount++;
      } catch (error) {
        errors.push({
          index: index + 1,
          ul_number: label.ul_number,
          error: 'Failed to create UL label'
        });
      }
    });

    return of({
      success: true,
      data: {
        uploaded_count: uploadedCount,
        errors: errors
      },
      message: `Bulk upload completed. ${uploadedCount} labels uploaded successfully.`
    }).pipe(delay(1000));
  }

  // Bulk upload from file (CSV/Excel)
  bulkUploadULLabels(file: File): Observable<{ success: boolean; data: { uploaded_count: number; errors: any[] }; message: string }> {
    // This is a mock implementation - in real app, you'd parse the file
    return new Observable(subscriber => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          // Simulate file parsing and upload
          const mockUploadResult = {
            uploaded_count: 15,
            errors: [
              { row: 3, error: 'Duplicate UL number' },
              { row: 8, error: 'Invalid category' }
            ]
          };

          setTimeout(() => {
            subscriber.next({
              success: true,
              data: mockUploadResult,
              message: 'File uploaded successfully'
            });
            subscriber.complete();
          }, 2000);
        } catch (error) {
          subscriber.error({
            success: false,
            message: 'Failed to parse file'
          });
        }
      };
      reader.readAsText(file);
    });
  }

  // UL Numbers for autocomplete
  getULNumbers(): Observable<{ success: boolean; data: string[]; message: string }> {
    const ulNumbers = this.mockLabels
      .filter(l => l.status === 'active')
      .map(l => l.ul_number);

    return of({
      success: true,
      data: ulNumbers,
      message: 'UL Numbers retrieved successfully'
    }).pipe(delay(200));
  }

  // Get available UL labels (full objects for ng-select)
  getAvailableULNumbers(): Observable<{ success: boolean; data: ULLabel[]; message: string }> {
    const availableLabels = this.mockLabels
      .filter(l => l.status === 'active')
      .sort((a, b) => a.ul_number.localeCompare(b.ul_number));

    return of({
      success: true,
      data: availableLabels,
      message: `${availableLabels.length} available UL labels retrieved successfully`
    }).pipe(delay(200));
  }

  // UL Number validation
  validateULNumber(ulNumber: string): Observable<{ success: boolean; data: ULLabel; message: string }> {
    const label = this.mockLabels.find(l => l.ul_number === ulNumber);
    if (label) {
      const usageStats = this.calculateUsageStats(label.id);
      const labelWithStats = {
        ...label,
        usage_count: usageStats.usage_count,
        total_quantity_used: usageStats.total_quantity_used,
        last_used_date: usageStats.last_used_date
      };

      return of({
        success: true,
        data: labelWithStats,
        message: 'UL Number is valid and found'
      }).pipe(delay(300));
    } else {
      return throwError(() => ({ success: false, error: 'NOT_FOUND', message: 'UL Number not found' }));
    }
  }

  // Usage CRUD Operations
  getULUsages(): Observable<{ success: boolean; data: ULLabelUsage[]; message: string }> {
    return of({
      success: true,
      data: [...this.mockUsages],
      message: 'Usage records retrieved successfully'
    }).pipe(delay(500));
  }

  createULUsage(usage: Partial<ULLabelUsage>): Observable<{ success: boolean; data: { id: number }; message: string }> {
    // Validate UL label exists and is active
    const label = this.mockLabels.find(l => l.id === usage.ul_label_id);
    if (!label) {
      return throwError(() => ({ success: false, error: 'NOT_FOUND', message: 'UL Label not found' }));
    }
    if (label.status !== 'active') {
      return throwError(() => ({ success: false, error: 'VALIDATION_ERROR', message: 'UL Label is not active' }));
    }

    const newUsage: ULLabelUsage = {
      id: this.nextUsageId++,
      ul_label_id: usage.ul_label_id || 0,
      ul_number: usage.ul_number || '',
      eyefi_serial_number: usage.eyefi_serial_number || '',
      quantity_used: usage.quantity_used || 1,
      date_used: usage.date_used || '',
      user_signature: usage.user_signature || '',
      user_name: usage.user_name || '',
      customer_name: usage.customer_name || '',
      notes: usage.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 1
    };

    this.mockUsages.push(newUsage);

    return of({
      success: true,
      data: { id: newUsage.id },
      message: 'Usage record created successfully'
    }).pipe(delay(800));
  }

  // Bulk upload
  bulkUpload(file: File): Observable<{ success: boolean; data: { uploaded_count: number; errors: any[] }; message: string }> {
    // Simulate bulk upload processing
    return of({
      success: true,
      data: {
        uploaded_count: 5,
        errors: [
          {
            row: 3,
            message: 'UL Number already exists'
          }
        ]
      },
      message: 'Bulk upload completed'
    }).pipe(delay(2000));
  }

  // Search functionality
  searchULLabels(query: string): Observable<{ success: boolean; data: ULLabel[]; message: string }> {
    const filteredLabels = this.mockLabels.filter(label =>
      label.ul_number.toLowerCase().includes(query.toLowerCase()) ||
      label.description.toLowerCase().includes(query.toLowerCase()) ||
      label.category.toLowerCase().includes(query.toLowerCase()) ||
      (label.manufacturer && label.manufacturer.toLowerCase().includes(query.toLowerCase()))
    );

    return of({
      success: true,
      data: filteredLabels,
      message: 'Search results retrieved successfully'
    }).pipe(delay(300));
  }

  // Reports
  getLabelsReport(filters?: any): Observable<{ success: boolean; data: ULLabelReport[]; summary: any; message: string }> {
    const reportData: ULLabelReport[] = this.mockLabels.map(label => {
      const usageStats = this.calculateUsageStats(label.id);
      return {
        ...label,
        total_quantity_used: usageStats.total_quantity_used,
        usage_count: usageStats.usage_count,
        last_used_date: usageStats.last_used_date,
        computed_status: this.computeStatus(label)
      };
    });

    const summary = {
      total_labels: this.mockLabels.length,
      active_labels: this.mockLabels.filter(l => l.status === 'active').length,
      inactive_labels: this.mockLabels.filter(l => l.status === 'inactive').length,
      expired_labels: this.mockLabels.filter(l => l.status === 'expired' || this.isExpired(l)).length,
      expiring_soon_labels: this.mockLabels.filter(l => this.isExpiringSoon(l)).length
    };

    return of({
      success: true,
      data: reportData,
      summary,
      message: 'UL Labels report generated successfully'
    }).pipe(delay(800));
  }

  getUsageReport(filters?: any): Observable<{ success: boolean; data: ULUsageReport[]; summary: any; message: string }> {
    const reportData: ULUsageReport[] = this.mockUsages.map(usage => {
      const label = this.mockLabels.find(l => l.id === usage.ul_label_id);
      return {
        id: usage.id,
        ul_number: usage.ul_number,
        description: label?.description || '',
        eyefi_serial_number: usage.eyefi_serial_number,
        quantity_used: usage.quantity_used,
        date_used: usage.date_used,
        user_name: usage.user_name,
        customer_name: usage.customer_name,
        notes: usage.notes || ''
      };
    });

    const summary = {
      total_usage_records: this.mockUsages.length,
      total_quantity_used: this.mockUsages.reduce((sum, u) => sum + u.quantity_used, 0),
      unique_ul_numbers_used: new Set(this.mockUsages.map(u => u.ul_number)).size,
      unique_customers: new Set(this.mockUsages.map(u => u.customer_name)).size,
      unique_users: new Set(this.mockUsages.map(u => u.user_name)).size,
      unique_serial_numbers: new Set(this.mockUsages.map(u => u.eyefi_serial_number)).size,
      earliest_usage_date: this.mockUsages.reduce((earliest, u) => u.date_used < earliest ? u.date_used : earliest, '9999-12-31'),
      latest_usage_date: this.mockUsages.reduce((latest, u) => u.date_used > latest ? u.date_used : latest, '1900-01-01')
    };

    return of({
      success: true,
      data: reportData,
      summary,
      message: 'Usage report generated successfully'
    }).pipe(delay(800));
  }

  // Dashboard statistics
  getDashboardStats(): Observable<{ success: boolean; data: any; message: string }> {
    const stats = {
      active_labels: this.mockLabels.filter(l => l.status === 'active').length,
      inactive_labels: this.mockLabels.filter(l => l.status === 'inactive').length,
      expired_labels: this.mockLabels.filter(l => l.status === 'expired' || this.isExpired(l)).length,
      expiring_soon_labels: this.mockLabels.filter(l => this.isExpiringSoon(l)).length,
      usage_last_30_days: this.mockUsages.filter(u => this.isWithinDays(u.date_used, 30)).length,
      usage_today: this.mockUsages.filter(u => u.date_used === this.formatDate(new Date())).length,
      usage_last_7_days: this.mockUsages.filter(u => this.isWithinDays(u.date_used, 7)).length,
      active_customers_30_days: new Set(this.mockUsages.filter(u => this.isWithinDays(u.date_used, 30)).map(u => u.customer_name)).size,
      total_quantity_used_30_days: this.mockUsages.filter(u => this.isWithinDays(u.date_used, 30)).reduce((sum, u) => sum + u.quantity_used, 0),
      total_quantity_used_today: this.mockUsages.filter(u => u.date_used === this.formatDate(new Date())).reduce((sum, u) => sum + u.quantity_used, 0),
      total_labels: this.mockLabels.length,
      total_usage_records: this.mockUsages.length
    };

    const recentActivity = this.mockUsages
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map(usage => {
        const label = this.mockLabels.find(l => l.id === usage.ul_label_id);
        return {
          ul_number: usage.ul_number,
          ul_description: label?.description || '',
          customer_name: usage.customer_name,
          user_name: usage.user_name,
          quantity_used: usage.quantity_used,
          date_used: usage.date_used,
          created_at: usage.created_at
        };
      });

    const expiringLabels = this.mockLabels
      .filter(l => this.isExpiringSoon(l))
      .slice(0, 10)
      .map(l => ({
        ul_number: l.ul_number,
        description: l.description,
        category: l.category,
        expiry_date: l.expiry_date,
        days_until_expiry: this.getDaysUntilExpiry(l.expiry_date || '')
      }));

    return of({
      success: true,
      data: {
        stats,
        recent_activity: recentActivity,
        expiring_labels: expiringLabels,
        top_customers: this.getTopCustomers(),
        top_ul_numbers: this.getTopULNumbers(),
        usage_trend: this.getUsageTrend()
      },
      message: 'Dashboard statistics retrieved successfully'
    }).pipe(delay(600));
  }

  // Helper methods
  private calculateUsageStats(labelId: number) {
    const usages = this.mockUsages.filter(u => u.ul_label_id === labelId);
    return {
      usage_count: usages.length,
      total_quantity_used: usages.reduce((sum, u) => sum + u.quantity_used, 0),
      last_used_date: usages.length > 0 ? usages.reduce((latest, u) => u.date_used > latest ? u.date_used : latest, '1900-01-01') : null
    };
  }

  private computeStatus(label: ULLabel): string {
    if (label.expiry_date && this.isExpired(label)) {
      return 'expired';
    }
    if (label.expiry_date && this.isExpiringSoon(label)) {
      return 'expiring_soon';
    }
    return label.status;
  }

  private isExpired(label: ULLabel): boolean {
    if (!label.expiry_date) return false;
    return new Date(label.expiry_date) < new Date();
  }

  private isExpiringSoon(label: ULLabel): boolean {
    if (!label.expiry_date) return false;
    const expiryDate = new Date(label.expiry_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow && expiryDate >= new Date();
  }

  private isWithinDays(dateString: string, days: number): boolean {
    const date = new Date(dateString);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return date >= cutoffDate;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getDaysUntilExpiry(expiryDate: string): number {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private getTopCustomers() {
    const customerUsage = new Map<string, { usage_count: number; total_quantity: number }>();
    
    this.mockUsages.forEach(usage => {
      if (this.isWithinDays(usage.date_used, 30)) {
        const existing = customerUsage.get(usage.customer_name) || { usage_count: 0, total_quantity: 0 };
        customerUsage.set(usage.customer_name, {
          usage_count: existing.usage_count + 1,
          total_quantity: existing.total_quantity + usage.quantity_used
        });
      }
    });

    return Array.from(customerUsage.entries())
      .map(([customer_name, stats]) => ({ customer_name, ...stats }))
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, 5);
  }

  private getTopULNumbers() {
    const ulUsage = new Map<string, { description: string; usage_count: number; total_quantity: number }>();
    
    this.mockUsages.forEach(usage => {
      if (this.isWithinDays(usage.date_used, 30)) {
        const label = this.mockLabels.find(l => l.id === usage.ul_label_id);
        const existing = ulUsage.get(usage.ul_number) || { description: label?.description || '', usage_count: 0, total_quantity: 0 };
        ulUsage.set(usage.ul_number, {
          description: existing.description,
          usage_count: existing.usage_count + 1,
          total_quantity: existing.total_quantity + usage.quantity_used
        });
      }
    });

    return Array.from(ulUsage.entries())
      .map(([ul_number, stats]) => ({ ul_number, ...stats }))
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, 5);
  }

  private getUsageTrend() {
    const trend = new Map<string, { usage_count: number; total_quantity: number }>();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = this.formatDate(date);
      trend.set(dateStr, { usage_count: 0, total_quantity: 0 });
    }

    this.mockUsages.forEach(usage => {
      if (this.isWithinDays(usage.date_used, 6)) {
        const existing = trend.get(usage.date_used) || { usage_count: 0, total_quantity: 0 };
        trend.set(usage.date_used, {
          usage_count: existing.usage_count + 1,
          total_quantity: existing.total_quantity + usage.quantity_used
        });
      }
    });

    return Array.from(trend.entries())
      .map(([usage_date, stats]) => ({ usage_date, ...stats }))
      .sort((a, b) => a.usage_date.localeCompare(b.usage_date));
  }
}
