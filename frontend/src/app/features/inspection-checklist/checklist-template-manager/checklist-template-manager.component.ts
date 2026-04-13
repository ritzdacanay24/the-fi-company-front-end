import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ChecklistTemplate, ChecklistItem, CHECKLIST_CATEGORIES, TEMPLATE_TYPES } from '../models/checklist-template.interface';

@Component({
  selector: 'app-checklist-template-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './checklist-template-manager.component.html',
  styleUrl: './checklist-template-manager.component.scss'
})
export class ChecklistTemplateManagerComponent implements OnInit {
  templates: ChecklistTemplate[] = [];
  filteredTemplates: ChecklistTemplate[] = [];
  selectedTemplate: ChecklistTemplate | null = null;
  selectedCategory = '';
  selectedType = '';
  selectedStatus = '';
  searchTerm = '';
  isEditing = false;
  isCreating = false;
  isLoading = false;
  showTemplateForm = false;
  
  templateForm: FormGroup;
  categories = Object.entries(CHECKLIST_CATEGORIES);
  templateTypes = Object.entries(TEMPLATE_TYPES);
  
  constructor(private fb: FormBuilder) {
    this.templateForm = this.createTemplateForm();
  }

  ngOnInit() {
    this.loadTemplates();
  }

  createTemplateForm(): FormGroup {
    return this.fb.group({
      id: [''],
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      type: ['general', Validators.required],
      category: ['general', Validators.required],
      version: ['1.0', Validators.required],
      status: ['active'],
      estimatedTime: [30],
      items: this.fb.array([])
    });
  }

  get itemsFormArray(): FormArray {
    return this.templateForm.get('items') as FormArray;
  }

  createItemForm(item?: ChecklistItem): FormGroup {
    return this.fb.group({
      id: [item?.id || this.generateId()],
      title: [item?.title || '', [Validators.required]],
      description: [item?.description || ''],
      type: [item?.type || 'check', [Validators.required]],
      required: [item?.required !== false], // Default to true
      samplePhotoUrl: [item?.samplePhotoUrl || ''],
      minQualityScore: [item?.minQualityScore || 70],
      requiresSampleMatch: [item?.requiresSampleMatch || false],
      unit: [item?.unit || ''],
      minValue: [item?.minValue || null],
      maxValue: [item?.maxValue || null],
      targetValue: [item?.targetValue || null]
    });
  }

