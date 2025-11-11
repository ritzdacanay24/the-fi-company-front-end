import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-photo-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './photo-section.component.html',
  styleUrls: ['./photo-section.component.scss']
})
export class PhotoSectionComponent {
  @Input() progress: any;
  @Input() instance: any;
  @Input() isCompleted: boolean = false;
  
  @Output() fileSelected = new EventEmitter<{event: Event, itemId: number}>();
  @Output() deletePhoto = new EventEmitter<{photoUrl: string, itemId: number}>();

  onFileSelect(event: Event, itemId: number) {
    this.fileSelected.emit({ event, itemId });
  }

  onDeletePhoto(photoUrl: string, itemId: number) {
    this.deletePhoto.emit({ photoUrl, itemId });
  }

  getPhotoUrl(photo: any): string {
    // Handle both string URLs and photo objects with file_url
    if (typeof photo === 'string') {
      return photo.startsWith('http') ? photo : `http://10.0.0.120:8080/${photo}`;
    }
    // Handle photo objects from the API
    if (photo && photo.file_url) {
      return photo.file_url.startsWith('http') ? photo.file_url : `http://10.0.0.120:8080${photo.file_url}`;
    }
    return '';
  }

  getPhotos(): any[] {
    // Return photos from both possible locations
    return this.progress?.photos || this.progress?.item?.photos || [];
  }

  isDisabled(): boolean {
    return this.instance?.status === 'completed' || this.instance?.status === 'submitted';
  }
}
