import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  instructions?: string[];
  requiresPhoto?: boolean;
  photoCount?: number;
  completed: boolean;
  photos?: File[];
}

export interface ChecklistConfig {
  title: string;
  description?: string;
  type: 'photo-inspection' | 'shipping' | 'quality' | 'general';
  items: ChecklistItem[];
}

@Component({
  selector: 'app-inspection-checklist',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inspection-checklist.component.html',
  styleUrl: './inspection-checklist.component.scss'
})
export class InspectionChecklistComponent {
  @Input() config: ChecklistConfig = {
    title: 'Inspection Checklist',
    type: 'general',
    items: []
  };
  
  @Input() readonly = false;
  @Output() completed = new EventEmitter<ChecklistConfig>();
  @Output() itemChanged = new EventEmitter<{item: ChecklistItem, index: number}>();

  get completedCount(): number {
    return this.config.items.filter(item => item.completed).length;
  }

  get totalCount(): number {
    return this.config.items.length;
  }

  get isAllCompleted(): boolean {
    return this.completedCount === this.totalCount && this.totalCount > 0;
  }

  get progressPercentage(): number {
    return this.totalCount === 0 ? 0 : Math.round((this.completedCount / this.totalCount) * 100);
  }

  onItemToggle(item: ChecklistItem, index: number): void {
    if (this.readonly) return;
    
    item.completed = !item.completed;
    this.itemChanged.emit({ item, index });
    
    if (this.isAllCompleted) {
      this.completed.emit(this.config);
    }
  }

  onFileSelected(event: Event, item: ChecklistItem, index: number): void {
    if (this.readonly) return;
    
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      
      if (!item.photos) {
        item.photos = [];
      }
      
      // Add new files
      item.photos.push(...files);
      
      // Auto-complete if photo requirement is met
      if (item.requiresPhoto && item.photoCount && item.photos.length >= item.photoCount) {
        item.completed = true;
      }
      
      this.itemChanged.emit({ item, index });
    }
  }

  removePhoto(item: ChecklistItem, photoIndex: number, itemIndex: number): void {
    if (this.readonly || !item.photos) return;
    
    item.photos.splice(photoIndex, 1);
    
    // Uncheck if photos no longer meet requirement
    if (item.requiresPhoto && item.photoCount && item.photos.length < item.photoCount) {
      item.completed = false;
    }
    
    this.itemChanged.emit({ item, index: itemIndex });
  }

  getPhotoUrl(file: File): string {
    return URL.createObjectURL(file);
  }
}