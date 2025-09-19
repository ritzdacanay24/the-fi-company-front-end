import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { TrainingTemplate, TrainingTemplateCategory } from '../models/training.model';

@Injectable({
  providedIn: 'root'
})
export class TrainingTemplateService {
  private apiUrl = 'training';

  constructor(private http: HttpClient) {}

  // Transform API response from snake_case to camelCase
  private transformTemplate(apiTemplate: any): TrainingTemplate {
    return {
      id: parseInt(apiTemplate.id),
      name: apiTemplate.name,
      titleTemplate: apiTemplate.title_template,
      descriptionTemplate: apiTemplate.description_template,
      purposeTemplate: apiTemplate.purpose_template,
      defaultDurationMinutes: parseInt(apiTemplate.default_duration_minutes),
      defaultLocation: apiTemplate.default_location,
      categoryId: parseInt(apiTemplate.category_id),
      isActive: apiTemplate.is_active === '1' || apiTemplate.is_active === true,
      createdBy: parseInt(apiTemplate.created_by),
      createdDate: apiTemplate.created_date,
      category: apiTemplate.category_name
    };
  }

  // Transform template for API request from camelCase to snake_case
  private transformTemplateForApi(template: TrainingTemplate): any {
    return {
      name: template.name,
      title_template: template.titleTemplate,
      description_template: template.descriptionTemplate,
      purpose_template: template.purposeTemplate,
      default_duration_minutes: template.defaultDurationMinutes,
      default_location: template.defaultLocation,
      category_id: template.categoryId,
      is_active: template.isActive ? 1 : 0,
      created_by: template.createdBy
    };
  }

  getTemplates(): Observable<TrainingTemplate[]> {
    return this.http.get<any[]>(`${this.apiUrl}/index.php?path=templates`).pipe(
      map(apiTemplates => apiTemplates.map(apiTemplate => this.transformTemplate(apiTemplate)))
    );
  }

  getActiveTemplates(): Observable<TrainingTemplate[]> {
    return this.http.get<any[]>(`${this.apiUrl}/index.php?path=templates&active=true`).pipe(
      map(apiTemplates => apiTemplates.map(apiTemplate => this.transformTemplate(apiTemplate)))
    );
  }

  getTemplate(id: number): Observable<TrainingTemplate> {
    console.log('Service: Getting template with ID:', id);
    return this.http.get<any>(`${this.apiUrl}/index.php?path=templates&id=${id}`).pipe(
      map(response => {
        console.log('Service: Raw API response for getTemplate:', response);
        
        // Handle case where API returns an array with one item
        if (Array.isArray(response) && response.length > 0) {
          console.log('Service: Response is array, taking first item');
          return this.transformTemplate(response[0]);
        }
        
        // Handle case where API returns a single object
        if (response && !Array.isArray(response)) {
          console.log('Service: Response is single object');
          return this.transformTemplate(response);
        }
        
        // If no data found, throw error
        throw new Error('Template not found');
      })
    );
  }

  createTemplate(template: TrainingTemplate): Observable<TrainingTemplate> {
    const apiTemplate = this.transformTemplateForApi(template);
    return this.http.post<any>(`${this.apiUrl}/index.php?path=templates`, apiTemplate).pipe(
      map(response => this.transformTemplate(response))
    );
  }

  updateTemplate(id: string | number, template: TrainingTemplate): Observable<TrainingTemplate> {
    const apiTemplate = this.transformTemplateForApi(template);
    return this.http.put<any>(`${this.apiUrl}/index.php?path=templates&id=${id}`, apiTemplate).pipe(
      map(response => this.transformTemplate(response))
    );
  }

  deleteTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/index.php?path=templates&id=${id}`);
  }

  getCategories(): Observable<TrainingTemplateCategory[]> {
    return this.http.get<TrainingTemplateCategory[]>(`${this.apiUrl}/index.php?path=templates/categories`);
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