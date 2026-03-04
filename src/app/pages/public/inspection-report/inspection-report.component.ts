import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-inspection-report',
  templateUrl: './inspection-report.component.html',
  styleUrls: ['./inspection-report.component.scss']
})
export class InspectionReportComponent implements OnInit {
  loading = true;
  error: string | null = null;
  isExpired = false;

  report: any = null;
  instance: any = null;
  items: any[] = [];
  label: string | null = null;
  expiresAt: string | null = null;

  // Lightbox state
  lightboxUrl: string | null = null;
  lightboxType: 'image' | 'video' = 'image';
  lightboxSource: string | null = null;  // 'camera' | 'library' | null
  lightboxItem: any = null;      // the checklist item context
  lightboxIndex = 0;             // current index within the item's media array
  lightboxTotalCount = 0;        // total media count for the open item
  private lightboxMedia: { url: string; type: 'image' | 'video'; source?: string | null; item: any }[] = [];

  private readonly apiUrl = '/photo-checklist/inspection-report.php';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.loadReport(token);
      } else {
        this.error = 'Invalid report link.';
        this.loading = false;
      }
    });
  }

  private loadReport(token: string): void {
    this.loading = true;
    this.error = null;

    this.http.get<any>(`${this.apiUrl}?request=get_report&token=${encodeURIComponent(token)}`).subscribe({
      next: (data) => {
        if (!data?.success) {
          this.error = data?.error || 'Failed to load report.';
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }
        this.report   = data;
        this.instance = data.instance;
        this.items    = data.items || [];
        this.label    = data.label || null;
        this.expiresAt = data.expires_at || null;
        this.loading  = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        const errorMsg = err?.error?.error || 'Report not found or the link has expired.';
        // Check if error indicates expiration
        if (errorMsg.toLowerCase().includes('expired') || errorMsg.toLowerCase().includes('access denied')) {
          this.isExpired = true;
          this.error = 'This share link has expired. The original Inspector must generate a new link to share the report.';
        } else {
          this.error = errorMsg;
        }
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (!this.lightboxUrl) return;
    if (e.key === 'ArrowLeft')  { e.preventDefault(); this.lightboxPrev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); this.lightboxNext(); }
    if (e.key === 'Escape')     { this.closeLightbox(); }
  }

  openLightboxAt(item: any, kind: 'photo' | 'video', index: number): void {
    // Build a GLOBAL flat list of all media across all items (photos first then videos per item)
    const globalMedia: { url: string; type: 'image' | 'video'; source?: string | null; item: any }[] = [];
    let startIndex = 0;
    let found = false;

    for (const it of (this.items || [])) {
      const photos = (it.photos || []).map((p: any) => ({
        url: typeof p === 'string' ? p : p.url,
        type: 'image' as const,
        source: typeof p === 'string' ? null : (p.source ?? null),
        item: it
      }));
      const videos = (it.videos || []).map((u: string) => ({
        url: u, type: 'video' as const, source: null, item: it
      }));

      const itemMedia = [...photos, ...videos];

      // Find the clicked frame within this item
      if (!found && it === item) {
        const offset = globalMedia.length;
        if (kind === 'photo') {
          startIndex = offset + index;
        } else {
          // clicked a video: offset past this item's photos
          startIndex = offset + (it.photos?.length ?? 0) + index;
        }
        found = true;
      }

      globalMedia.push(...itemMedia);
    }

    this.lightboxMedia      = globalMedia;
    this.lightboxIndex      = startIndex;
    this.lightboxTotalCount = globalMedia.length;
    this._applyLightboxFrame();
  }

  /** Legacy single-item open (kept for safety) */
  openLightbox(url: string, type: 'image' | 'video' = 'image'): void {
    this.lightboxMedia      = [{ url, type, source: null, item: null }];
    this.lightboxIndex      = 0;
    this.lightboxItem       = null;
    this.lightboxTotalCount = 1;
    this._applyLightboxFrame();
  }

  private _applyLightboxFrame(): void {
    const frame = this.lightboxMedia[this.lightboxIndex];
    if (!frame) return;
    this.lightboxUrl    = frame.url;
    this.lightboxType   = frame.type;
    this.lightboxSource = frame.source ?? null;
    this.lightboxItem   = frame.item ?? null;
  }

  lightboxPrev(): void {
    if (this.lightboxTotalCount <= 1) return;
    this.lightboxIndex = (this.lightboxIndex - 1 + this.lightboxTotalCount) % this.lightboxTotalCount;
    this._applyLightboxFrame();
  }

  lightboxNext(): void {
    if (this.lightboxTotalCount <= 1) return;
    this.lightboxIndex = (this.lightboxIndex + 1) % this.lightboxTotalCount;
    this._applyLightboxFrame();
  }

  closeLightbox(): void {
    this.lightboxUrl    = null;
    this.lightboxItem   = null;
    this.lightboxSource = null;
    this.lightboxMedia  = [];
    this.lightboxIndex  = 0;
    this.lightboxTotalCount = 0;
  }

  getItemNumber(item: any): number {
    return (this.items || []).indexOf(item) + 1;
  }

  getStatusClass(item: any): string {
    return item.completed ? 'text-success' : 'text-secondary';
  }

  getStatusIcon(item: any): string {
    return item.completed ? 'mdi mdi-check-circle' : 'mdi mdi-circle-outline';
  }

  getStatusLabel(item: any): string {
    return item.completed ? 'Completed' : 'Pending';
  }

  formatDate(val: string | null | undefined): string {
    if (!val) return '—';
    try { return new Date(val).toLocaleString(); } catch { return val; }
  }

  get completedCount(): number {
    return (this.items || []).filter(i => i.completed).length;
  }

  onImgError(event: Event): void {
    const el = event.target as HTMLElement;
    if (el) el.style.display = 'none';
  }

  isVideo(url: string): boolean {
    const lower = (url || '').toLowerCase();
    return lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('.avi');
  }
}
