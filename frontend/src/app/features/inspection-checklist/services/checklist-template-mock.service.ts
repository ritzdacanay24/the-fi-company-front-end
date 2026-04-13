import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { ChecklistTemplate, ChecklistInstance, ChecklistInstanceItem, InspectionPhoto, ChecklistItem, ChecklistTemplateAnalytics } from '../models/checklist-template.interface';

@Injectable({
  providedIn: 'root'
})
export class ChecklistTemplateMockService {
  
  private mockTemplates: ChecklistTemplate[] = [
    {
      id: 'quality-photo-inspection',
      name: 'Quality Photo Inspection',
      description: 'Comprehensive quality control inspection with mandatory photo documentation',
      type: 'quality',
      category: 'quality',
      version: '1.2',
      status: 'active',
      createdDate: '2025-09-01T08:00:00Z',
      estimatedTime: 45,
      items: [
        {
          id: 'qa-product-appearance',
          title: 'Product Appearance Inspection',
          description: 'Verify product appearance meets quality standards with detailed photo documentation',
          type: 'photo',
          required: true,
          samplePhotoUrl: '/assets/samples/product-front-good.jpg',
          minQualityScore: 75,
          requiresSampleMatch: true
        },
        {
          id: 'qa-packaging-integrity',
          title: 'Packaging Integrity Check',
          description: 'Verify packaging is intact and properly sealed',
          type: 'check',
          required: true
        },
        {
          id: 'qa-dimensions',
          title: 'Dimension Measurement',
          description: 'Measure product dimensions',
          type: 'measure',
          required: true,
          unit: 'mm',
          minValue: 100,
          maxValue: 110,
          targetValue: 105
        }
      ]
    },
    {
      id: 'safety-equipment-check',
      name: 'Safety Equipment Inspection',
      description: 'Monthly safety equipment inspection and verification',
      type: 'safety',
      category: 'safety',
      version: '2.0',
      status: 'active',
      createdDate: '2025-09-01T09:00:00Z',
      estimatedTime: 30,
      items: [
        {
          id: 'safety-fire-extinguisher',
          title: 'Fire Extinguisher Check',
          description: 'Verify fire extinguisher is properly maintained',
          type: 'check',
          required: true
        },
        {
          id: 'safety-emergency-exits',
          title: 'Emergency Exit Verification',
          description: 'Ensure emergency exits are clear and accessible',
          type: 'photo',
          required: true,
          samplePhotoUrl: '/assets/samples/emergency-exit-clear.jpg'
        }
      ]
    }
  ];

  private mockInstances: ChecklistInstance[] = [
    {
      id: 'inst-001',
      templateId: 'quality-photo-inspection',
      template: this.mockTemplates[0], // Reference to full template
      status: 'completed',
      assignedTo: 'inspector1@company.com',
      startedDate: '2025-09-16T08:00:00Z',
      completedDate: '2025-09-16T08:45:00Z',
      submittedDate: '2025-09-16T08:47:00Z',
      location: 'Production Line A',
      workOrderId: 'WO-2025-0001',
      notes: 'All items passed inspection.',
      items: [
        {
          id: 'inst-item-001',
          templateItemId: 'qa-product-appearance',
          title: 'Product Appearance Inspection',
          description: 'Verify product appearance meets quality standards',
          completed: true,
          status: 'completed',
          value: 'true',
          notes: 'Product appearance meets all quality standards.',
          completedDate: '2025-09-16T08:15:00Z',
          photos: [
            {
              id: 'photo-001',
              url: '/assets/captured/product-front-001.jpg',
              filename: 'product-front-001.jpg',
              fileName: 'product-front-001.jpg',
              uploadDate: '2025-09-16T08:15:00Z',
              fileSize: 524288,
              mimeType: 'image/jpeg',
              qualityScore: 85,
              matchesSample: true
            }
          ]
        },
        {
          id: 'inst-item-002',
          templateItemId: 'qa-packaging-integrity',
          title: 'Packaging Integrity Check',
          description: 'Verify packaging is intact and properly sealed',
          completed: true,
          status: 'completed',
          value: 'true',
          notes: 'Packaging is intact.',
          completedDate: '2025-09-16T08:25:00Z'
        },
        {
          id: 'inst-item-003',
          templateItemId: 'qa-dimensions',
          title: 'Dimension Measurement',
          description: 'Measure product dimensions',
          completed: true,
          status: 'completed',
          value: '105.2',
          notes: 'Dimensions within tolerance.',
          completedDate: '2025-09-16T08:35:00Z'
        }
      ]
    },
    {
      id: 'inst-002',
      templateId: 'quality-photo-inspection',
      template: this.mockTemplates[0],
      status: 'in-progress',
      assignedTo: 'inspector2@company.com',
      startedDate: '2025-09-16T10:00:00Z',
      location: 'Production Line B',
      workOrderId: 'WO-2025-0002',
      items: [
        {
          id: 'inst-item-004',
          templateItemId: 'qa-product-appearance',
          title: 'Product Appearance Inspection',
          description: 'Verify product appearance meets quality standards',
          completed: false,
          status: 'pending'
        },
        {
          id: 'inst-item-005',
          templateItemId: 'qa-packaging-integrity',
          title: 'Packaging Integrity Check',
          description: 'Verify packaging is intact and properly sealed',
          completed: false,
          status: 'pending'
        },
        {
          id: 'inst-item-006',
          templateItemId: 'qa-dimensions',
          title: 'Dimension Measurement',
          description: 'Measure product dimensions',
          completed: false,
          status: 'pending'
        }
      ]
    }
  ];

