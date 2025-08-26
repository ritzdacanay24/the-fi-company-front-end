import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MultiDepartmentReviewAssignment {
  itemId: number;
  reviewerId: number;
  department: string;
  reviewNote?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  sentForReviewBy: number;
}

export interface ReviewDecision {
  reviewId: number;
  itemId: number;
  decision: 'approved' | 'rejected' | 'needs_clarification';
  comment: string;
}

export interface DepartmentReviewSummary {
  department: string;
  total_assigned: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  needs_info_count: number;
}

@Injectable({
  providedIn: 'root'
})
export class MultiDepartmentReviewService {
  private baseUrl = `/operations/material-request-detail`;

  constructor(private http: HttpClient) {}

  // Assign item to multiple departments for review
  assignItemToMultipleDepartments(itemId: number, assignments: MultiDepartmentReviewAssignment[]): Observable<any> {
    const requests = assignments.map(assignment => 
      this.http.put(`${this.baseUrl}?id=${itemId}`, {
        reviewerId: assignment.reviewerId,
        department: assignment.department,
        reviewNote: assignment.reviewNote,
        reviewPriority: assignment.priority,
        sentForReviewBy: assignment.sentForReviewBy
      })
    );

    return new Observable(observer => {
      Promise.all(requests.map(req => req.toPromise()))
        .then(results => {
          observer.next({ success: true, results, assignedCount: assignments.length });
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
        });
    });
  }

  // Submit review decision
  submitReviewDecision(decision: ReviewDecision): Observable<any> {
    return this.http.put(`${this.baseUrl}?id=${decision.itemId}`, {
      reviewId: decision.reviewId,
      reviewDecision: decision.decision,
      reviewComment: decision.comment
    });
  }

  // Get items pending review for a specific reviewer/department
  getItemsForReviewer(reviewerId: number, department?: string): Observable<any> {
    let url = `${this.baseUrl}?reviewer_id=${reviewerId}`;
    if (department) {
      url += `&department=${department}`;
    }
    return this.http.get(url);
  }

  // Get review summary by department for a specific material request
  getReviewSummaryByDepartment(mrfId: number): Observable<DepartmentReviewSummary[]> {
    return this.http.get<DepartmentReviewSummary[]>(`${this.baseUrl}/review-summary?mrf_id=${mrfId}`);
  }

  // Get all reviews for a specific item
  getItemReviews(itemId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/item-reviews?item_id=${itemId}`);
  }

  // Check if all required departments have approved an item
  checkItemApprovalStatus(itemId: number): Observable<{
    allApproved: boolean;
    pendingDepartments: string[];
    rejectedByDepartments: string[];
    needsInfoDepartments: string[];
  }> {
    return this.http.get<any>(`${this.baseUrl}/approval-status?item_id=${itemId}`);
  }

  // Get dashboard data for reviewer
  getReviewerDashboard(reviewerId: number): Observable<{
    pendingReviews: any[];
    completedReviews: any[];
    urgentItems: any[];
    summary: {
      total_assigned: number;
      pending_count: number;
      completed_today: number;
      urgent_pending: number;
    }
  }> {
    return this.http.get<any>(`${this.baseUrl}/reviewer-dashboard?reviewer_id=${reviewerId}`);
  }

  // Bulk approve/reject for a reviewer
  bulkReviewDecision(
    reviewerId: number, 
    itemIds: number[], 
    decision: 'approved' | 'rejected', 
    comment: string
  ): Observable<any> {
    return this.http.post(`${this.baseUrl}/bulk-review`, {
      reviewerId,
      itemIds,
      decision,
      comment
    });
  }

  // Request additional information for an item
  requestMoreInfo(reviewId: number, itemId: number, infoRequest: string): Observable<any> {
    return this.http.put(`${this.baseUrl}?id=${itemId}`, {
      reviewId: reviewId,
      reviewDecision: 'needs_clarification',
      reviewComment: infoRequest
    });
  }

  // Get items that need clarification (for original requestor)
  getItemsNeedingClarification(mrfId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/needs-clarification?mrf_id=${mrfId}`);
  }

  // Provide clarification for an item (by original requestor)
  provideClarification(itemId: number, clarification: string, reassignToSameReviewers: boolean = true): Observable<any> {
    return this.http.put(`${this.baseUrl}/provide-clarification?id=${itemId}`, {
      clarification,
      reassignToSameReviewers
    });
  }
}
