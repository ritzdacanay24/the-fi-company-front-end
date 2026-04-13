import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SimpleChecklistService, SimpleTemplate, SimpleItem } from './checklist-simple.service';
import { Subject, interval } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-checklist-simple',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checklist-simple.component.html',
  styleUrls: ['./checklist-simple.component.scss']
})
export class ChecklistSimpleComponent implements OnInit, OnDestroy {
  templateForm!: FormGroup;
  templateId: number | null = null;
  loading = false;
  saving = false;
  lastSaved: Date | null = null;
  private destroy$ = new Subject<void>();

  // Modal state
  showPhotoModal = false;
  selectedItemIndex: number | null = null;
  selectedItem: SimpleItem | null = null;
  uploadingReference = false;

  constructor(
    private fb: FormBuilder,
    private service: SimpleChecklistService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.templateForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      part_number: [''],
      product_type: [''],
      is_draft: [true],
      items: this.fb.array([])
    });

    // Load template if editing
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.templateId = +params['id'];
        this.loadTemplate(this.templateId);
      } else {
        this.addItem(); // Start with one item
      }
    });

    // Auto-save disabled
    // interval(10000)
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe(() => {
    //     if (this.templateForm.dirty && !this.saving) {
    //       this.autoSave();
    //     }
    //   });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get items(): FormArray {
    return this.templateForm.get('items') as FormArray;
  }

  loadTemplate(id: number) {
    this.loading = true;
    this.service.getTemplate(id).subscribe({
      next: (template) => {
        this.templateForm.patchValue({
          name: template.name,
          description: template.description,
          part_number: template.part_number,
          product_type: template.product_type,
          is_draft: template.is_draft
        });

        // Clear and add items
        this.items.clear();
        template.items.forEach(item => {
          this.items.push(this.createItemGroup(item));
        });
        
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading template:', err);
        this.loading = false;
      }
    });
  }

  createItemGroup(item?: SimpleItem): FormGroup {
    return this.fb.group({
      id: [item?.id || null],
      title: [item?.title || '', Validators.required],
      description: [item?.description || ''],
      level: [item?.level || 0],
      parent_id: [item?.parent_id || null],
      order_index: [item?.order_index || this.items.length + 1],
      is_required: [item?.is_required ?? true],
      submission_type: [item?.submission_type || 'photo'],
      photo_requirements: [item?.photo_requirements || null],
      references: [item?.references || []],
      has_photo_requirements: [item?.has_photo_requirements || false]
    });
  }

  addItem() {
    const newItem = this.createItemGroup();
    this.items.push(newItem);
  }

  removeItem(index: number) {
    if (confirm('Remove this item?')) {
      this.items.removeAt(index);
      this.reorderItems();
    }
  }

  moveUp(index: number) {
    if (index === 0) return;
    const item = this.items.at(index);
    this.items.removeAt(index);
    this.items.insert(index - 1, item);
    this.reorderItems();
  }

  moveDown(index: number) {
    if (index === this.items.length - 1) return;
    const item = this.items.at(index);
    this.items.removeAt(index);
    this.items.insert(index + 1, item);
    this.reorderItems();
  }

  indent(index: number) {
    const item = this.items.at(index);
    const currentLevel = item.get('level')?.value || 0;
    
    if (currentLevel >= 10) return; // Max 10 levels
    
    item.patchValue({ level: currentLevel + 1 });
    this.templateForm.markAsDirty();
  }

  outdent(index: number) {
    const item = this.items.at(index);
    const currentLevel = item.get('level')?.value || 0;
    
    if (currentLevel === 0) return;
    
    item.patchValue({ level: currentLevel - 1 });
    this.templateForm.markAsDirty();
  }

  reorderItems() {
    this.items.controls.forEach((item, index) => {
      item.patchValue({ order_index: index + 1 });
    });
    this.templateForm.markAsDirty();
  }

  getIndentClass(level: number): string {
    return `indent-${Math.min(level, 10)}`;
  }

  autoSave() {
    const templateData = this.prepareTemplateData(true);
    this.saving = true;

    this.service.saveTemplate(templateData).subscribe({
      next: (response) => {
        if (response.success) {
          if (!this.templateId) {
            this.templateId = response.template_id;
            this.router.navigate(['/quality/checklist-simple', this.templateId], { replaceUrl: true });
          }
          this.lastSaved = new Date();
          this.templateForm.markAsPristine();
        }
        this.saving = false;
      },
      error: (err) => {
        console.error('Auto-save failed:', err);
        this.saving = false;
      }
    });
  }

  saveDraft() {
    this.reorderItems(); // Ensure order_index is sequential
    this.save(true);
  }

  publish() {
    if (!confirm('Publish this template? It will be available for use.')) return;
    this.reorderItems(); // Ensure order_index is sequential
    this.save(false);
  }

  save(isDraft: boolean) {
    if (this.templateForm.invalid) {
      this.templateForm.markAllAsTouched();
      alert('Please fill in all required fields');
      return;
    }

    const templateData = this.prepareTemplateData(isDraft);
    
    console.log('=== SAVING TEMPLATE ===');
    console.log('Items to save:', templateData.items.map((item, i) => ({
      index: i,
      title: item.title,
      level: item.level,
      order_index: item.order_index
    })));
    
    this.saving = true;

    this.service.saveTemplate(templateData).subscribe({
      next: (response) => {
        if (response.success) {
          if (!this.templateId) {
            this.templateId = response.template_id;
          }
          this.lastSaved = new Date();
          this.templateForm.markAsPristine();
          alert(isDraft ? 'Draft saved!' : 'Template published!');
          
          if (!isDraft) {
            this.router.navigate(['/quality/checklist-simple']);
          }
        }
        this.saving = false;
      },
      error: (err) => {
        console.error('Save failed:', err);
        alert('Error saving template: ' + (err.error?.error || 'Unknown error'));
        this.saving = false;
      }
    });
  }

  prepareTemplateData(isDraft: boolean): SimpleTemplate {
    const formValue = this.templateForm.value;
    return {
      id: this.templateId || undefined,
      name: formValue.name,
      description: formValue.description,
      part_number: formValue.part_number,
      product_type: formValue.product_type,
      is_draft: isDraft,
      items: formValue.items
    };
  }

  cancel() {
    if (this.templateForm.dirty && !confirm('Discard unsaved changes?')) return;
    this.router.navigate(['/quality/checklist-simple']);
  }

  // Photo Requirements Modal Methods
  openPhotoModal(index: number) {
    this.selectedItemIndex = index;
    const itemControl = this.items.at(index);
    this.selectedItem = itemControl.value;
    this.showPhotoModal = true;
  }

  closePhotoModal() {
    this.showPhotoModal = false;
    this.selectedItemIndex = null;
    this.selectedItem = null;
  }

  savePhotoRequirements(requirements: any) {
    if (this.selectedItemIndex === null) return;
    
    const itemControl = this.items.at(this.selectedItemIndex);
    itemControl.patchValue({
      photo_requirements: requirements,
      has_photo_requirements: requirements && requirements.min_count > 0
    });
    this.templateForm.markAsDirty();
  }

  updatePhotoRequirement(field: string, value: any) {
    if (this.selectedItemIndex === null) return;
    
    const itemControl = this.items.at(this.selectedItemIndex);
    const currentReqs = itemControl.value.photo_requirements || {};
    const updatedReqs = { ...currentReqs, [field]: value };
    
    this.savePhotoRequirements(updatedReqs);
  }

  onFileSelected(event: any, type: string) {
    const file = event.target.files[0];
    if (!file || this.selectedItemIndex === null) return;

    const itemControl = this.items.at(this.selectedItemIndex);
    const itemId = itemControl.value.id;

    if (!itemId) {
      alert('Please save the template first before uploading references');
      return;
    }

    const caption = prompt('Enter caption for this image:') || '';
    this.uploadingReference = true;

    this.service.uploadReference(itemId, type, caption, file).subscribe({
      next: (response) => {
        if (response.success) {
          const references = itemControl.value.references || [];
          references.push(response.reference);
          itemControl.patchValue({ references });
          this.templateForm.markAsDirty();
        }
        this.uploadingReference = false;
      },
      error: (err) => {
        console.error('Upload failed:', err);
        alert('Failed to upload reference image');
        this.uploadingReference = false;
      }
    });
  }

  deleteReferenceImage(refId: number) {
    if (!confirm('Delete this reference image?')) return;
    if (this.selectedItemIndex === null) return;

    this.service.deleteReference(refId).subscribe({
      next: (response) => {
        if (response.success) {
          const itemControl = this.items.at(this.selectedItemIndex!);
          const references = (itemControl.value.references || []).filter((r: any) => r.id !== refId);
          itemControl.patchValue({ references });
          this.templateForm.markAsDirty();
        }
      },
      error: (err) => {
        console.error('Delete failed:', err);
        alert('Failed to delete reference image');
      }
    });
  }

  hasPhotoRequirements(index: number): boolean {
    const item = this.items.at(index).value;
    return item.has_photo_requirements || (item.references && item.references.length > 0);
  }

  getPhotoCount(index: number): number {
    const item = this.items.at(index).value;
    return item.photo_requirements?.min_count || 0;
  }

  getPhotoBadgeClass(index: number): string {
    const item = this.items.at(index).value;
    const minCount = item.photo_requirements?.min_count || 0;
    const hasReferences = item.references && item.references.length > 0;
    
    if (minCount === 0) return 'badge-gray';
    if (minCount > 0 && !hasReferences) return 'badge-warning';
    return 'badge-success';
  }

  needsReferenceWarning(index: number): boolean {
    const item = this.items.at(index).value;
    const minCount = item.photo_requirements?.min_count || 0;
    const hasReferences = item.references && item.references.length > 0;
    return minCount > 0 && !hasReferences;
  }

  getReferenceThumbnails(index: number): any[] {
    const item = this.items.at(index).value;
    return (item.references || []).slice(0, 3);
  }
}
