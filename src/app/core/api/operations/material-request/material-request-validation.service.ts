import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { Observable } from 'rxjs';
import { AuthenticationService } from '@app/core/services/auth.service';
import moment from 'moment';

export interface MaterialRequestValidationItem {
    id: number;
    partNumber: string;
    description: string;
    qty: number;
    reasonCode: string;
    validationStatus: 'pending' | 'approved' | 'rejected';
    validationComment?: string;
    validatedBy?: number;
    validatedAt?: string;

    // Review summary fields from the view
    total_reviews_assigned?: number;
    pending_reviews?: number;
    approved_reviews?: number;
    rejected_reviews?: number;
    needs_info_reviews?: number;
    overall_review_status?: string;
    reviewing_departments?: string;
    highest_pending_priority?: number;
}

export interface ReviewAssignment {
    reviewerId: number;
    department: string;
    reviewNote?: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    itemIds: number[];
}

@Injectable({
    providedIn: 'root'
})
export class MaterialRequestValidationService {
    private baseUrl = `/operations/material-request-detail`;
    private reviewsUrl = `${this.baseUrl}/reviews`;
    private reviewActionsUrl = `${this.baseUrl}/review-actions`;

    constructor(private http: HttpClient, private autheService: AuthenticationService) { }

    // Get validation statistics for a material request
    getValidationStats(mrfId: number): Observable<any> {
        return this.http.get(`${this.baseUrl}/validation-stats?mrf_id=${mrfId}`);
    }

    // Approve an item (direct validation, not review)
    approveItem(itemId: number, comment?: string): Observable<any> {
        return this.http.put(`${this.baseUrl}/index?id=${itemId}`, {
            validationStatus: 'approved',
            validationComment: comment,
            validatedBy: this.autheService.currentUserValue?.id,
            validatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
        });
    }

    // Reject an item (direct validation, not review)
    rejectItem(itemId: number, comment: string): Observable<any> {
        return this.http.put(`${this.baseUrl}/index?id=${itemId}`, {
            validationStatus: 'rejected',
            validationComment: comment,
            validatedBy: this.autheService.currentUserValue?.id,
            validatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
        });
    }

    // Reset an item back to pending status (undo approve/reject)
    resetItemToPending(itemId: number): Observable<any> {
        return this.http.put(`${this.baseUrl}/index?id=${itemId}`, {
            validationStatus: 'pending',
            validationComment: '',
            validatedBy: null,
            validatedAt: null
        });
    }

    // Send items for review to multiple departments
    sendForReview(assignment: ReviewAssignment): Observable<any> {
        return this.http.post(this.reviewActionsUrl, {
            action: 'bulk_assign',
            items: assignment.itemIds,
            assignments: [{
                reviewerId: assignment.reviewerId,
                department: assignment.department,
                reviewNote: assignment.reviewNote,
                reviewPriority: assignment.priority
            }],
            sentForReviewBy: this.autheService.currentUserValue?.id
        });
    }

    // Get items pending review for a specific reviewer
    getItemsForReview(reviewerId: string): Observable<any> {
        return this.http.get(`${this.baseUrl}/reviewer-dashboard?reviewer_id=${reviewerId}`);
    }

    // Reviewer submits their review (updated to use the reviews table)
    submitReview(reviewId: number, decision: 'approved' | 'rejected', comment: string): Observable<any> {
        return this.http.put(`${this.reviewsUrl}?id=${reviewId}`, {
            reviewDecision: decision,
            reviewComment: comment,
            reviewStatus: 'reviewed'
        });
    }

    // Bulk operations
    bulkApprove(itemIds: number[], comment?: string): Observable<any> {
        const requests = itemIds.map(id => this.approveItem(id, comment));
        return this.executeBulkOperations(requests);
    }

    bulkReject(itemIds: number[], comment: string): Observable<any> {
        const requests = itemIds.map(id => this.rejectItem(id, comment));
        return this.executeBulkOperations(requests);
    }

    private executeBulkOperations(requests: Observable<any>[]): Observable<any> {
        return new Observable(observer => {
            Promise.all(requests.map(req => req.toPromise()))
                .then(results => {
                    observer.next({ success: true, results });
                    observer.complete();
                })
                .catch(error => {
                    observer.error(error);
                });
        });
    }

    // Add comment to item
    addComment(itemId: number, comment: string): Observable<any> {
        return this.http.put(`${this.baseUrl}/index?id=${itemId}`, {
            validationComment: comment
        });
    }