  private nextTemplateId = 1000;
  private nextInstanceId = 2000;

  // Template CRUD operations
  getAllTemplates(): Observable<ChecklistTemplate[]> {
    return of([...this.mockTemplates]).pipe(delay(300));
  }

  getActiveTemplates(): Observable<ChecklistTemplate[]> {
    return of(this.mockTemplates.filter(t => t.status === 'active')).pipe(delay(300));
  }

  getTemplateById(id: string): Observable<ChecklistTemplate | null> {
    const template = this.mockTemplates.find(t => t.id === id);
    return of(template || null).pipe(delay(200));
  }

  getTemplate(id: string): Observable<ChecklistTemplate | null> {
    return this.getTemplateById(id);
  }

  getTemplatesByCategory(category: string): Observable<ChecklistTemplate[]> {
    return of(this.mockTemplates.filter(t => t.category === category)).pipe(delay(300));
  }

  getTemplatesByType(type: string): Observable<ChecklistTemplate[]> {
    return of(this.mockTemplates.filter(t => t.type === type)).pipe(delay(300));
  }

  createTemplate(template: Omit<ChecklistTemplate, 'id' | 'createdDate'>): Observable<ChecklistTemplate> {
    const newTemplate: ChecklistTemplate = {
      ...template,
      id: `template_${this.nextTemplateId++}`,
      createdDate: new Date().toISOString()
    };
    
    this.mockTemplates.push(newTemplate);
    return of(newTemplate).pipe(delay(500));
  }

  updateTemplate(id: string, template: Partial<ChecklistTemplate>): Observable<ChecklistTemplate | null> {
    const index = this.mockTemplates.findIndex(t => t.id === id);
    if (index === -1) {
      return of(null);
    }
    
    this.mockTemplates[index] = { 
      ...this.mockTemplates[index], 
      ...template,
      updatedDate: new Date().toISOString()
    };
    
    return of(this.mockTemplates[index]).pipe(delay(400));
  }

  deleteTemplate(id: string): Observable<boolean> {
    const index = this.mockTemplates.findIndex(t => t.id === id);
    if (index === -1) {
      return of(false);
    }
    
    this.mockTemplates.splice(index, 1);
    return of(true).pipe(delay(300));
  }

  duplicateTemplate(templateId: string, newName: string): Observable<ChecklistTemplate> {
    const template = this.mockTemplates.find(t => t.id === templateId);
    if (!template) {
      return of(null as any);
    }

    const duplicatedTemplate: ChecklistTemplate = {
      ...template,
      id: `template_${this.nextTemplateId++}`,
      name: newName,
      createdDate: new Date().toISOString(),
      updatedDate: undefined
    };

    this.mockTemplates.push(duplicatedTemplate);
    return of(duplicatedTemplate).pipe(delay(300));
  }

  // Instance operations
  createInstance(data: any): Observable<ChecklistInstance | null> {
    const template = this.mockTemplates.find(t => t.id === data.templateId);
    if (!template) {
      return of(null);
    }

    const newInstance: ChecklistInstance = {
      id: `instance_${this.nextInstanceId++}`,
      templateId: template.id,
      template: template,
      status: 'draft',
      assignedTo: data.assignedTo,
      startedDate: new Date().toISOString(),
      location: data.location,
      workOrderId: data.workOrderId,
      notes: data.notes,
      items: template.items.map(templateItem => ({
        id: `item_${Math.random().toString(36).substr(2, 9)}`,
        templateItemId: templateItem.id,
        title: templateItem.title,
        description: templateItem.description,
        completed: false,
        status: 'pending' as const
      }))
    };

    this.mockInstances.push(newInstance);
    return of(newInstance).pipe(delay(400));
  }

  getInstance(id: string): Observable<ChecklistInstance | null> {
    const instance = this.mockInstances.find(i => i.id === id);
    return of(instance || null).pipe(delay(200));
  }

  getAllInstances(): Observable<ChecklistInstance[]> {
    return of([...this.mockInstances]).pipe(delay(300));
  }

  updateInstance(id: string, updates: Partial<ChecklistInstance>): Observable<ChecklistInstance | null> {
    const index = this.mockInstances.findIndex(i => i.id === id);
    if (index === -1) {
      return of(null);
    }
    
    this.mockInstances[index] = { ...this.mockInstances[index], ...updates };
    return of(this.mockInstances[index]).pipe(delay(300));
  }

