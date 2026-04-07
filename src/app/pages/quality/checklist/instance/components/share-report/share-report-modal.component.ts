import {
  Component, OnInit, AfterViewInit, Input, Output, EventEmitter,
  ChangeDetectorRef, ViewChild, TemplateRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NgbModal, NgbModalRef, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Lightbox } from 'ngx-lightbox';

export interface ShareReportToken {
  id: number;
  token: string;
  label: string | null;
  visible_item_ids: number[] | null;
  expires_at: string | null;
  created_by_name: string | null;
  created_at: string;
  accessed_count: number;
  last_accessed_at: string | null;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModule],
  selector: 'app-share-report-modal',
  templateUrl: './share-report-modal.component.html',
  styleUrls: ['./share-report-modal.component.scss']
})
export class ShareReportModalComponent implements OnInit, AfterViewInit {
  @ViewChild('shareReportModal') modalTemplate!: TemplateRef<any>;
  @Input() instanceId!: number;
  @Input() items: any[] = [];      // ChecklistItemProgress[] from parent
  @Input() instance: any;          // ChecklistInstance from parent
  @Output() closed = new EventEmitter<void>();

  private modalRef: NgbModalRef | null = null;
  step: 'select' | 'generating' | 'done' | 'list' = 'select';

  // Item selection
  selectedItemIds: Set<number> = new Set();
  itemSearch = '';
  activePreviewItemId: number | null = null;
  activePreviewMediaUrl: string | null = null;
  activePreviewMediaType: 'image' | 'video' | null = null;

  // Options
  label = '';
  expiresOption: 'never' | '7d' | '30d' | '90d' | 'custom' = 'never';
  customExpiresAt = '';

  // Generated link
  generatedToken: string | null = null;
  generatedUrl: string | null = null;
  generatedTokenData: any = null;  // Store token data for email
  copied = false;

  // Existing tokens
  existingTokens: ShareReportToken[] = [];
  loadingTokens = false;

  // Error
  errorMsg: string | null = null;