    // Get validation history for an item
    getValidationHistory(itemId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/history?item_id=${itemId}`);
    }

    // Get reviewer dashboard data
    getReviewerDashboard(reviewerId: number): Observable<any> {
        return this.http.get(`${this.reviewsUrl}?reviewer_id=${reviewerId}`);
    }

    // Get review summary for an item
    getItemReviews(itemId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/item-reviews?item_id=${itemId}`);
    }

    // Get review summary for multiple items (bulk)
    getBulkItemReviews(itemIds: number[]): Observable<any> {
        const idsParam = itemIds.join(',');
        return this.http.get<any>(`${this.baseUrl}/bulk-item-reviews?item_ids=${idsParam}`);
    }

    // Get review summary for multiple requests (bulk) - for Kanban board
    getBulkRequestReviews(requestIds: number[]): Observable<any> {
        const idsParam = requestIds.join(',');
        return this.http.get<any>(`${this.baseUrl}/bulk-request-reviews?request_ids=${idsParam}`);
    }

    // Get department summary for a material request
    getDepartmentSummary(mrfId: number): Observable<any> {
        return this.http.post(this.reviewActionsUrl, {
            action: 'department_summary',
            mrfId: mrfId
        });
    }

    // Bulk review operations
    bulkReview(reviewIds: number[], decision: 'approved' | 'rejected', comment: string, reviewerId: number): Observable<any> {
        return this.http.post(this.reviewActionsUrl, {
            action: 'bulk_review',
            reviewIds: reviewIds,
            decision: decision,
            comment: comment,
            reviewerId: reviewerId
        });
    }

    // Request clarification
    requestClarification(reviewId: number, clarificationRequest: string): Observable<any> {
        return this.http.post(this.reviewActionsUrl, {
            action: 'request_clarification',
            reviewId: reviewId,
            clarificationRequest: clarificationRequest
        });
    }

    // Escalate review
    escalateReview(reviewId: number, newReviewerId?: number, escalationReason?: string, escalatedBy?: number): Observable<any> {
        return this.http.post(this.reviewActionsUrl, {
            action: 'escalate_review',
            reviewId: reviewId,
            newReviewerId: newReviewerId,
            escalationReason: escalationReason || 'Overdue review escalation',
            escalatedBy: escalatedBy || this.autheService.currentUserValue?.id
        });
    }

    // ADMIN DASHBOARD METHODS

    // Get all reviews for admin dashboard
    getAllReviewsForAdmin(): Observable<any> {
        return this.http.get(`${this.baseUrl}/material-request-admin-reviews-api.php/admin-dashboard`);
    }

    // Reassign review to different reviewer
    reassignReview(reviewId: number, newReviewerId: string, reason: string): Observable<any> {
        return this.http.post(`${this.baseUrl}/material-request-admin-reviews-api.php/review-actions`, {
            action: 'reassign_review',
            reviewId: reviewId,
            newReviewerId: newReviewerId,
            reassignReason: reason,
            reassignedBy: this.autheService.currentUserValue?.id
        });
    }

    // Send review reminder
    sendReviewReminder(reviewId: number): Observable<any> {
        return this.http.post(`${this.baseUrl}/material-request-admin-reviews-api/review-actions`, {
            action: 'send_reminder',
            reviewId: reviewId,
            sentBy: this.autheService.currentUserValue?.id
        });
    }

    // Escalate reviews (bulk operation)
    escalateReviews(reviewIds: number[]): Observable<any> {
        return this.http.post(`${this.baseUrl}/material-request-admin-reviews-api.php/review-actions`, {
            action: 'escalate_review',
            reviewIds: reviewIds,
            escalatedBy: this.autheService.currentUserValue?.id
        });
    }

    // Cancel review assignment
    cancelReview(reviewId: number): Observable<any> {
        return this.http.post(`${this.baseUrl}/material-request-admin-reviews-api.php/review-actions`, {
            action: 'cancel_review',
            reviewId: reviewId,
            cancelledBy: this.autheService.currentUserValue?.id
        });
    }

    // Update item configuration (AC Code, TR Type)
    updateItemConfiguration(itemId: number, config: { ac_code?: string, trType?: string }): Observable<any> {
        return this.http.put(`${this.baseUrl}/index?id=${itemId}`, config);
    }
}
