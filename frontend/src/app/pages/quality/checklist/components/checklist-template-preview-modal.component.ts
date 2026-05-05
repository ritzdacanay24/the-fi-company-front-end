import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ChecklistTemplate, ChecklistItem } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { ChecklistNavigationComponent } from '@app/shared/components/checklist-navigation/checklist-navigation.component';
import { ChecklistNavItem } from '@app/shared/models/checklist-navigation.model';
import { ChecklistTemplatePreviewService } from '../services/checklist-template-preview.service';

@Component({
  selector: 'app-checklist-template-preview-modal',
  standalone: true,
  imports: [CommonModule, ChecklistNavigationComponent],
  templateUrl: './checklist-template-preview-modal.component.html',
})
export class ChecklistTemplatePreviewModalComponent implements OnChanges {
  @Input() templateId: number | null = null;
  @Input() allowStart = true;

  @Output() closeRequested = new EventEmitter<void>();
  @Output() startRequested = new EventEmitter<ChecklistTemplate>();

  loading = false;
  errorMessage = '';
  template: ChecklistTemplate | null = null;

  previewNavItems: ChecklistNavItem[] = [];
  previewActiveItemId: number | null = null;
  previewActiveItemIndex: number | null = null;

  /** Precomputed reference images per item id to avoid function calls in template */
  refImagesMap = new Map<number, any[]>();

  constructor(private readonly previewService: ChecklistTemplatePreviewService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ('templateId' in changes) {
      const id = Number(this.templateId || 0);
      if (id > 0) {
        this.loadTemplate(id);
      } else {
        this.template = null;
        this.previewNavItems = [];
        this.previewActiveItemId = null;
        this.previewActiveItemIndex = null;
        this.errorMessage = '';
      }
    }
  }

  onClose(): void {
    this.closeRequested.emit();
  }

  onStart(): void {
    if (this.template) {
      this.startRequested.emit(this.template);
    }
  }

  onPreviewNavItemSelected(event: { itemId: number; index: number }): void {
    const itemId = Number(event?.itemId || 0);
    const index = Number(event?.index ?? -1);
    this.previewActiveItemId = itemId > 0 ? itemId : null;
    this.previewActiveItemIndex = Number.isFinite(index) ? index : null;

    if (itemId <= 0) {
      return;
    }

    setTimeout(() => {
      const element = document.getElementById(`preview-item-${itemId}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  hasPhotoRequirements(requirements: any): boolean {
    if (!requirements) return false;
    return !!(requirements.angle || requirements.distance || requirements.lighting || requirements.focus);
  }

  getPhotoLimitText(item: ChecklistItem): string {
    const minPhotos = item.min_photos;
    const maxPhotos = item.max_photos;

    if (minPhotos && maxPhotos) {
      if (minPhotos === maxPhotos) {
        return `${minPhotos} photo${minPhotos === 1 ? '' : 's'}`;
      }
      return `${minPhotos}-${maxPhotos} photos`;
    }

    if (minPhotos) {
      return `${minPhotos}+ photos`;
    }

    if (maxPhotos) {
      return `up to ${maxPhotos} photo${maxPhotos === 1 ? '' : 's'}`;
    }

    return '';
  }

  trackByItemId(_index: number, item: any): number { return item.id; }
  trackByChildId(_index: number, child: any): number { return child.id; }
  trackByImageUrl(_index: number, img: any): string { return img.url; }
  trackByVideoUrl(_index: number, vid: any): string { return vid.url; }

  previewImage(imageUrl: string): void {
    if (imageUrl) {
      window.open(imageUrl, '_blank');
    }
  }

  private loadTemplate(templateId: number): void {
    this.loading = true;
    this.errorMessage = '';

    this.previewService.getTemplateById(templateId).subscribe({
      next: (template) => {
        this.template = template;
        this.previewNavItems = this.buildPreviewNavItemsFromNestedItems((template as any)?.items || []);
        this.refImagesMap = this.buildRefImagesMap((template as any)?.items || []);
        this.previewActiveItemId = null;
        this.previewActiveItemIndex = null;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading template preview:', error);
        this.template = null;
        this.previewNavItems = [];
        this.previewActiveItemId = null;
        this.previewActiveItemIndex = null;
        this.loading = false;
        this.errorMessage = 'Unable to load template preview. Please try again.';
      },
    });
  }

  private buildPreviewNavItemsFromNestedItems(items: any[], level: number = 0): ChecklistNavItem[] {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    const ordered = items.slice().sort((a, b) => {
      const ao = Number(a?.order_index ?? 0);
      const bo = Number(b?.order_index ?? 0);
      return ao - bo;
    });

    const flat: ChecklistNavItem[] = [];
    for (let i = 0; i < ordered.length; i++) {
      const item: any = ordered[i];
      const sampleImages = Array.isArray(item?.sample_images) ? item.sample_images : [];
      const sampleVideos = Array.isArray(item?.sample_videos) ? item.sample_videos : [];
      const primaryImage = sampleImages.find((img: any) => !!img?.is_primary) ?? null;
      const primaryVideo = sampleVideos.find((vid: any) => vid?.is_primary ?? true) ?? null;

      flat.push({
        id: Number(item?.id || 0),
        title: String(item?.title || 'Untitled'),
        level,
        orderIndex: Number(item?.order_index ?? i),
        submissionType: item?.submission_type ?? 'photo',
        isRequired: !!item?.is_required,
        requiresPhoto: !!item?.photo_requirements?.picture_required,
        hasPrimarySampleImage: sampleImages.some((img: any) => !!img?.is_primary),
        hasSampleVideo: sampleVideos.some((vid: any) => vid?.is_primary ?? true),
        primaryImageUrl: primaryImage?.url ?? null,
        sampleVideoUrl: primaryVideo?.url ?? null,
        searchText: `${item?.title || ''} ${item?.description || ''}`.trim(),
      });

      const children = Array.isArray(item?.children) ? item.children : [];
      if (children.length) {
        flat.push(...this.buildPreviewNavItemsFromNestedItems(children, level + 1));
      }
    }

    return flat;
  }

  private buildRefImagesMap(items: any[]): Map<number, any[]> {
    const map = new Map<number, any[]>();
    const process = (list: any[]) => {
      for (const item of list) {
        const imgs: any[] = Array.isArray(item?.sample_images) ? item.sample_images : [];
        map.set(Number(item.id), imgs.filter((img) => !img.is_primary || img.image_type !== 'sample'));
        if (Array.isArray(item?.children)) {
          process(item.children);
        }
      }
    };
    process(items);
    return map;
  }
}