  private readonly apiUrl = '/photo-checklist/inspection-report.php';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private modalService: NgbModal,
    private lightbox: Lightbox
  ) {}

  ngOnInit(): void {
    // Default: all items selected
    this.items.forEach(p => {
      const baseId = this.getBaseId(p);
      if (baseId) this.selectedItemIds.add(Number(baseId));
    });
    const firstItem = this.selectableItemsWithMediaFirst[0];
    if (firstItem) {
      this.setActivePreviewItem(firstItem);
    }
    this.loadExistingTokens();
  }

  ngAfterViewInit(): void {
    // Open modal after view is fully initialized
    this.openModal();
  }

  openModal(): void {
    this.modalRef = this.modalService.open(this.modalTemplate, {
      size: 'xl',
      backdrop: 'static',
      keyboard: false,
      centered: true,
      fullscreen: true,
      scrollable: true,
      windowClass: 'share-report-modal-window'
    });
    this.modalRef.result.finally(() => this.close());
  }

  get selectableItems(): any[] {
    // Include all flattened checklist items (top-level + nested)
    return this.items || [];
  }

  get selectableItemsWithMediaFirst(): any[] {
    return [...this.selectableItems].sort((a, b) => this.getMediaCount(b) - this.getMediaCount(a));
  }

  get filteredSelectableItems(): any[] {
    const query = this.itemSearch.trim().toLowerCase();
    if (!query) {
      return this.selectableItemsWithMediaFirst;
    }

    return this.selectableItemsWithMediaFirst.filter((progress) => {
      const title = String(progress?.item?.title || '').toLowerCase();
      const description = this.getItemDescription(progress).toLowerCase();
      return title.includes(query) || description.includes(query);
    });
  }

  get selectedItems(): any[] {
    return this.selectableItemsWithMediaFirst.filter((progress) => this.selectedItemIds.has(this.getBaseId(progress)));
  }

  get activePreviewItem(): any | null {
    if (!this.activePreviewItemId) {
      return this.selectableItemsWithMediaFirst[0] || null;
    }
    return this.selectableItems.find((progress) => this.getBaseId(progress) === this.activePreviewItemId) || null;
  }

  get previewMediaForActive(): Array<{ url: string; type: 'image' | 'video' }> {
    const active = this.activePreviewItem;
    if (!active) {
      return [];
    }

    const photos = this.getPhotoUrls(active).map((url) => ({ url, type: 'image' as const }));
    const videos = this.getVideoUrls(active).map((url) => ({ url, type: 'video' as const }));
    return [...photos, ...videos];
  }

  setActivePreviewItem(progress: any): void {
    const baseId = this.getBaseId(progress);
    if (!baseId) {
      return;
    }

    this.activePreviewItemId = baseId;
    const media = this.previewMediaFor(progress);
    if (media.length > 0) {
      this.activePreviewMediaUrl = media[0].url;
      this.activePreviewMediaType = media[0].type;
    } else {
      this.activePreviewMediaUrl = null;
      this.activePreviewMediaType = null;
    }
  }

  isActivePreview(progress: any): boolean {
    return this.getBaseId(progress) === this.activePreviewItemId;
  }

  selectPreviewMedia(url: string, type: 'image' | 'video', event?: Event): void {
    event?.stopPropagation();
    this.activePreviewMediaUrl = url;
    this.activePreviewMediaType = type;
  }

  openShareMediaViewer(url: string | null, type: 'image' | 'video' | null, event?: Event): void {
    event?.stopPropagation();
    if (!url || !type) {
      return;
    }

    if (type === 'image') {
      const album = [{ src: url, thumb: url, caption: this.activePreviewItem?.item?.title || 'Preview' }];
      this.lightbox.open(album, 0, {});
      return;
    }

    // Fallback for video: open source in a new tab.
    window.open(url, '_blank');
  }

  private previewMediaFor(progress: any): Array<{ url: string; type: 'image' | 'video' }> {
    const photos = this.getPhotoUrls(progress).map((url) => ({ url, type: 'image' as const }));
    const videos = this.getVideoUrls(progress).map((url) => ({ url, type: 'video' as const }));
    return [...photos, ...videos];
  }

  getBaseId(progress: any): number {
    return Number((progress?.item as any)?.baseItemId ?? progress?.item?.id ?? 0);
  }

  getMediaCount(progress: any): number {
    const photos = this.getPhotoUrls(progress).length;
    const videos = this.getVideoUrls(progress).length;
    return photos + videos;
  }

  getPhotoUrls(progress: any): string[] {
    const progressPhotos = Array.isArray(progress?.photos) ? progress.photos : [];
    const itemPhotos = Array.isArray(progress?.item?.photos) ? progress.item.photos : [];
    const merged = [...progressPhotos, ...itemPhotos];

    return merged
      .map((entry: any) => {
        if (typeof entry === 'string') return entry;
        return entry?.url || entry?.file_url || entry?.file_path || null;
      })
      .map((url: string | null) => this.resolveMediaUrl(url || ''))
      .filter((url: string) => !!url)
      .filter((url: string, index: number, arr: string[]) => arr.indexOf(url) === index);
  }

  getVideoUrls(progress: any): string[] {
    const progressVideos = Array.isArray(progress?.videos) ? progress.videos : [];
    const itemVideos = Array.isArray(progress?.item?.videos) ? progress.item.videos : [];
    const merged = [...progressVideos, ...itemVideos];

    return merged
      .map((entry: any) => {
        if (typeof entry === 'string') return entry;
        return entry?.url || entry?.file_url || entry?.file_path || null;
      })
      .map((url: string | null) => this.resolveMediaUrl(url || ''))
      .filter((url: string) => !!url)
      .filter((url: string, index: number, arr: string[]) => arr.indexOf(url) === index);
  }

  private resolveMediaUrl(url: string): string {
    const raw = (url || '').trim();
    if (!raw) {
      return '';
    }
    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }

    const cleanPath = raw.startsWith('/') ? raw.substring(1) : raw;
    return `https://dashboard.eye-fi.com/${cleanPath}`;
  }

  getItemDescription(progress: any): string {
    const raw = String(progress?.item?.description || progress?.item?.details || '').trim();
    if (!raw) {
      return '';
    }

    // API descriptions may contain HTML fragments; render as readable text in the selector/preview UI.
    if (typeof document !== 'undefined') {
      const el = document.createElement('div');
      el.innerHTML = raw;
      return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
    }

    return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  toggleItem(baseId: number): void {
    if (this.selectedItemIds.has(baseId)) {
      this.selectedItemIds.delete(baseId);
    } else {
      this.selectedItemIds.add(baseId);
    }
  }

  selectAll(): void {
    this.items.forEach(p => {
      const baseId = this.getBaseId(p);
      if (baseId) this.selectedItemIds.add(Number(baseId));
    });
  }

  deselectAll(): void {
    this.selectedItemIds.clear();
  }

  get allSelected(): boolean {
    return this.selectableItems.every(p => {
      const baseId = this.getBaseId(p);
      return baseId && this.selectedItemIds.has(Number(baseId));
    });
  }

  isSelected(progress: any): boolean {
    const baseId = this.getBaseId(progress);
    return !!baseId && this.selectedItemIds.has(Number(baseId));
  }

  private buildExpiresAt(): string | null {
    if (this.expiresOption === 'never') return null;
    const d = new Date();
    if (this.expiresOption === '7d')  { d.setDate(d.getDate() + 7);  return d.toISOString(); }
    if (this.expiresOption === '30d') { d.setDate(d.getDate() + 30); return d.toISOString(); }
    if (this.expiresOption === '90d') { d.setDate(d.getDate() + 90); return d.toISOString(); }
    if (this.expiresOption === 'custom' && this.customExpiresAt) {
      return new Date(this.customExpiresAt).toISOString();
    }
    return null;
  }

  generateLink(): void {
    if (this.selectedItemIds.size === 0) {
      this.errorMsg = 'Please select at least one item to share.';
      return;
    }
    this.errorMsg = null;
    this.step = 'generating';

    // Use null (show all) only if ALL items are selected; otherwise pass array
    const allBaseIds = this.items.map(p => this.getBaseId(p)).filter(Boolean);
    const selectedArr = Array.from(this.selectedItemIds);
    const visibleItemIds = selectedArr.length === allBaseIds.length ? null : selectedArr;

    this.http.post<any>(`${this.apiUrl}?request=create_share_token`, {
      instance_id: this.instanceId,
      visible_item_ids: visibleItemIds,
      label: this.label.trim() || null,
      expires_at: this.buildExpiresAt()
    }).subscribe({
      next: (res) => {
        if (res?.success) {
          this.generatedToken = res.token;
          this.generatedUrl = this.buildInspectionReportUrl(res.token);
          this.generatedTokenData = res;  // Store full response
          this.step = 'done';
          this.loadExistingTokens();
        } else {
          this.errorMsg = res?.error || 'Failed to generate link.';
          this.step = 'select';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMsg = err?.error?.error || 'Server error. Please try again.';
        this.step = 'select';
        this.cdr.detectChanges();
      }
    });
  }

  copyLink(): void {
    if (!this.generatedUrl) return;
    navigator.clipboard.writeText(this.generatedUrl).then(() => {
      this.copied = true;
      this.cdr.detectChanges();
      setTimeout(() => { this.copied = false; this.cdr.detectChanges(); }, 2500);
    }).catch(() => {
      // Fallback
      const el = document.createElement('textarea');
      el.value = this.generatedUrl!;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      this.copied = true;
      this.cdr.detectChanges();
      setTimeout(() => { this.copied = false; this.cdr.detectChanges(); }, 2500);
    });
  }

  openInNewTab(): void {
    if (!this.generatedUrl) return;
    window.open(this.generatedUrl, '_blank');
  }

  shareViaEmail(): void {
    if (!this.generatedUrl) return;
    
    // Build email body with rich context
    const lines = [
      'Inspection Report Share',
      '',
      `From: ${this.instance?.operator_name || this.instance?.assigned_to_name || 'A user'}`,
      '',
      'Details:',
      `  Work Order: ${this.instance?.work_order_number || 'N/A'}`,
      `  Serial Number: ${this.instance?.serial_number || 'N/A'}`,
      `  Part Number: ${this.instance?.part_number || 'N/A'}`,
      `  Checklist: ${this.instance?.template_name || 'N/A'}`,
    ];
    
    // Add expiration info if applicable
    if (this.generatedTokenData?.expires_at) {
      const expiresDate = new Date(this.generatedTokenData.expires_at);
      lines.push(`  Expires: ${expiresDate.toLocaleDateString()} at ${expiresDate.toLocaleTimeString()}`);
    }
    
    lines.push('');
    lines.push('View Report:');
    lines.push(this.generatedUrl);
    lines.push('');
    lines.push('---');
    lines.push('This link provides access to the selected inspection items.');
    
    const subject = encodeURIComponent(`Inspection Report - ${this.instance?.work_order_number || 'Work Order'}`);
    const body = encodeURIComponent(lines.join('\n'));
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  }

  newLink(): void {
    this.step = 'select';
    this.generatedToken = null;
    this.generatedUrl = null;
    this.generatedTokenData = null;
    this.copied = false;
    this.label = '';
    this.expiresOption = 'never';
    this.customExpiresAt = '';
  }

  loadExistingTokens(): void {
    this.loadingTokens = true;
    this.http.get<any>(`${this.apiUrl}?request=list_tokens&instance_id=${this.instanceId}`).subscribe({
      next: (res) => {
        this.existingTokens = res?.tokens || [];
        this.loadingTokens = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingTokens = false;
        this.cdr.detectChanges();
      }
    });
  }

  revokeToken(token: ShareReportToken): void {
    if (!confirm(`Revoke link "${token.label || token.token.slice(0, 12) + '...'}"? The customer will no longer be able to access it.`)) return;
    this.http.delete<any>(`${this.apiUrl}?request=delete_token`, { body: { id: token.id } }).subscribe({
      next: () => { this.loadExistingTokens(); },
      error: () => { alert('Failed to revoke link.'); }
    });
  }

  copyTokenUrl(token: ShareReportToken): void {
    const url = this.buildInspectionReportUrl(token.token);
    navigator.clipboard.writeText(url).catch(() => {});
  }

  openTokenInNewTab(token: ShareReportToken): void {
    const url = this.buildInspectionReportUrl(token.token);
    window.open(url, '_blank');
  }

  shareTokenViaEmail(token: ShareReportToken): void {
    const url = this.buildInspectionReportUrl(token.token);
    
    // Build email body with rich context
    const lines = [
      'Inspection Report Share',
      '',
      `From: ${this.instance?.operator_name || this.instance?.assigned_to_name || 'A user'}`,
      '',
      'Details:',
      `  Work Order: ${this.instance?.work_order_number || 'N/A'}`,
      `  Serial Number: ${this.instance?.serial_number || 'N/A'}`,
      `  Part Number: ${this.instance?.part_number || 'N/A'}`,
      `  Checklist: ${this.instance?.template_name || 'N/A'}`,
    ];
    
    // Add expiration info if applicable
    if (token.expires_at) {
      const expiresDate = new Date(token.expires_at);
      lines.push(`  Expires: ${expiresDate.toLocaleDateString()} at ${expiresDate.toLocaleTimeString()}`);
    }
    
    lines.push('');
    lines.push('View Report:');
    lines.push(url);
    lines.push('');
    lines.push('---');
    lines.push('This link provides access to the selected inspection items.');
    
    const subject = encodeURIComponent(`Inspection Report - ${this.instance?.work_order_number || 'Work Order'}`);
    const body = encodeURIComponent(lines.join('\n'));
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  }

  private buildInspectionReportUrl(token: string): string {
    return `${window.location.origin}/dist/web/inspection/report/${token}`;
  }

  formatDate(val: string | null | undefined): string {
    if (!val) return '—';
    try { return new Date(val).toLocaleDateString(); } catch { return val; }
  }

  close(): void {
    this.modalRef?.close();
    this.closed.emit();
  }
}
