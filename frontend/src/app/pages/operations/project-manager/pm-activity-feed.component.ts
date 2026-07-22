import { Component, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

interface ActivityEntry {
  id: number;
  projectId: string;
  entityType: 'project' | 'gate' | 'task';
  entityId: string | null;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  userId: number | null;
  userName: string | null;
  createdAt: string;
}

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-pm-activity-feed',
  template: `
    <div class="pm-activity-feed">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <span class="small fw-semibold text-muted">
          <i class="bx bx-history me-1"></i>Activity Log
        </span>
        <button type="button" class="btn btn-sm btn-link p-0 text-muted" (click)="load()" [disabled]="loading">
          <i class="bx bx-refresh" [class.bx-spin]="loading"></i>
        </button>
      </div>

      <div *ngIf="loading" class="text-center text-muted py-3 small">
        <i class="bx bx-loader-alt bx-spin me-1"></i> Loading...
      </div>

      <div *ngIf="!loading && entries.length === 0" class="text-center text-muted py-3 small">
        No activity recorded yet.
      </div>

      <div *ngIf="!loading && entries.length > 0" class="activity-list">
        <div *ngFor="let entry of entries" class="activity-item">
          <div class="activity-dot" [class]="dotClass(entry)"></div>
          <div class="activity-content">
            <div class="activity-text small">
              <span class="fw-semibold me-1" *ngIf="entry.userName">{{ entry.userName }}</span>
              <span class="badge badge-sm me-1" [class]="entityBadgeClass(entry)" [style.background]="entry.entityType === 'gate' ? 'var(--vz-primary)' : null">{{ entry.entityType }}</span>
              {{ formatAction(entry) }}
            </div>
            <div class="activity-meta text-muted" style="font-size:11px;">
              {{ formatTimestamp(entry.createdAt) }}
              <span *ngIf="entry.entityId && entry.entityType !== 'project'" class="ms-1 text-muted">· {{ entry.entityId }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pm-activity-feed { font-size: 13px; }
    .activity-list { max-height: 340px; overflow-y: auto; }
    .activity-item {
      display: flex;
      gap: 8px;
      padding: 6px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .activity-item:last-child { border-bottom: none; }
    .activity-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-top: 5px;
      flex-shrink: 0;
    }
    .activity-content { flex: 1; min-width: 0; }
    .activity-text { line-height: 1.4; }
    .dot-project { background: var(--vz-primary); }
    .dot-gate    { background: var(--vz-primary); }
    .dot-task    { background: #198754; }
    .dot-delete  { background: #dc3545; }
    .badge-sm { font-size: 10px; padding: 2px 5px; }
  `],
})
export class PmActivityFeedComponent implements OnChanges, OnDestroy {
  @Input() projectId: string | null = null;
  @Input() entityType?: 'project' | 'gate' | 'task';
  @Input() entityId?: string;
  @Input() autoRefreshSeconds = 0;

  entries: ActivityEntry[] = [];
  loading = false;

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectId'] && this.projectId) {
      void this.load();
      this.startAutoRefresh();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  async load(): Promise<void> {
    if (!this.projectId) return;
    this.loading = true;

    try {
      const params = new URLSearchParams();
      if (this.entityType) params.set('entityType', this.entityType);
      if (this.entityId) params.set('entityId', this.entityId);
      params.set('limit', '100');

      const url = `${environment.pmApiUrl}/${encodeURIComponent(this.projectId)}/activity?${params}`;
      this.entries = await firstValueFrom(this.http.get<ActivityEntry[]>(url));
    } catch {
      this.entries = [];
    } finally {
      this.loading = false;
    }
  }

  formatAction(entry: ActivityEntry): string {
    const hasOld = entry.oldValue !== null && entry.oldValue !== undefined && String(entry.oldValue).trim() !== '';
    const hasNew = entry.newValue !== null && entry.newValue !== undefined && String(entry.newValue).trim() !== '';

    switch (entry.action) {
      case 'created':
        return `created${hasNew ? ': ' + entry.newValue : ''}`;
      case 'deleted':
        return `deleted${hasOld ? ': ' + entry.oldValue : ''}`;
      case 'status_changed':
      case 'field_changed': {
        const field = entry.fieldName ?? 'field';
        if (!hasOld && hasNew) {
          return `set ${field} to: ${entry.newValue}`;
        }
        if (hasOld && !hasNew) {
          return `cleared ${field} (was: ${entry.oldValue})`;
        }
        return `updated ${field}: ${entry.oldValue} → ${entry.newValue}`;
      }
      default:
        return entry.action + (entry.fieldName ? ` (${entry.fieldName})` : '');
    }
  }

  dotClass(entry: ActivityEntry): string {
    if (entry.action === 'deleted') return 'activity-dot dot-delete';
    return `activity-dot dot-${entry.entityType}`;
  }

  entityBadgeClass(entry: ActivityEntry): string {
    const map: Record<string, string> = {
      project: 'bg-primary text-white',
      gate: 'text-white',
      task: 'bg-success text-white',
    };
    return `badge ${map[entry.entityType] ?? 'bg-secondary text-white'}`;
  }

  formatTimestamp(ts: string): string {
    if (!ts) return '';
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }).format(new Date(ts));
    } catch {
      return ts;
    }
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    if (this.autoRefreshSeconds > 0) {
      this.refreshTimer = setInterval(() => void this.load(), this.autoRefreshSeconds * 1000);
    }
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer !== null) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
