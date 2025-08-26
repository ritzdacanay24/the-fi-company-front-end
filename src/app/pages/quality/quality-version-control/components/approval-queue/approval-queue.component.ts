import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QualityDocument, QualityRevision } from '@app/core/api/quality-version-control/quality-version-control.service';

export interface PendingApproval {
  document: QualityDocument;
  revision: QualityRevision;
}

@Component({
  selector: 'app-approval-queue',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approval-queue.component.html',
  styleUrls: ['./approval-queue.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApprovalQueueComponent {
  @Input() documents: QualityDocument[] = [];
  
  @Output() approveRevision = new EventEmitter<QualityRevision>();
  @Output() rejectRevision = new EventEmitter<QualityRevision>();
  @Output() viewRevisionDetails = new EventEmitter<{document: QualityDocument, revision: QualityRevision}>();

  getPendingApprovals(): PendingApproval[] {
    const pendingApprovals: PendingApproval[] = [];
    
    this.documents.forEach(document => {
      if (document.revisions) {
        document.revisions
          .filter(revision => revision.status === 'pending_approval')
          .forEach(revision => {
            pendingApprovals.push({ document, revision });
          });
      }
    });
    
    // Sort by submission date (newest first)
    return pendingApprovals.sort((a, b) => 
      new Date(b.revision.created_at).getTime() - new Date(a.revision.created_at).getTime()
    );
  }

  getPendingApprovalsCount(): number {
    return this.getPendingApprovals().length;
  }

  onApproveRevision(revision: QualityRevision): void {
    if (confirm(`Are you sure you want to approve revision ${revision.revision_number}?`)) {
      this.approveRevision.emit(revision);
    }
  }

  onRejectRevision(revision: QualityRevision): void {
    const reason = prompt(`Please provide a reason for rejecting revision ${revision.revision_number}:`);
    if (reason && reason.trim()) {
      this.rejectRevision.emit(revision);
    }
  }

  onViewDetails(document: QualityDocument, revision: QualityRevision): void {
    this.viewRevisionDetails.emit({ document, revision });
  }

  getUrgencyLevel(revision: QualityRevision): 'high' | 'medium' | 'low' {
    const daysOld = this.getDaysOld(revision.created_at);
    if (daysOld > 7) return 'high';
    if (daysOld > 3) return 'medium';
    return 'low';
  }

  getUrgencyBadgeClass(urgency: 'high' | 'medium' | 'low'): string {
    switch (urgency) {
      case 'high': return 'bg-danger';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-success';
    }
  }

  getUrgencyText(urgency: 'high' | 'medium' | 'low'): string {
    switch (urgency) {
      case 'high': return 'Urgent';
      case 'medium': return 'Normal';
      case 'low': return 'Low';
    }
  }

  private getDaysOld(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDaysOldText(dateString: string): string {
    const days = this.getDaysOld(dateString);
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  }

  trackByRevisionId(index: number, item: PendingApproval): any {
    return item.revision.id;
  }
}
