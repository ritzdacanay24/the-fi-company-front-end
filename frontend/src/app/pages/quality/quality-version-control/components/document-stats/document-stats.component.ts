import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VersionControlStats, QualityDocument } from '@app/core/api/quality-version-control/quality-version-control.service';

@Component({
  selector: 'app-document-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-stats.component.html',
  styleUrls: ['./document-stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentStatsComponent {
  @Input() stats: VersionControlStats | null = null;
  @Input() documents: QualityDocument[] = [];

  // Computed getters for template binding
  get totalDocumentsCount(): number {
    return this.stats?.total_documents || this.documents.length;
  }

  get activeDocumentsCount(): number {
    return this.stats?.active_documents || this.documents.filter(d => d.status === 'approved').length;
  }

  get totalRevisionsCount(): number {
    let count = 0;
    this.documents.forEach(doc => {
      if (doc.revisions) {
        count += doc.revisions.length;
      }
    });
    return count;
  }

  get pendingApprovalsCount(): number {
    let count = 0;
    this.documents.forEach(doc => {
      if (doc.revisions) {
        count += doc.revisions.filter(rev => rev.status === 'pending_approval').length;
      }
    });
    return count;
  }

  // Computed statistics methods (keep for more complex calculations)
  getTotalRevisionsCount(): number {
    return this.totalRevisionsCount;
  }

  getPendingApprovalsCount(): number {
    return this.pendingApprovalsCount;
  }

  getDocumentsByStatus(): { status: string, count: number, percentage: number }[] {
    if (!this.documents.length) return [];

    const statusCounts = this.documents.reduce((acc, doc) => {
      const status = doc.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = this.documents.length;
    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / total) * 100)
    }));
  }

  getDocumentsByType(): { type: string, count: number, percentage: number }[] {
    if (!this.documents.length) return [];

    const typeCounts = this.documents.reduce((acc, doc) => {
      const type = this.getDocumentTypeFromPrefix(doc.prefix);
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = this.documents.length;
    return Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / total) * 100)
    }));
  }

  getRecentActivity(): { action: string, document: string, date: Date }[] {
    // This would ideally come from an activity log service
    // For now, we'll derive it from document update dates
    return this.documents
      .filter(doc => doc.updated_at)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5)
      .map(doc => ({
        action: 'Updated',
        document: doc.document_number,
        date: new Date(doc.updated_at)
      }));
  }

  private getDocumentTypeFromPrefix(prefix: string): string {
    if (!prefix) return 'DOC';
    return prefix.split('-').pop() || 'DOC';
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'draft': 'bg-secondary',
      'pending_approval': 'bg-warning',
      'approved': 'bg-success',
      'superseded': 'bg-info',
      'obsolete': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
  }

  getTypeBadgeClass(type: string): string {
    const classes: Record<string, string> = {
      'FRM': 'bg-primary',
      'SOP': 'bg-info',
      'CHK': 'bg-success',
      'INS': 'bg-warning',
      'QCP': 'bg-danger',
      'WI': 'bg-secondary'
    };
    return classes[type] || 'bg-secondary';
  }
}
