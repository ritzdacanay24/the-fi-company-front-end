import {
  Component, OnInit, Input, Output, EventEmitter,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

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
  imports: [CommonModule, FormsModule],
  selector: 'app-share-report-modal',
  templateUrl: './share-report-modal.component.html',
  styleUrls: ['./share-report-modal.component.scss']
})
export class ShareReportModalComponent implements OnInit {
  @Input() instanceId!: number;
  @Input() items: any[] = [];      // ChecklistItemProgress[] from parent
  @Output() closed = new EventEmitter<void>();

  step: 'select' | 'generating' | 'done' | 'list' = 'select';

  // Item selection
  selectedItemIds: Set<number> = new Set();

  // Options
  label = '';
  expiresOption: 'never' | '7d' | '30d' | '90d' | 'custom' = 'never';
  customExpiresAt = '';

  // Generated link
  generatedToken: string | null = null;
  generatedUrl: string | null = null;
  copied = false;

  // Existing tokens
  existingTokens: ShareReportToken[] = [];
  loadingTokens = false;

  // Error
  errorMsg: string | null = null;

  private readonly apiUrl = '/photo-checklist/inspection-report.php';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Default: all items selected
    this.items.forEach(p => {
      const baseId = (p.item as any)?.baseItemId ?? p.item?.id;
      if (baseId) this.selectedItemIds.add(Number(baseId));
    });
    this.loadExistingTokens();
  }

  get selectableItems(): any[] {
    // Include all flattened checklist items (top-level + nested)
    return this.items || [];
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
      const baseId = (p.item as any)?.baseItemId ?? p.item?.id;
      if (baseId) this.selectedItemIds.add(Number(baseId));
    });
  }

  deselectAll(): void {
    this.selectedItemIds.clear();
  }

  get allSelected(): boolean {
    return this.selectableItems.every(p => {
      const baseId = (p.item as any)?.baseItemId ?? p.item?.id;
      return baseId && this.selectedItemIds.has(Number(baseId));
    });
  }

  isSelected(progress: any): boolean {
    const baseId = (progress.item as any)?.baseItemId ?? progress.item?.id;
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
    const allBaseIds = this.items.map(p => Number((p.item as any)?.baseItemId ?? p.item?.id)).filter(Boolean);
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

  shareViaEmail(): void {
    if (!this.generatedUrl) return;
    const subject = encodeURIComponent('Inspection Report');
    const body = encodeURIComponent(`Please find the inspection report at the following link:\n\n${this.generatedUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  }

  newLink(): void {
    this.step = 'select';
    this.generatedToken = null;
    this.generatedUrl = null;
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

  private buildInspectionReportUrl(token: string): string {
    return `${window.location.origin}/dist/web/inspection/report/${token}`;
  }

  formatDate(val: string | null | undefined): string {
    if (!val) return '—';
    try { return new Date(val).toLocaleDateString(); } catch { return val; }
  }

  close(): void {
    this.closed.emit();
  }
}
