import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { TrainingTemplate, TrainingTemplateCategory } from '../models/training.model';

@Injectable({
  providedIn: 'root'
})
export class TrainingTemplateService {
  private apiUrl = '/api/training/templates';

  constructor(private http: HttpClient) {}

  getTemplates(): Observable<TrainingTemplate[]> {
    // For now, return mock data - replace with actual API call
    return of(this.getMockTemplates());
  }

  getActiveTemplates(): Observable<TrainingTemplate[]> {
    // Return only active templates
    const allTemplates = this.getMockTemplates();
    const activeTemplates = allTemplates.filter(template => template.isActive);
    return of(activeTemplates);
  }

  getTemplate(id: number): Observable<TrainingTemplate> {
    // return this.http.get<TrainingTemplate>(`${this.apiUrl}/${id}`);
    const templates = this.getMockTemplates();
    const template = templates.find(t => t.id === id);
    return of(template!);
  }

  createTemplate(template: TrainingTemplate): Observable<TrainingTemplate> {
    // return this.http.post<TrainingTemplate>(this.apiUrl, template);
    const newTemplate = {
      ...template,
      id: Math.floor(Math.random() * 1000) + 100,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      usageCount: 0
    };
    return of(newTemplate);
  }

  updateTemplate(id: string | number, template: TrainingTemplate): Observable<TrainingTemplate> {
    // return this.http.put<TrainingTemplate>(`${this.apiUrl}/${id}`, template);
    return of({
      ...template,
      id: typeof id === 'string' ? parseInt(id) : id,
      updatedDate: new Date().toISOString()
    });
  }

  deleteTemplate(id: number): Observable<void> {
    // return this.http.delete<void>(`${this.apiUrl}/${id}`);
    return of(void 0);
  }

  getCategories(): Observable<TrainingTemplateCategory[]> {
    // For now, return mock data - replace with actual API call
    return of(this.getMockCategories());
  }

  private getMockTemplates(): TrainingTemplate[] {
    return [
      {
        id: 1,
        name: 'Forklift Safety Training',
        titleTemplate: 'Forklift Safety Training - {{date}}',
        descriptionTemplate: 'Comprehensive forklift operation and safety training including pre-operation inspection, safe driving practices, and OSHA compliance requirements.',
        purposeTemplate: 'Safety compliance and certification for forklift operators',
        defaultDurationMinutes: 120,
        defaultLocation: 'Training Room A',
        categoryId: 1,
        isActive: true,
        createdBy: 1,
        createdDate: '2024-01-15T10:00:00Z',
        category: 'Safety'
      },
      {
        id: 2,
        name: 'Workplace Safety Orientation',
        titleTemplate: 'Workplace Safety Orientation - {{department}}',
        descriptionTemplate: 'General workplace safety training covering hazard identification, emergency procedures, and personal protective equipment usage.',
        purposeTemplate: 'Safety awareness and accident prevention for new employees',
        defaultDurationMinutes: 90,
        defaultLocation: 'Main Conference Room',
        categoryId: 1,
        isActive: true,
        createdBy: 1,
        createdDate: '2024-01-10T09:00:00Z',
        category: 'Safety'
      },
      {
        id: 3,
        name: 'Quality Management Training',
        titleTemplate: 'Quality Management Training - {{process}}',
        descriptionTemplate: 'Training on quality management systems, inspection procedures, and continuous improvement processes.',
        purposeTemplate: 'Quality standards and procedures compliance',
        defaultDurationMinutes: 180,
        defaultLocation: 'Quality Lab',
        categoryId: 2,
        isActive: true,
        createdBy: 1,
        createdDate: '2024-01-12T14:00:00Z',
        category: 'Quality'
      }
    ];
  }

  private getMockCategories(): TrainingTemplateCategory[] {
    return [
      { id: 1, name: 'Safety', description: 'Safety and compliance training', color: '#dc3545', isActive: true },
      { id: 2, name: 'Quality', description: 'Quality management and procedures', color: '#28a745', isActive: true },
      { id: 3, name: 'Technical', description: 'Technical skills and procedures', color: '#007bff', isActive: true },
      { id: 4, name: 'Onboarding', description: 'New employee orientation', color: '#6f42c1', isActive: true },
      { id: 5, name: 'Soft Skills', description: 'Communication and interpersonal skills', color: '#fd7e14', isActive: true },
      { id: 6, name: 'Compliance', description: 'Regulatory and legal compliance', color: '#6c757d', isActive: true }
    ];
  }
}