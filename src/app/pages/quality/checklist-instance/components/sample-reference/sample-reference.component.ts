import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sample-reference',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sample-reference.component.html',
  styleUrls: ['./sample-reference.component.scss']
})
export class SampleReferenceComponent {
  @Input() progress: any;
  @Input() currentComparisonIndex: { [key: number]: number } = {};
  
  @Output() previousPhoto = new EventEmitter<number>();
  @Output() nextPhoto = new EventEmitter<number>();

  onPreviousPhoto(itemId: number) {
    this.previousPhoto.emit(itemId);
  }

  onNextPhoto(itemId: number) {
    this.nextPhoto.emit(itemId);
  }

  getCurrentIndex(itemId: number): number {
    return this.currentComparisonIndex[itemId] || 0;
  }

  getSamplePhotoUrl(photo: string): string {
    if (!photo) return '';
    if (photo.startsWith('http')) {
      return photo;
    }
    // Remove leading slash if present to avoid double slashes
    const cleanPath = photo.startsWith('/') ? photo.substring(1) : photo;
    return `https://dashboard.eye-fi.com/${cleanPath}`;
  }

  hasMultiplePhotos(): boolean {
    // Since we only have one sample_image_url, this will always be false
    return false;
  }

  getCurrentSamplePhoto(): string | null {
    // Use sample_image_url from the item data structure
    return this.progress?.item?.sample_image_url || null;
  }
}