  updateInstanceItem(instanceId: string, itemId: string, updates: Partial<ChecklistInstanceItem>): Observable<ChecklistInstanceItem> {
    const instance = this.mockInstances.find(i => i.id === instanceId);
    if (!instance) {
      return of(null as any);
    }

    const itemIndex = instance.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return of(null as any);
    }

    instance.items[itemIndex] = { ...instance.items[itemIndex], ...updates };
    return of(instance.items[itemIndex]).pipe(delay(200));
  }

  completeInstanceItem(instanceId: string, itemId: string, notes?: string): Observable<ChecklistInstanceItem> {
    const instance = this.mockInstances.find(i => i.id === instanceId);
    if (!instance) {
      return of(null as any);
    }

    const item = instance.items.find(i => i.id === itemId);
    if (!item) {
      return of(null as any);
    }

    item.completed = true;
    item.status = 'completed';
    item.completedDate = new Date().toISOString();
    if (notes) {
      item.notes = notes;
    }

    return of(item).pipe(delay(200));
  }

  skipInstanceItem(instanceId: string, itemId: string, reason: string): Observable<ChecklistInstanceItem> {
    const instance = this.mockInstances.find(i => i.id === instanceId);
    if (!instance) {
      return of(null as any);
    }

    const item = instance.items.find(i => i.id === itemId);
    if (!item) {
      return of(null as any);
    }

    item.completed = false;
    item.status = 'skipped';
    item.skipped = true;
    item.skipReason = reason;
    item.completedDate = new Date().toISOString();

    return of(item).pipe(delay(200));
  }

  submitInstance(instanceId: string, signature?: string): Observable<ChecklistInstance> {
    const instance = this.mockInstances.find(i => i.id === instanceId);
    if (!instance) {
      return of(null as any);
    }

    instance.status = 'submitted';
    instance.submittedDate = new Date().toISOString();
    if (signature) {
      instance.signature = signature;
    }

    return of(instance).pipe(delay(500));
  }

  getInstancesByUser(userId: string): Observable<ChecklistInstance[]> {
    return of(this.mockInstances.filter(i => i.assignedTo === userId)).pipe(delay(300));
  }

  getInstancesByStatus(status: ChecklistInstance['status']): Observable<ChecklistInstance[]> {
    return of(this.mockInstances.filter(i => i.status === status)).pipe(delay(300));
  }

  // Photo operations
  uploadPhoto(instanceId: string, itemId: string, file: File): Observable<InspectionPhoto | null> {
    const newPhoto: InspectionPhoto = {
      id: `photo_${Math.random().toString(36).substr(2, 9)}`,
      url: URL.createObjectURL(file), // Mock URL for preview
      filename: file.name,
      fileName: file.name,
      uploadDate: new Date().toISOString(),
      fileSize: file.size,
      mimeType: file.type,
      qualityScore: Math.floor(Math.random() * 30) + 70, // Random score 70-100
      matchesSample: Math.random() > 0.3 // 70% chance of matching sample
    };

    // Find instance and item to add photo
    const instance = this.mockInstances.find(i => i.id === instanceId);
    if (instance) {
      const item = instance.items.find(i => i.id === itemId);
      if (item) {
        if (!item.photos) {
          item.photos = [];
        }
        item.photos.push(newPhoto);
      }
    }

    return of(newPhoto).pipe(delay(1000)); // Simulate upload time
  }

  deletePhoto(instanceId: string, itemId: string, photoId: string): Observable<boolean> {
    const instance = this.mockInstances.find(i => i.id === instanceId);
    if (!instance) {
      return of(false);
    }

    const item = instance.items.find(i => i.id === itemId);
    if (!item || !item.photos) {
      return of(false);
    }

    const photoIndex = item.photos.findIndex(p => p.id === photoId);
    if (photoIndex === -1) {
      return of(false);
    }

    item.photos.splice(photoIndex, 1);
    return of(true).pipe(delay(200));
  }

  // Analytics
  getAnalytics(): Observable<ChecklistTemplateAnalytics> {
    const analytics: ChecklistTemplateAnalytics = {
      totalTemplates: this.mockTemplates.length,
      activeTemplates: this.mockTemplates.filter(t => t.status === 'active').length,
      totalInstances: this.mockInstances.length,
      completedInstances: this.mockInstances.filter(i => i.status === 'completed').length,
      averageCompletionTime: 42,
      templateUsage: this.mockTemplates.map(template => ({
        templateId: template.id,
        templateName: template.name,
        usageCount: this.mockInstances.filter(i => i.templateId === template.id).length,
        averageTime: Math.floor(Math.random() * 30) + 20
      }))
    };

    return of(analytics).pipe(delay(400));
  }

  getTemplateUsageStats(): Observable<any> {
    return this.getAnalytics();
  }

  private generateId(): string {
    return 'mock_' + Math.random().toString(36).substr(2, 9);
  }
}