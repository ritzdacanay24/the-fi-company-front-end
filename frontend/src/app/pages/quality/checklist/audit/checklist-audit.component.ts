import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PhotoChecklistConfigService, ChecklistInstance } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { ShareReportModalComponent } from '../instance/components/share-report/share-report-modal.component';

interface AuditSearchCriteria {
  serialNumber: string;
}

interface AuditResult {
  instance: ChecklistInstance;
  photos: AuditPhoto[];
  detailsLoaded: boolean;
  templateInfo: {
    name: string;
    description: string;
    version: string;
    category: string;
  };
}

interface AuditPhoto {
  itemId: number;
  itemTitle: string;
  itemDescription: string;
  photoUrls: string[];
  sampleImageUrl: string;
  sampleImages: Array<{ url: string; label?: string; description?: string }>;
  notes: string;
  completedAt: string;
  photoRequirements: any;
  isRequired: boolean;
}

@Component({
  selector: 'app-checklist-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ShareReportModalComponent],
  templateUrl: './checklist-audit.component.html',
  styleUrls: ['./checklist-audit.component.scss']
})
export class ChecklistAuditComponent implements OnInit {
  // Search criteria
  searchCriteria: AuditSearchCriteria = {
    serialNumber: ''
  };

  // Results
  auditResults: AuditResult[] = [];
  loading = false;
  loadingDetails = false;
  searchPerformed = false;

  // View options
  viewMode: 'summary' | 'detailed' | 'gallery' = 'summary';
  selectedResult: AuditResult | null = null;
  
  // Print options
  printOptions = {
    includePhotos: true,
    includeSamples: true,
    includeNotes: true,
    includeMetadata: true,
    photosPerPage: 4
  };

  // Preview modal
  previewImage: string | null = null;
  showPreviewModal = false;

  // Shared lightbox-style preview (same interaction pattern as public inspection report)
  lightboxUrl: string | null = null;
  lightboxMedia: Array<{ url: string; itemTitle?: string; itemDescription?: string }> = [];
  lightboxIndex = 0;
  lightboxTotalCount = 0;
  lightboxItemTitle: string | null = null;
  lightboxItemDescription: string | null = null;
  showLightboxControls = true;
  lightboxImageScale = 1;
  lightboxImageRotation = 0;

  // Share report modal
  showShareModal = false;
  shareInstanceId: number | null = null;
  shareInstance: any = null;
  shareItemsForModal: any[] = [];

  constructor(
    private photoChecklistService: PhotoChecklistConfigService
  ) {}

  ngOnInit() {
    // Intentionally empty - no default filters for serial-only search.
  }

  // ==============================================
  // Search Methods
  // ==============================================