  loadTemplates() {
    // Mock data - replace with actual service call
    this.templates = [
      {
        id: 'quality-photo-template',
        name: 'Quality Photo Inspection',
        description: 'Comprehensive quality control with photo verification',
        type: 'quality',
        category: 'quality',
        version: '1.0',
        status: 'active',
        createdDate: new Date().toISOString(),
        estimatedTime: 45,
        items: [
          {
            id: 'item-1',
            title: 'Product Appearance Check',
            description: 'Verify product matches quality standards',
            type: 'photo',
            required: true,
            samplePhotoUrl: '/assets/samples/product-front.jpg',
            minQualityScore: 75,
            requiresSampleMatch: true
          },
          {
            id: 'item-2',
            title: 'Packaging Integrity',
            description: 'Verify packaging is intact and properly sealed',
            type: 'check',
            required: true
          },
          {
            id: 'item-3',
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
      }
    ];
    this.filterTemplates();
  }

  selectTemplate(template: ChecklistTemplate) {
    this.selectedTemplate = template;
    this.populateForm(template);
    this.isEditing = false;
    this.isCreating = false;
  }

  createNewTemplate() {
    this.selectedTemplate = null;
    this.templateForm.reset();
    this.templateForm = this.createTemplateForm();
    this.addItem(); // Add one default item
    this.isCreating = true;
    this.isEditing = true;
    this.showTemplateForm = true;
  }

  editTemplate(template?: ChecklistTemplate) {
    if (template) {
      this.selectedTemplate = template;
      this.populateForm(template);
    }
    this.isEditing = true;
    this.isCreating = false;
    this.showTemplateForm = true;
  }

  populateForm(template: ChecklistTemplate) {
    // Clear existing items
    while (this.itemsFormArray.length !== 0) {
      this.itemsFormArray.removeAt(0);
    }

    // Populate basic fields
    this.templateForm.patchValue({
      id: template.id,
      name: template.name,
      description: template.description,
      type: template.type,
      category: template.category,
      version: template.version,
      status: template.status,
      estimatedTime: template.estimatedTime
    });

    // Add items
    template.items.forEach(item => {
      this.itemsFormArray.push(this.createItemForm(item));
    });
  }

  addItem() {
    const newItem: ChecklistItem = {
      id: this.generateId(),
      title: '',
      description: '',
      type: 'check',
      required: true
    };
    this.itemsFormArray.push(this.createItemForm(newItem));
  }

  removeItem(index: number) {
    if (this.itemsFormArray.length > 1) {
      this.itemsFormArray.removeAt(index);
      this.updateItemOrders();
    }
  }

  moveItem(index: number, direction: 'up' | 'down') {
    const items = this.itemsFormArray;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < items.length) {
      const item = items.at(index);
      items.removeAt(index);
      items.insert(newIndex, item);
      this.updateItemOrders();
    }
  }

  updateItemOrders() {
    this.itemsFormArray.controls.forEach((control, index) => {
      control.patchValue({ order: index + 1 });
    });
  }

  onPhotoRequiredToggle(index: number) {
    const item = this.itemsFormArray.at(index);
    const requiresPhoto = item.get('requiresPhoto')?.value;
    
    if (!requiresPhoto) {
      // Reset photo-related fields when photo is not required
      item.patchValue({
        photoCount: 1,
        samplePhotos: [],
        photoInstructions: ''
      });
    }
  }

  addSamplePhoto(itemIndex: number) {
    const item = this.itemsFormArray.at(itemIndex);
    const currentPhotos = item.get('samplePhotos')?.value || [];
    
    // In real implementation, this would open a file picker
    const newPhotoUrl = prompt('Enter sample photo URL:');
    if (newPhotoUrl) {
      item.patchValue({
        samplePhotos: [...currentPhotos, newPhotoUrl]
      });
    }
  }

  removeSamplePhoto(itemIndex: number, photoIndex: number) {
    const item = this.itemsFormArray.at(itemIndex);
    const currentPhotos = item.get('samplePhotos')?.value || [];
    currentPhotos.splice(photoIndex, 1);
    
    item.patchValue({
      samplePhotos: [...currentPhotos]
    });
  }

  addInstruction(itemIndex: number) {
    const item = this.itemsFormArray.at(itemIndex);
    const currentInstructions = item.get('instructions')?.value || [];
    
    const newInstruction = prompt('Enter instruction:');
    if (newInstruction?.trim()) {
      item.patchValue({
        instructions: [...currentInstructions, newInstruction.trim()]
      });
    }
  }

  removeInstruction(itemIndex: number, instructionIndex: number) {
    const item = this.itemsFormArray.at(itemIndex);
    const currentInstructions = item.get('instructions')?.value || [];
    currentInstructions.splice(instructionIndex, 1);
    
    item.patchValue({
      instructions: [...currentInstructions]
    });
  }

  saveTemplate() {
    if (this.templateForm.valid) {
      const formValue = this.templateForm.value;
      
      const template: ChecklistTemplate = {
        ...formValue,
        id: formValue.id || this.generateId(),
        createdBy: 'current-user', // Replace with actual user
        createdDate: this.isCreating ? new Date().toISOString() : this.selectedTemplate?.createdDate || new Date().toISOString(),
        updatedBy: this.isCreating ? undefined : 'current-user',
        updatedDate: this.isCreating ? undefined : new Date().toISOString()
      };

      if (this.isCreating) {
        this.templates.push(template);
      } else {
        const index = this.templates.findIndex(t => t.id === template.id);
        if (index !== -1) {
          this.templates[index] = template;
        }
      }

      this.selectedTemplate = template;
      this.isEditing = false;
      this.isCreating = false;
      this.showTemplateForm = false;
      
      // Filter templates after saving
      this.filterTemplates();
      
      // In real implementation, save to backend
      console.log('Template saved:', template);
    } else {
      this.markFormGroupTouched(this.templateForm);
    }
  }

  cancelEdit() {
    this.isEditing = false;
    this.isCreating = false;
    this.showTemplateForm = false;
    
    if (this.selectedTemplate) {
      this.populateForm(this.selectedTemplate);
    } else {
      this.templateForm.reset();
    }
  }

  deleteTemplate(template: ChecklistTemplate) {
    if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
      const index = this.templates.findIndex(t => t.id === template.id);
      if (index !== -1) {
        this.templates.splice(index, 1);
        if (this.selectedTemplate?.id === template.id) {
          this.selectedTemplate = null;
          this.templateForm.reset();
        }
      }
    }
  }

  duplicateTemplate(template: ChecklistTemplate) {
    const newTemplate: ChecklistTemplate = {
      ...template,
      id: this.generateId(),
      name: `${template.name} (Copy)`,
      version: '1.0',
      createdBy: 'current-user',
      createdDate: new Date().toISOString(),
      updatedBy: undefined,
      updatedDate: undefined
    };
    
    this.templates.push(newTemplate);
    this.selectTemplate(newTemplate);
  }

  private generateId(): string {
    return 'template_' + Math.random().toString(36).substr(2, 9);
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach((arrayControl) => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          }
        });
      }
    });
  }

  goToDashboard(): void {
    // Navigation logic - would typically use Router
    console.log('Navigate to dashboard');
  }

  // Item management methods
  moveItemUp(index: number): void {
    if (index > 0) {
      const items = this.itemsFormArray;
      const item = items.at(index);
      items.removeAt(index);
      items.insert(index - 1, item);
    }
  }

  moveItemDown(index: number): void {
    const items = this.itemsFormArray;
    if (index < items.length - 1) {
      const item = items.at(index);
      items.removeAt(index);
      items.insert(index + 1, item);
    }
  }

  // Search and filter methods
  onSearchChange(): void {
    this.filterTemplates();
  }

  onFilterChange(): void {
    this.filterTemplates();
  }

  filterTemplates(): void {
    this.filteredTemplates = this.templates.filter(template => {
      const matchesSearch = !this.searchTerm || 
        template.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        template.category.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesCategory = !this.selectedCategory || template.category === this.selectedCategory;
      const matchesType = !this.selectedType || template.type === this.selectedType;
      const matchesStatus = !this.selectedStatus || template.status === this.selectedStatus;
      
      return matchesSearch && matchesCategory && matchesType && matchesStatus;
    });
  }

  // Preview functionality
  previewTemplate(): void {
    if (this.templateForm.valid) {
      // Could open a modal or navigate to preview page
      console.log('Preview template:', this.templateForm.value);
    }
  }
}