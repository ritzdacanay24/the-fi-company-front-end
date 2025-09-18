import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrainingTemplateService } from '../../services/training-template.service';
import { TrainingTemplate, TrainingTemplateCategory } from '../../models/training.model';

@Component({
  selector: 'app-template-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './template-form.component.html',
  styleUrls: ['./template-form.component.scss']
})
export class TemplateFormComponent implements OnInit {
  templateForm!: FormGroup;
  categories: TrainingTemplateCategory[] = [];
  isEditMode = false;
  templateId: string | null = null;
  isLoading = false;
  isSaving = false;
  
  // Available options
  durationOptions = [
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
    { value: 180, label: '3 hours' },
    { value: 240, label: '4 hours' },
    { value: 480, label: '8 hours (Full day)' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private templateService: TrainingTemplateService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadCategories();
    this.checkEditMode();
  }

  private initializeForm(): void {
    this.templateForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      titleTemplate: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      descriptionTemplate: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      purposeTemplate: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(300)]],
      categoryId: ['', Validators.required],
      defaultDurationMinutes: [60, [Validators.required, Validators.min(15)]],
      defaultLocation: [''],
      isActive: [true]
    });
  }

  private loadCategories(): void {
    this.templateService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  private checkEditMode(): void {
    this.templateId = this.route.snapshot.paramMap.get('id');
    if (this.templateId) {
      this.isEditMode = true;
      this.loadTemplate();
    }
  }

  private loadTemplate(): void {
    if (!this.templateId) return;
    
    this.isLoading = true;
    const numericId = parseInt(this.templateId);
    this.templateService.getTemplate(numericId).subscribe({
      next: (template) => {
        this.populateForm(template);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading template:', error);
        this.isLoading = false;
        this.router.navigate(['/training/templates']);
      }
    });
  }

  private populateForm(template: TrainingTemplate): void {
    this.templateForm.patchValue({
      name: template.name,
      titleTemplate: template.titleTemplate,
      descriptionTemplate: template.descriptionTemplate,
      purposeTemplate: template.purposeTemplate,
      categoryId: template.categoryId,
      defaultDurationMinutes: template.defaultDurationMinutes,
      defaultLocation: template.defaultLocation,
      isActive: template.isActive
    });
  }

  onSubmit(): void {
    if (this.templateForm.valid) {
      this.isSaving = true;
      const formValue = this.templateForm.value;
      
      const templateData: Partial<TrainingTemplate> = {
        name: formValue.name,
        titleTemplate: formValue.titleTemplate,
        descriptionTemplate: formValue.descriptionTemplate,
        purposeTemplate: formValue.purposeTemplate,
        categoryId: formValue.categoryId,
        defaultDurationMinutes: formValue.defaultDurationMinutes,
        defaultLocation: formValue.defaultLocation,
        isActive: formValue.isActive
      };

      if (this.isEditMode && this.templateId) {
        templateData.id = parseInt(this.templateId);
        this.templateService.updateTemplate(this.templateId, templateData as TrainingTemplate).subscribe({
          next: () => {
            this.isSaving = false;
            this.router.navigate(['/training/templates']);
          },
          error: (error) => {
            console.error('Error updating template:', error);
            this.isSaving = false;
          }
        });
      } else {
        this.templateService.createTemplate(templateData as TrainingTemplate).subscribe({
          next: () => {
            this.isSaving = false;
            this.router.navigate(['/training/templates']);
          },
          error: (error) => {
            console.error('Error creating template:', error);
            this.isSaving = false;
          }
        });
      }
    }
  }

  onCancel(): void {
    this.router.navigate(['/training/templates']);
  }

  // Utility Methods
  isFieldInvalid(fieldName: string): boolean {
    const field = this.templateForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.templateForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
      if (field.errors['minlength']) return `${this.getFieldLabel(fieldName)} is too short`;
      if (field.errors['maxlength']) return `${this.getFieldLabel(fieldName)} is too long`;
      if (field.errors['min']) return `${this.getFieldLabel(fieldName)} must be greater than ${field.errors['min'].min}`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      name: 'Template Name',
      titleTemplate: 'Title Template',
      descriptionTemplate: 'Description Template',
      purposeTemplate: 'Purpose Template',
      categoryId: 'Category',
      defaultDurationMinutes: 'Duration',
      defaultLocation: 'Location'
    };
    return labels[fieldName] || fieldName;
  }
}