  async performSearch() {
    if (!this.isSearchValid()) {
      alert('Please enter a serial number to search.');
      return;
    }

    this.loading = true;
    this.searchPerformed = true;
    this.auditResults = [];
    this.selectedResult = null;
    this.viewMode = 'summary';

    try {
      // Search for instances based on criteria (summary data only)
      const instances = await this.searchInstances();
      
      // Create summary audit results without detailed photo data
      this.auditResults = instances.map(instance => ({
        instance: instance,
        photos: [], // Will be loaded on demand when viewing details
        detailsLoaded: false,
        templateInfo: {
          name: instance.template_name || 'Unknown Template',
          description: instance.template_description || '',
          version: instance.template_version || '1.0',
          category: instance.template_category || 'Unknown'
        }
      }));
      
    } catch (error) {
      console.error('Search error:', error);
      alert('Error performing search. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  private isSearchValid(): boolean {
    return !!this.searchCriteria.serialNumber?.trim();
  }

  private async searchInstances(): Promise<ChecklistInstance[]> {
    // This would call your existing API with search parameters
    const response = await this.photoChecklistService.searchInstances(this.searchCriteria).toPromise();
    return response || [];
  }

  private async getDetailedAuditData(instances: ChecklistInstance[]): Promise<AuditResult[]> {
    const results: AuditResult[] = [];

    for (const instance of instances) {
      try {
        // Get full instance details with photos
        const detailedInstance = await this.photoChecklistService.getInstance(instance.id).toPromise();
        
        // Transform into audit format
        const auditResult: AuditResult = {
          instance: detailedInstance,
          photos: this.extractPhotosForAudit(detailedInstance),
          detailsLoaded: true,
          templateInfo: {
            name: detailedInstance.template_name || 'Unknown Template',
            description: detailedInstance.template_description || '',
            version: detailedInstance.template_version || '1.0',
            category: detailedInstance.template_category || 'Unknown'
          }
        };

        results.push(auditResult);
      } catch (error) {
        console.error(`Error loading details for instance ${instance.id}:`, error);
      }
    }

    return results;
  }

  private extractPhotosForAudit(instance: any): AuditPhoto[] {
    const photos: AuditPhoto[] = [];

    // The backend returns 'items' array, not 'progress'
    if (instance.items && Array.isArray(instance.items)) {
      instance.items.forEach((item: any) => {
        // Extract photo URLs from the photos array
        const photoUrls: string[] = [];
        let notes = '';
        let completedAt = '';
        
        if (item.photos && Array.isArray(item.photos)) {
          photoUrls.push(...item.photos
            .map((photo: any) => {
              if (typeof photo === 'string') return photo;
              return photo?.url || photo?.file_url || photo?.file_path || null;
            })
            .filter((url: string | null) => !!url) as string[]);
          
          // Get notes from the first photo with review_notes
          const photoWithNotes = item.photos.find((photo: any) => photo.review_notes);
          if (photoWithNotes) {
            notes = photoWithNotes.review_notes;
          }
          
          // Get the latest completion date
          const latestPhoto = item.photos
            .filter((photo: any) => photo.created_at)
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          if (latestPhoto) {
            completedAt = latestPhoto.created_at;
          }
        }

        const sampleImages = this.extractSampleImages(item);

        photos.push({
          itemId: item.id,
          itemTitle: item.title,
          itemDescription: item.description || item.details || '',
          photoUrls: photoUrls,
          sampleImageUrl: sampleImages[0]?.url || '',
          sampleImages,
          notes: notes,
          completedAt: completedAt,
          photoRequirements: item.photo_requirements || {},
          isRequired: item.is_required || false
        });
      });
    }

    if (photos.length > 0) {
      return photos;
    }

    return this.extractPhotosFromItemCompletion(instance);
  }

  private extractPhotosFromItemCompletion(instance: any): AuditPhoto[] {
    const completionRaw = instance?.item_completion;
    const completionEntries: any[] = Array.isArray(completionRaw)
      ? completionRaw
      : (completionRaw && typeof completionRaw === 'object' ? Object.values(completionRaw) : []);

    if (!completionEntries.length) {
      return [];
    }

    const parsedPhotos = completionEntries
      .map((entry: any, index: number): AuditPhoto | null => {
        const photoMeta = entry?.photoMeta || entry?.photo_meta || {};
        const photoMetaUrls = photoMeta && typeof photoMeta === 'object'
          ? Object.keys(photoMeta).filter((url) => !!url)
          : [];

        const explicitPhotoUrls = Array.isArray(entry?.photoUrls)
          ? entry.photoUrls.filter((url: string) => !!url)
          : [];

        const photoUrls = [...photoMetaUrls, ...explicitPhotoUrls].filter((url, idx, arr) => arr.indexOf(url) === idx);

        if (!photoUrls.length) {
          return null;
        }

        const rawItemId = String(entry?.itemId || entry?.item_id || '');
        const idSegments = rawItemId.split('_');
        const trailingSegment = idSegments[idSegments.length - 1];
        const numericItemId = Number(trailingSegment);

        return {
          itemId: Number.isFinite(numericItemId) ? numericItemId : index + 1,
          itemTitle: rawItemId ? `Item ${trailingSegment}` : `Item ${index + 1}`,
          itemDescription: '',
          photoUrls,
          sampleImageUrl: '',
          sampleImages: [],
          notes: entry?.notes || '',
          completedAt: entry?.completedAt || entry?.lastModifiedAt || '',
          photoRequirements: {},
          isRequired: false
        };
      })
      .filter((entry): entry is AuditPhoto => !!entry);

    return parsedPhotos;
  }

  // ==============================================
  // View Methods
  // ==============================================

  clearSearch() {
    this.searchCriteria = {
      serialNumber: ''
    };
    this.auditResults = [];
    this.searchPerformed = false;
    this.selectedResult = null;
  }

  async switchToGalleryView() {
    this.viewMode = 'gallery';
    
    // Load detailed data for all results if not already loaded
    const resultsNeedingDetails = this.auditResults.filter(result => !result.detailsLoaded);
    
    if (resultsNeedingDetails.length > 0) {
      this.loading = true;
      try {
        for (const result of resultsNeedingDetails) {
          try {
            const detailedInstance = await this.photoChecklistService.getInstance(result.instance.id).toPromise();
            result.photos = this.extractPhotosForAudit(detailedInstance);
            result.instance = detailedInstance;
          } finally {
            // Mark complete even when no photos exist, so UI does not stay in loading state.
            result.detailsLoaded = true;
          }
        }
      } catch (error) {
        console.error('Error loading detailed data for gallery view:', error);
        alert('Error loading photo details. Please try again.');
      } finally {
        this.loading = false;
      }
    }
  }

  async selectResult(result: AuditResult) {
    this.loadingDetails = true;
    try {
      // Get full instance details with photos
      const detailedInstance = await this.photoChecklistService.getInstance(result.instance.id).toPromise();
      
      // Create detailed audit result
      this.selectedResult = {
        instance: detailedInstance,
        photos: this.extractPhotosForAudit(detailedInstance),
        detailsLoaded: true,
        templateInfo: {
          name: detailedInstance.template_name || 'Unknown Template',
          description: detailedInstance.template_description || '',
          version: detailedInstance.template_version || '1.0',
          category: detailedInstance.template_category || 'Unknown'
        }
      };
      
      this.viewMode = 'detailed';
    } catch (error) {
      console.error('Error loading detailed instance data:', error);
      // Fallback to basic result if detailed fetch fails
      this.selectedResult = result;
      this.viewMode = 'detailed';
    } finally {
      this.loadingDetails = false;
    }
  }

  openPreviewModal(imageUrl: string) {
    this.previewImage = imageUrl;
    this.showPreviewModal = true;
  }

  closePreviewModal() {
    this.previewImage = null;
    this.showPreviewModal = false;
  }

  openLightbox(
    photo: AuditPhoto,
    mediaType: 'photo' | 'sample',
    mediaIndex: number = 0,
    contextPhotos: AuditPhoto[] = []
  ): void {
    // Match public report behavior: navigate through all submitted/taken photos in the current report context.
    if (mediaType === 'photo') {
      const sourcePhotos = (contextPhotos && contextPhotos.length > 0) ? contextPhotos : [photo];
      const allTakenMedia = sourcePhotos.flatMap((entry: AuditPhoto) =>
        (entry.photoUrls || [])
          .map((rawUrl: string) => ({
            url: this.getPhotoUrl(rawUrl),
            itemTitle: entry.itemTitle,
            itemDescription: entry.itemDescription
          }))
          .filter((m: any) => !!m.url)
      );

      if (!allTakenMedia.length) {
        return;
      }

      const currentItemPhotos = (photo.photoUrls || []).map((rawUrl: string) => this.getPhotoUrl(rawUrl));
      const clickedUrl = currentItemPhotos[Math.max(0, mediaIndex)] || currentItemPhotos[0];
      const startIndex = Math.max(0, allTakenMedia.findIndex((m: any) => m.url === clickedUrl));

      this.lightboxMedia = allTakenMedia;
      this.lightboxTotalCount = allTakenMedia.length;
      this.lightboxIndex = Math.min(startIndex, allTakenMedia.length - 1);
      this.applyLightboxFrame();
      return;
    }

    // Sample click remains a single-image preview frame.
    const sampleUrl = this.getPhotoUrl((photo.sampleImages?.[mediaIndex] || photo.sampleImages?.[0])?.url || '');
    if (!sampleUrl) {
      return;
    }

    this.lightboxMedia = [{
      url: sampleUrl,
      itemTitle: photo.itemTitle,
      itemDescription: photo.itemDescription
    }];
    this.lightboxTotalCount = 1;
    this.lightboxIndex = 0;
    this.applyLightboxFrame();
  }

  private applyLightboxFrame(): void {
    const frame = this.lightboxMedia[this.lightboxIndex];
    if (!frame) {
      this.closeLightbox();
      return;
    }
    this.lightboxUrl = frame.url;
    this.lightboxItemTitle = frame.itemTitle || null;
    this.lightboxItemDescription = frame.itemDescription || null;
    this.resetLightboxTransform();
  }

  lightboxPrev(): void {
    if (this.lightboxTotalCount <= 1) {
      return;
    }
    this.lightboxIndex = (this.lightboxIndex - 1 + this.lightboxTotalCount) % this.lightboxTotalCount;
    this.applyLightboxFrame();
  }

  lightboxNext(): void {
    if (this.lightboxTotalCount <= 1) {
      return;
    }
    this.lightboxIndex = (this.lightboxIndex + 1) % this.lightboxTotalCount;
    this.applyLightboxFrame();
  }

  closeLightbox(): void {
    this.lightboxUrl = null;
    this.lightboxMedia = [];
    this.lightboxIndex = 0;
    this.lightboxTotalCount = 0;
    this.lightboxItemTitle = null;
    this.lightboxItemDescription = null;
    this.resetLightboxTransform();
  }

  get lightboxImageTransform(): string {
    return `scale(${this.lightboxImageScale}) rotate(${this.lightboxImageRotation}deg)`;
  }

  zoomIn(): void {
    this.lightboxImageScale = Math.min(4, this.lightboxImageScale + 0.2);
  }

  zoomOut(): void {
    this.lightboxImageScale = Math.max(0.4, this.lightboxImageScale - 0.2);
  }

  rotateLeft(): void {
    this.lightboxImageRotation -= 90;
  }

  rotateRight(): void {
    this.lightboxImageRotation += 90;
  }

  resetLightboxTransform(): void {
    this.lightboxImageScale = 1;
    this.lightboxImageRotation = 0;
  }

  async downloadLightboxImage(event?: Event): Promise<void> {
    event?.stopPropagation();
    event?.preventDefault();
    if (!this.lightboxUrl) {
      return;
    }

    const imageUrl = this.lightboxUrl;
    const filename = this.getDownloadFilenameFromUrl(imageUrl);

    // Try browser-native download first for same-origin media.
    try {
      const resolvedUrl = new URL(imageUrl, window.location.origin);
      if (resolvedUrl.origin === window.location.origin) {
        const directAnchor = document.createElement('a');
        directAnchor.href = resolvedUrl.toString();
        directAnchor.download = filename;
        document.body.appendChild(directAnchor);
        directAnchor.click();
        document.body.removeChild(directAnchor);
        return;
      }
    } catch {
      // Continue to fetch/proxy fallbacks when URL parsing fails.
    }

    // Try fetch/blob path when CORS allows it.
    try {
      const response = await fetch(imageUrl, { mode: 'cors', credentials: 'include' });
      if (response.ok) {
        const blob = await response.blob();
        if (blob.size > 0) {
          const blobUrl = URL.createObjectURL(blob);
          const blobAnchor = document.createElement('a');
          blobAnchor.href = blobUrl;
          blobAnchor.download = filename;
          document.body.appendChild(blobAnchor);
          blobAnchor.click();
          document.body.removeChild(blobAnchor);
          URL.revokeObjectURL(blobUrl);
          return;
        }
      }
    } catch {
      // CORS/network restriction - fallback below.
    }

    // Last resort: route download through backend proxy as attachment.
    const absoluteImageUrl = new URL(imageUrl, window.location.origin).toString();
    const proxyUrl = `/photo-checklist/inspection-report.php?request=download_media&url=${encodeURIComponent(absoluteImageUrl)}&filename=${encodeURIComponent(filename)}`;
    const proxyAnchor = document.createElement('a');
    proxyAnchor.href = proxyUrl;
    proxyAnchor.download = filename;
    document.body.appendChild(proxyAnchor);
    proxyAnchor.click();
    document.body.removeChild(proxyAnchor);
  }

  private getDownloadFilenameFromUrl(url: string): string {
    try {
      const parsed = new URL(url, window.location.origin);
      const lastSegment = parsed.pathname.split('/').filter(Boolean).pop();
      if (lastSegment && lastSegment.includes('.')) {
        return decodeURIComponent(lastSegment);
      }
    } catch {
      // Fallback handled below.
    }
    return `audit-photo-${Date.now()}.jpg`;
  }

  @HostListener('document:keydown', ['$event'])
  onLightboxKeydown(event: KeyboardEvent): void {
    if (!this.lightboxUrl) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeLightbox();
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.lightboxPrev();
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.lightboxNext();
    }
  }

  getPrimarySampleImage(photo: AuditPhoto): { url: string; label?: string; description?: string } | null {
    if (!photo?.sampleImages?.length) {
      return null;
    }
    return photo.sampleImages[0];
  }

  private extractSampleImages(item: any): Array<{ url: string; label?: string; description?: string }> {
    const candidateArrays: any[][] = [];

    if (Array.isArray(item?.sample_images)) {
      candidateArrays.push(item.sample_images);
    }
    if (Array.isArray(item?.media?.sample_images)) {
      candidateArrays.push(item.media.sample_images);
    }
    if (Array.isArray(item?.sample_media?.sample_images)) {
      candidateArrays.push(item.sample_media.sample_images);
    }
    if (Array.isArray(item?.sample_media?.images)) {
      candidateArrays.push(item.sample_media.images);
    }

    const flattened = candidateArrays.flat();
    const normalized = flattened
      .map((entry: any) => {
        if (typeof entry === 'string') {
          return { url: entry };
        }
        const url = entry?.url || entry?.file_url || entry?.file_path || entry?.image_url || null;
        if (!url) {
          return null;
        }
        return {
          url,
          label: entry?.label || entry?.title || undefined,
          description: entry?.description || undefined
        };
      })
      .filter((entry: any) => !!entry?.url);

    if (!normalized.length && item?.sample_image_url) {
      normalized.push({ url: item.sample_image_url });
    }

    const seen = new Set<string>();
    return normalized.filter((entry: any) => {
      const key = String(entry.url || '').trim();
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async openShareReport(result: AuditResult) {
    if (!result?.instance?.id) {
      return;
    }

    this.loadingDetails = true;
    try {
      const detailedInstance = await this.photoChecklistService.getInstance(result.instance.id).toPromise();
      this.shareInstanceId = detailedInstance.id;
      this.shareInstance = detailedInstance;
      this.shareItemsForModal = this.buildShareItemsFromInstance(detailedInstance);
      this.showShareModal = true;
    } catch (error) {
      console.error('Error preparing share report data:', error);
      alert('Unable to open share report. Please try again.');
    } finally {
      this.loadingDetails = false;
    }
  }

  closeShareReportModal() {
    this.showShareModal = false;
    this.shareInstanceId = null;
    this.shareInstance = null;
    this.shareItemsForModal = [];
  }

  private buildShareItemsFromInstance(instance: any): any[] {
    if (!instance?.items || !Array.isArray(instance.items)) {
      return [];
    }

    return instance.items.map((item: any) => {
      const photoUrls = Array.isArray(item.photos)
        ? item.photos
            .map((entry: any) => (typeof entry === 'string' ? entry : entry?.url || entry?.file_url || entry?.file_path || null))
            .filter((url: string | null) => !!url)
        : [];

      const videoUrls = Array.isArray(item.videos)
        ? item.videos
            .map((entry: any) => (typeof entry === 'string' ? entry : entry?.url || entry?.file_url || entry?.file_path || null))
            .filter((url: string | null) => !!url)
        : [];

      const photoCount = photoUrls.length + videoUrls.length;

      return {
        item: {
          id: Number(item.base_item_id ?? item.baseItemId ?? item.id),
          baseItemId: Number(item.base_item_id ?? item.baseItemId ?? item.id),
          title: item.title || 'Untitled',
          level: Number(item.level ?? 0),
          description: item.description || item.details || ''
        },
        photos: photoUrls,
        videos: videoUrls,
        completed: photoCount > 0
      };
    });
  }

  // ==============================================
  // Export Methods
  // ==============================================

  async exportToPDF() {
    if (this.auditResults.length === 0) {
      alert('No results to export. Please perform a search first.');
      return;
    }

    // Open print-friendly view
    this.printReport();
  }

  async exportToExcel() {
    if (this.auditResults.length === 0) {
      alert('No results to export. Please perform a search first.');
      return;
    }

    // Create CSV data
    const csvData = this.generateCSVData();
    this.downloadCSV(csvData, `checklist-audit-${new Date().toISOString().split('T')[0]}.csv`);
  }

  private generateCSVData(): string {
    const headers = [
      'Work Order',
      'Part Number', 
      'Serial Number',
      'Template Name',
      'Status',
      'Operator',
      'Created Date',
      'Completed Date',
      'Item Title',
      'Item Required',
      'Photos Count',
      'Has Sample',
      'Notes'
    ];

    const rows: string[] = [headers.join(',')];

    this.auditResults.forEach(result => {
      result.photos.forEach(photo => {
        const row = [
          `"${result.instance.work_order_number}"`,
          `"${result.instance.part_number}"`,
          `"${result.instance.serial_number}"`,
          `"${result.templateInfo.name}"`,
          `"${result.instance.status}"`,
          `"${result.instance.operator_name}"`,
          `"${result.instance.created_at}"`,
          `"${result.instance.submitted_at || ''}"`,
          `"${photo.itemTitle}"`,
          `"${photo.isRequired ? 'Yes' : 'No'}"`,
          `"${photo.photoUrls.length}"`,
          `"${photo.sampleImageUrl ? 'Yes' : 'No'}"`,
          `"${(photo.notes || '').replace(/"/g, '""')}"`
        ];
        rows.push(row.join(','));
      });
    });

    return rows.join('\n');
  }

  private downloadCSV(csvContent: string, filename: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  printReport() {
    window.print();
  }

  // ==============================================
  // Utility Methods
  // ==============================================

  getTotalPhotos(result: AuditResult): number {
    // For summary view, use instance photo_count if available, otherwise use loaded photos
    if (result.instance.photo_count !== undefined) {
      return result.instance.photo_count;
    }
    return result.photos.reduce((total, photo) => total + photo.photoUrls.length, 0);
  }

  getCompletedItemsCount(result: AuditResult): number {
    // For summary view, use instance completed_required if available, otherwise use loaded photos
    if (result.instance.completed_required !== undefined) {
      return result.instance.completed_required;
    }
    return result.photos.filter(photo => photo.photoUrls.length > 0).length;
  }

  getTotalItemsCount(result: AuditResult): number {
    // For summary view, use instance required_items if available, otherwise use loaded photos
    if (result.instance.required_items !== undefined) {
      return result.instance.required_items;
    }
    return result.photos.length;
  }

  getProgressPercentage(result: AuditResult): number {
    // Use instance progress_percentage if available (more accurate)
    if (result.instance.progress_percentage !== undefined) {
      return Math.round(Number(result.instance.progress_percentage));
    }
    
    // Fallback to calculating from photos
    const total = this.getTotalItemsCount(result);
    const completed = this.getCompletedItemsCount(result);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  getStatusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'submitted':
        return 'bg-success';
      case 'in_progress':
        return 'bg-warning';
      case 'draft':
        return 'bg-secondary';
      default:
        return 'bg-info';
    }
  }

  hasPhotos(photo: AuditPhoto): boolean {
    return photo.photoUrls && photo.photoUrls.length > 0;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get full URL for photo, handling both absolute and relative paths
   */
  getPhotoUrl(photo: string): string {
    if (!photo) return '';
    if (photo.startsWith('http')) {
      return photo;
    }
    // Remove leading slash if present to avoid double slashes
    const cleanPath = photo.startsWith('/') ? photo.substring(1) : photo;
    return `https://dashboard.eye-fi.com/${cleanPath}`;
  }
}
