import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PhotoChecklistConfigService, ChecklistInstance } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';

interface AuditSearchCriteria {
  partNumber: string;
  serialNumber: string;
  workOrderNumber: string;
  templateName: string;
  dateFrom: string;
  dateTo: string;
  status: string;
  operator: string;
}

interface AuditResult {
  instance: ChecklistInstance;
  photos: AuditPhoto[];
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
  notes: string;
  completedAt: string;
  photoRequirements: any;
  isRequired: boolean;
}

@Component({
  selector: 'app-checklist-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './checklist-audit.component.html',
  styleUrls: ['./checklist-audit.component.scss']
})
export class ChecklistAuditComponent implements OnInit {
  // Search criteria
  searchCriteria: AuditSearchCriteria = {
    partNumber: '',
    serialNumber: '',
    workOrderNumber: '',
    templateName: '',
    dateFrom: '',
    dateTo: '',
    status: '',
    operator: ''
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

  constructor(
    private photoChecklistService: PhotoChecklistConfigService
  ) {}

  ngOnInit() {
    // Set default date range to last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    this.searchCriteria.dateTo = today.toISOString().split('T')[0];
    this.searchCriteria.dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
  }

  // ==============================================
  // Search Methods
  // ==============================================

  async performSearch() {
    if (!this.isSearchValid()) {
      alert('Please provide at least one search criteria (Part Number, Serial Number, or Work Order).');
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
    return !!(
      this.searchCriteria.partNumber || 
      this.searchCriteria.serialNumber || 
      this.searchCriteria.workOrderNumber
    );
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
          photoUrls.push(...item.photos.map((photo: any) => photo.file_url).filter((url: string) => url));
          
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

        photos.push({
          itemId: item.id,
          itemTitle: item.title,
          itemDescription: item.description || '',
          photoUrls: photoUrls,
          sampleImageUrl: item.sample_images?.find(img => img.is_primary)?.url || item.sample_images?.[0]?.url || '',
          notes: notes,
          completedAt: completedAt,
          photoRequirements: item.photo_requirements || {},
          isRequired: item.is_required || false
        });
      });
    }

    return photos;
  }

  // ==============================================
  // View Methods
  // ==============================================

  clearSearch() {
    this.searchCriteria = {
      partNumber: '',
      serialNumber: '',
      workOrderNumber: '',
      templateName: '',
      dateFrom: this.searchCriteria.dateFrom,
      dateTo: this.searchCriteria.dateTo,
      status: '',
      operator: ''
    };
    this.auditResults = [];
    this.searchPerformed = false;
    this.selectedResult = null;
  }

  async switchToGalleryView() {
    this.viewMode = 'gallery';
    
    // Load detailed data for all results if not already loaded
    const resultsNeedingDetails = this.auditResults.filter(result => result.photos.length === 0);
    
    if (resultsNeedingDetails.length > 0) {
      this.loading = true;
      try {
        for (const result of resultsNeedingDetails) {
          const detailedInstance = await this.photoChecklistService.getInstance(result.instance.id).toPromise();
          result.photos = this.extractPhotosForAudit(detailedInstance);
          
          // Update instance with detailed data
          result.instance = detailedInstance;
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
