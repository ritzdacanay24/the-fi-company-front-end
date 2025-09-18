import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TrainingTemplate, TrainingTemplateCategory } from '../../models/training.model';
import { TrainingTemplateService } from '../../services/training-template.service';

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './template-list.component.html',
  styleUrl: './template-list.component.scss'
})
export class TemplateListComponent implements OnInit {
  templates: TrainingTemplate[] = [];
  filteredTemplates: TrainingTemplate[] = [];
  categories: TrainingTemplateCategory[] = [];
  
  isLoading = false;
  searchTerm = '';
  selectedCategory = 'all';
  showActiveOnly = true;
  
  constructor(
    private templateService: TrainingTemplateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTemplates();
    this.loadCategories();
  }

  loadTemplates(): void {
    this.isLoading = true;
    this.templateService.getTemplates().subscribe({
      next: (templates) => {
        this.templates = templates;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading templates:', error);
        this.isLoading = false;
      }
    });
  }

  loadCategories(): void {
    this.templateService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  applyFilters(): void {
    let filtered = this.templates;

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(term) ||
        (template.descriptionTemplate && template.descriptionTemplate.toLowerCase().includes(term)) ||
        (template.purposeTemplate && template.purposeTemplate.toLowerCase().includes(term))
      );
    }

    // Filter by category
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.categoryId?.toString() === this.selectedCategory);
    }

    // Filter by active status
    if (this.showActiveOnly) {
      filtered = filtered.filter(template => template.isActive);
    }

    this.filteredTemplates = filtered;
  }

  onSearch(): void {
    this.applyFilters();
  }

  onCategoryChange(): void {
    this.applyFilters();
  }

  onActiveFilterChange(): void {
    this.applyFilters();
  }

  createNewTemplate(): void {
    this.router.navigate(['/training/templates/create']);
  }

  editTemplate(template: TrainingTemplate): void {
    this.router.navigate(['/training/templates/edit', template.id]);
  }

  duplicateTemplate(template: TrainingTemplate): void {
    const duplicatedTemplate: TrainingTemplate = {
      ...template,
      id: undefined,
      name: `${template.name} (Copy)`,
      createdDate: new Date().toISOString()
    };

    this.templateService.createTemplate(duplicatedTemplate).subscribe({
      next: (newTemplate) => {
        this.loadTemplates();
      },
      error: (error) => {
        console.error('Error duplicating template:', error);
      }
    });
  }

  toggleTemplateStatus(template: TrainingTemplate): void {
    const updatedTemplate = { ...template, isActive: !template.isActive };
    
    this.templateService.updateTemplate(template.id!, updatedTemplate).subscribe({
      next: () => {
        this.loadTemplates();
      },
      error: (error) => {
        console.error('Error updating template status:', error);
      }
    });
  }

  deleteTemplate(template: TrainingTemplate): void {
    if (confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
      this.templateService.deleteTemplate(template.id!).subscribe({
        next: () => {
          this.loadTemplates();
        },
        error: (error) => {
          console.error('Error deleting template:', error);
        }
      });
    }
  }

  useTemplate(template: TrainingTemplate): void {
    // Navigate to training setup with template ID as query parameter
    this.router.navigate(['/training/setup'], { 
      queryParams: { templateId: template.id } 
    });
  }

  getCategoryColor(categoryName: string): string {
    const category = this.categories.find(c => c.name === categoryName);
    return category?.color || '#007bff';
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}min`;
  }

  getPopularityBadge(usageCount: number): string {
    if (usageCount >= 20) return 'very-popular';
    if (usageCount >= 10) return 'popular';
    if (usageCount >= 5) return 'moderate';
    return 'new';
  }

  getPopularityLabel(usageCount: number): string {
    if (usageCount >= 20) return 'Very Popular';
    if (usageCount >= 10) return 'Popular';
    if (usageCount >= 5) return 'Moderate Use';
    return 'New';
  }
}