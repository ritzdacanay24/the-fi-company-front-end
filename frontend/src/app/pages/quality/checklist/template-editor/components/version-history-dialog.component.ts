import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PhotoChecklistConfigService } from '../../../../../core/api/photo-checklist-config/photo-checklist-config.service';

interface TemplateHistoryEntry {
  id: number;
  template_id: number;
  version: string;
  change_type: string;
  changed_by: number | null;
  change_summary: string;
  changes_json: string | any;
  created_at: string;
  template_name?: string;
}

export interface VersionHistoryDialogData {
  templateGroupId: number;
  currentTemplateId: number;
  templateName: string;
}

@Component({
  selector: 'app-version-history-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="me-2">history</mat-icon>
      Version History: {{ data.templateName }}
    </h2>

    <mat-dialog-content class="py-3">
      <div *ngIf="loading" class="text-center py-5">
        <mat-spinner diameter="40"></mat-spinner>
        <div class="mt-3 text-muted">Loading version history...</div>
      </div>

      <div *ngIf="!loading && error" class="alert alert-danger">
        <mat-icon class="me-2">error</mat-icon>
        {{ error }}
      </div>

      <div *ngIf="!loading && !error" class="version-timeline">
        <!-- No history -->
        <div *ngIf="history.length === 0" class="text-center py-5 text-muted">
          <mat-icon style="font-size: 48px; width: 48px; height: 48px;">history_toggle_off</mat-icon>
          <div class="mt-2">No version history available</div>
        </div>

        <!-- Timeline -->
        <div class="timeline">
          <div *ngFor="let entry of history; let i = index; let isFirst = first" 
               class="timeline-item"
               [class.active]="entry.template_id === data.currentTemplateId">
            
            <div class="timeline-marker">
              <div class="timeline-dot" [class.active]="entry.template_id === data.currentTemplateId">
                <mat-icon>{{ getChangeIcon(entry.change_type) }}</mat-icon>
              </div>
              <div class="timeline-line" *ngIf="!isFirst"></div>
            </div>

            <div class="timeline-content">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <span class="badge bg-primary me-2">v{{ entry.version }}</span>
                  <span *ngIf="entry.template_id === data.currentTemplateId" 
                        class="badge bg-success">Current</span>
                  <span class="badge bg-secondary ms-1">{{ entry.change_type }}</span>
                </div>
                <span class="text-muted small">{{ formatDate(entry.created_at) }}</span>
              </div>

              <div class="change-summary mb-2">
                {{ entry.change_summary }}
              </div>

              <!-- Expandable Details -->
              <mat-expansion-panel *ngIf="hasChangeDetails(entry)">
                <mat-expansion-panel-header>
                  <mat-panel-title>
                    <mat-icon class="me-2 small-icon">visibility</mat-icon>
                    View Details
                  </mat-panel-title>
                </mat-expansion-panel-header>

                <div class="change-details">
                  <div *ngIf="getChanges(entry).fields_changed?.length > 0" class="mb-3">
                    <div class="fw-bold mb-2">
                      <mat-icon class="small-icon me-1">edit</mat-icon>
                      Fields Changed:
                    </div>
                    <div class="ms-3">
                      <mat-chip *ngFor="let field of getChanges(entry).fields_changed" 
                                class="me-1 mb-1">
                        {{ formatFieldName(field) }}
                      </mat-chip>
                    </div>
                  </div>

                  <div *ngIf="getChanges(entry).items_added?.length > 0" class="mb-3">
                    <div class="fw-bold text-success mb-2">
                      <mat-icon class="small-icon me-1">add_circle</mat-icon>
                      Added {{ getChanges(entry).items_added.length }} item(s)
                    </div>
                    <ul class="ms-3">
                      <li *ngFor="let item of getChanges(entry).items_added">
                        {{ item.title }}
                      </li>
                    </ul>
                  </div>

                  <div *ngIf="getChanges(entry).items_removed?.length > 0" class="mb-3">
                    <div class="fw-bold text-danger mb-2">
                      <mat-icon class="small-icon me-1">remove_circle</mat-icon>
                      Removed {{ getChanges(entry).items_removed.length }} item(s)
                    </div>
                    <ul class="ms-3">
                      <li *ngFor="let item of getChanges(entry).items_removed">
                        {{ item.title }}
                      </li>
                    </ul>
                  </div>

                  <div *ngIf="getChanges(entry).items_modified?.length > 0" class="mb-3">
                    <div class="fw-bold text-warning mb-2">
                      <mat-icon class="small-icon me-1">edit_note</mat-icon>
                      Modified {{ getChanges(entry).items_modified.length }} item(s)
                    </div>
                    <ul class="ms-3">
                      <li *ngFor="let item of getChanges(entry).items_modified">
                        {{ item.title }}
                      </li>
                    </ul>
                  </div>
                </div>
              </mat-expansion-panel>
            </div>
          </div>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onClose()">
        <mat-icon>close</mat-icon>
        Close
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      max-height: 70vh;
      overflow-y: auto;
    }

    .timeline {
      position: relative;
      padding: 20px 0;
    }

    .timeline-item {
      display: flex;
      margin-bottom: 30px;
      position: relative;
    }

    .timeline-item.active .timeline-content {
      border-left: 3px solid #28a745;
      background: #f0f8f4;
    }

    .timeline-marker {
      position: relative;
      margin-right: 20px;
    }

    .timeline-dot {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #e9ecef;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid #fff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      position: relative;
      z-index: 2;
    }

    .timeline-dot.active {
      background: #28a745;
      color: white;
    }

    .timeline-dot mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .timeline-line {
      position: absolute;
      width: 2px;
      background: #dee2e6;
      top: 40px;
      bottom: -30px;
      left: 19px;
      z-index: 1;
    }

    .timeline-content {
      flex: 1;
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .change-summary {
      color: #6c757d;
      line-height: 1.5;
    }

    .change-details {
      padding: 12px 0;
      font-size: 14px;
    }

    .small-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      vertical-align: middle;
    }

    mat-chip {
      font-size: 11px;
      min-height: 24px;
    }

    ::ng-deep .mat-expansion-panel {
      box-shadow: none !important;
      border-top: 1px solid #dee2e6;
      margin-top: 12px;
    }

    ::ng-deep .mat-expansion-panel-header {
      padding: 8px 16px;
      height: auto !important;
    }
  `]
})
export class VersionHistoryDialogComponent implements OnInit {
  loading = true;
  error = '';
  history: TemplateHistoryEntry[] = [];

  constructor(
    public dialogRef: MatDialogRef<VersionHistoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VersionHistoryDialogData,
    private checklistService: PhotoChecklistConfigService
  ) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loading = true;
    this.error = '';

    // Call the new API endpoint
    this.checklistService.getTemplateHistory(this.data.templateGroupId)
      .subscribe({
        next: (response: any) => {
          this.history = response;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load version history';
          console.error('Error loading history:', err);
          this.loading = false;
        }
      });
  }

  getChangeIcon(changeType: string): string {
    const icons: { [key: string]: string } = {
      'created': 'add_circle',
      'version_created': 'new_releases',
      'field_updated': 'edit',
      'item_added': 'playlist_add',
      'item_removed': 'playlist_remove',
      'item_modified': 'edit_note'
    };
    return icons[changeType] || 'change_history';
  }

  hasChangeDetails(entry: TemplateHistoryEntry): boolean {
    try {
      const changes = this.getChanges(entry);
      return !!(
        changes.fields_changed?.length ||
        changes.items_added?.length ||
        changes.items_removed?.length ||
        changes.items_modified?.length
      );
    } catch {
      return false;
    }
  }

  getChanges(entry: TemplateHistoryEntry): any {
    try {
      if (typeof entry.changes_json === 'string') {
        return JSON.parse(entry.changes_json);
      }
      return entry.changes_json || {};
    } catch {
      return {};
    }
  }

  formatFieldName(field: string): string {
    return field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today, ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday, ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
