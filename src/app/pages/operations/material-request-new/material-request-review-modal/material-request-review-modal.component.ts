import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { MaterialRequestValidationService } from '@app/core/api/operations/material-request/material-request-validation.service';
import { AuthenticationService } from '@app/core/services/auth.service';

interface ReviewItem {
  id: number;
  requestId: string;
  itemId: string;
  partNumber: string;
  description: string;
  quantity: number;
  reviewerId: string;
  reviewerName: string;
  reviewerDepartment: string;
  reviewType: string;
  reviewPriority: string;
  reviewStatus: string;
  reviewComments: string;
  reviewDate: string;
  dueDate: string;
  canReview: boolean;
  isOverdue: boolean;
  newComments?: string;
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-material-request-review-modal',
  template: `
    <div class="modal-header bg-info bg-gradient border-bottom border-none position-relative overflow-hidden">
      <div class="d-flex align-items-center w-100">
        <div class="d-flex align-items-center">
          <span class="bg-light rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm"
            style="width: 3rem; height: 3rem;">
            <i class="mdi mdi-account-group fs-3"></i>
          </span>
          <div>
            <h4 class="modal-title mb-1 fw-bold text-white">Material Request Review</h4>
            <div class="d-flex align-items-center gap-3">
              <span class="badge bg-light text-dark fs-6 px-3 py-2">
                <i class="mdi mdi-barcode me-1"></i>
                {{ request?.request_number || request?.requestNumber }}
              </span>
              <span class="small text-white">
                <i class="mdi mdi-account-check-outline me-1"></i>
                Department & Specialist Reviews
              </span>
            </div>
          </div>
        </div>
        <div class="ms-auto">
          <button type="button" 
                  class="btn-close btn-close-white position-relative shadow-sm" 
                  (click)="onClose()" 
                  aria-label="Close">
          </button>
        </div>
      </div>
      <div class="position-absolute" style="top: -30px; right: -30px; opacity: 0.08;">
        <i class="mdi mdi-account-group" style="font-size: 10rem; transform: rotate(15deg);"></i>
      </div>
    </div>

    <div class="modal-body p-0">
      <div *ngIf="isLoading" class="text-center p-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2 text-muted">Loading review information...</p>
      </div>

      <div *ngIf="!isLoading">
        <!-- Review Summary Header -->
        <div class="bg-light border-bottom p-3">
          <div class="row">
            <div class="col-md-3">
              <div class="text-center">
                <div class="badge bg-warning fs-6 px-3 py-2">{{ summary.pending || 0 }}</div>
                <small class="d-block text-muted mt-1">Pending Reviews</small>
              </div>
            </div>
            <div class="col-md-3">
              <div class="text-center">
                <div class="badge bg-success fs-6 px-3 py-2">{{ summary.completed || 0 }}</div>
                <small class="d-block text-muted mt-1">Completed</small>
              </div>
            </div>
            <div class="col-md-3">
              <div class="text-center">
                <div class="badge bg-danger fs-6 px-3 py-2">{{ summary.overdue || 0 }}</div>
                <small class="d-block text-muted mt-1">Overdue</small>
              </div>
            </div>
            <div class="col-md-3">
              <div class="text-center">
                <div class="badge bg-info fs-6 px-3 py-2">{{ summary.myReviews || 0 }}</div>
                <small class="d-block text-muted mt-1">My Reviews</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Review Items -->
        <div class="p-3">
          <div *ngIf="reviewItems.length === 0" class="text-center py-4">
            <i class="mdi mdi-account-group" style="font-size: 3rem; color: #ccc;"></i>
            <h5 class="mt-3">No reviews found</h5>
            <p class="text-muted">No reviews have been assigned for this request.</p>
          </div>

          <div *ngFor="let item of reviewItems; trackBy: trackByReviewId" 
               class="card mb-3"
               [class.border-warning]="item.canReview && item.reviewStatus === 'pending'"
               [class.border-success]="item.reviewStatus === 'approved'"
               [class.border-danger]="item.reviewStatus === 'rejected'">
            <div class="card-header bg-white border-bottom">
              <div class="row align-items-center">
                <div class="col-md-5">
                  <h6 class="mb-0">
                    {{ item.partNumber }}
                    <span class="badge bg-light text-dark ms-2" *ngIf="item.canReview">
                      <i class="mdi mdi-account-check me-1"></i>
                      Your Review
                    </span>
                  </h6>
                  <small class="text-muted">{{ item.description }}</small>
                </div>
                <div class="col-md-3">
                  <span class="badge"
                        [ngClass]="{
                          'bg-success': item.reviewStatus === 'approved',
                          'bg-danger': item.reviewStatus === 'rejected',
                          'bg-warning': item.reviewStatus === 'pending',
                          'bg-info': item.reviewStatus === 'clarification_needed'
                        }">
                    {{ getStatusText(item.reviewStatus) }}
                  </span>
                  <span class="badge bg-danger ms-1" *ngIf="item.isOverdue">
                    <i class="mdi mdi-clock-alert me-1"></i>
                    Overdue
                  </span>
                </div>
                <div class="col-md-4 text-end">
                  <small class="text-muted">Qty: {{ item.quantity }}</small>
                  <br>
                  <small class="text-muted">{{ item.reviewerName }}</small>
                </div>
              </div>
            </div>
            
            <div class="card-body">
              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label fw-bold">Reviewer Information</label>
                    <div class="d-flex align-items-center">
                      <i class="mdi mdi-account me-2"></i>
                      <div>
                        <div class="fw-medium">{{ item.reviewerName }}</div>
                        <small class="text-muted">{{ item.reviewerDepartment }}</small>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label fw-bold">Review Details</label>
                    <div>
                      <div class="d-flex justify-content-between">
                        <span>Type:</span>
                        <span class="badge bg-secondary">{{ item.reviewType }}</span>
                      </div>
                      <div class="d-flex justify-content-between mt-1">
                        <span>Priority:</span>
                        <span class="badge"
                              [ngClass]="{
                                'bg-danger': item.reviewPriority === 'urgent',
                                'bg-warning': item.reviewPriority === 'high',
                                'bg-info': item.reviewPriority === 'normal',
                                'bg-light text-dark': item.reviewPriority === 'low'
                              }">
                          {{ item.reviewPriority }}
                        </span>
                      </div>
                      <div class="d-flex justify-content-between mt-1" *ngIf="item.dueDate">
                        <span>Due Date:</span>
                        <span [class]="item.isOverdue ? 'text-danger fw-bold' : 'text-muted'">
                          {{ formatDate(item.dueDate) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Review Comments -->
              <div class="mb-3" *ngIf="item.reviewComments">
                <label class="form-label fw-bold">Review Comments</label>
                <div class="bg-light p-2 rounded">
                  <p class="mb-0">{{ item.reviewComments }}</p>
                  <small class="text-muted" *ngIf="item.reviewDate">
                    <i class="mdi mdi-clock-outline me-1"></i>
                    {{ formatDate(item.reviewDate) }}
                  </small>
                </div>
              </div>

              <!-- Debug Info (remove this later) -->
              <div class="mb-3 p-2 bg-warning bg-opacity-10 rounded">
                <small class="text-muted">
                  <strong>Debug Info:</strong><br>
                  canReview: {{ item.canReview }}<br>
                  reviewStatus: {{ item.reviewStatus }}<br>
                  reviewerId: {{ item.reviewerId }}<br>
                  currentUserId: {{ currentUser?.id }}<br>
                  showActions: {{ item.canReview && item.reviewStatus === 'pending' }}
                </small>
              </div>

              <!-- Review Actions (only for current user's reviews) -->
              <div *ngIf="item.canReview && item.reviewStatus === 'pending'" class="border-top pt-3">
                <div class="mb-3">
                  <label class="form-label fw-bold">Review Comments</label>
                  <textarea class="form-control" 
                            rows="3" 
                            [(ngModel)]="item.newComments"
                            placeholder="Enter your review comments here (required for rejection)..."></textarea>
                  <small class="text-muted mt-1">
                    <i class="mdi mdi-information me-1"></i>
                    Comments are required when rejecting or requesting clarification
                  </small>
                </div>
                
                <!-- Quick Action Buttons -->
                <div class="d-flex gap-2 mb-3">
                  <button type="button" 
                          class="btn btn-success btn-sm"
                          (click)="submitReview(item, 'approved')"
                          [disabled]="isSubmitting">
                    <i class="mdi mdi-check me-1"></i>
                    Approve
                  </button>
                  <button type="button" 
                          class="btn btn-danger btn-sm"
                          (click)="submitReview(item, 'rejected')"
                          [disabled]="isSubmitting">
                    <i class="mdi mdi-close me-1"></i>
                    Reject
                  </button>
                  <button type="button" 
                          class="btn btn-warning btn-sm"
                          (click)="submitReview(item, 'clarification_needed')"
                          [disabled]="isSubmitting">
                    <i class="mdi mdi-help-circle me-1"></i>
                    Need Clarification
                  </button>
                </div>
                
                <!-- Quick Comment Templates -->
                <div class="mb-3">
                  <label class="form-label fw-bold">Quick Comments</label>
                  <div class="d-flex flex-wrap gap-2">
                    <button type="button" 
                            class="btn btn-outline-secondary btn-sm"
                            (click)="addQuickComment(item, 'Part approved for standard use')">
                      Standard Approval
                    </button>
                    <button type="button" 
                            class="btn btn-outline-secondary btn-sm"
                            (click)="addQuickComment(item, 'Please verify part specifications')">
                      Verify Specs
                    </button>
                    <button type="button" 
                            class="btn btn-outline-secondary btn-sm"
                            (click)="addQuickComment(item, 'Alternative part recommended')">
                      Alternative
                    </button>
                    <button type="button" 
                            class="btn btn-outline-secondary btn-sm"
                            (click)="addQuickComment(item, 'Quantity needs adjustment')">
                      Adjust Qty
                    </button>
                    <button type="button" 
                            class="btn btn-outline-secondary btn-sm"
                            (click)="addQuickComment(item, 'Not available in inventory')">
                      Not Available
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- Show message when no actions available -->
              <div *ngIf="!(item.canReview && item.reviewStatus === 'pending')" class="border-top pt-3 text-center">
                <p class="text-muted mb-0">
                  <i class="mdi mdi-information me-1"></i>
                  <span *ngIf="item.reviewStatus !== 'pending'">This item has already been reviewed</span>
                  <span *ngIf="item.reviewStatus === 'pending' && !item.canReview">This review is assigned to another user</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-footer bg-light border-top">
      <div class="d-flex w-100 justify-content-between align-items-center">
        <div class="d-flex align-items-center gap-3">
          <small class="text-muted">
            <i class="mdi mdi-information me-1"></i>
            Review all assigned items for this material request
          </small>
          
          <!-- Bulk Actions -->
          <div class="d-flex gap-2" *ngIf="getMyPendingReviews().length > 1">
            <button type="button" 
                    class="btn btn-outline-success btn-sm"
                    (click)="bulkApprove()"
                    [disabled]="isSubmitting">
              <i class="mdi mdi-check-all me-1"></i>
              Approve All Mine ({{ getMyPendingReviews().length }})
            </button>
            <button type="button" 
                    class="btn btn-outline-primary btn-sm"
                    (click)="markAllAsReviewed()"
                    [disabled]="isSubmitting">
              <i class="mdi mdi-eye me-1"></i>
              Mark All Reviewed
            </button>
          </div>
        </div>
        
        <div class="d-flex gap-2">
          <button type="button" 
                  class="btn btn-primary btn-sm"
                  (click)="refreshReviews()"
                  [disabled]="isLoading">
            <i class="mdi mdi-refresh me-1"></i>
            Refresh
          </button>
          <button type="button" 
                  class="btn btn-secondary"
                  (click)="onClose()">
            Close
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      border: 1px solid #e9ecef;
      box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
    }
    
    .card-header {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    }
    
    .badge {
      font-size: 0.75rem;
    }
    
    .btn-sm {
      padding: 0.25rem 0.5rem;
      font-size: 0.875rem;
    }
    
    .form-control {
      border-radius: 0.375rem;
    }
    
    .bg-light {
      background-color: #f8f9fa !important;
    }
  `]
})
export class MaterialRequestReviewModalComponent implements OnInit, OnDestroy {
  @Input() request: any;
  @Input() title: string = 'Material Request Review';

  reviewItems: ReviewItem[] = [];
  summary: any = {
    pending: 0,
    completed: 0,
    overdue: 0,
    myReviews: 0
  };
  
  isLoading = false;
  isSubmitting = false;
  currentUser: any;

  constructor(
    public activeModal: NgbActiveModal,
    private toastr: ToastrService,
    private validationService: MaterialRequestValidationService,
    private authService: AuthenticationService
  ) {
    this.currentUser = this.authService.currentUserValue;

    console.log(this.currentUser)
  }

  ngOnInit(): void {
    if (this.request) {
      this.loadReviewData();
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  async loadReviewData() {
    this.isLoading = true;
    try {
      const currentUserId = this.currentUser?.id;
      const response: any = await this.validationService.getItemsForReview(currentUserId).toPromise();
      
      // Combine both pending and completed reviews
      const allItems = [
        ...(response.pendingReviews || []),
        ...(response.completedReviews || [])
      ];
      
      // Filter items for this specific request and map API response to ReviewItem interface
      this.reviewItems = allItems
        .filter(item => {
          // Handle different request number formats
          const reviewRequestNumber = item.requestNumber;
          const modalRequestNumber = this.request.request_number || this.request.requestNumber;
          
          // Extract numeric part from request numbers for comparison
          const extractNumber = (str: string) => {
            if (!str) return '';
            const match = str.match(/\d+/);
            if (match) {
              // Convert to number and back to string to remove leading zeros
              return parseInt(match[0], 10).toString();
            }
            return str;
          };
          
          const reviewNumber = extractNumber(reviewRequestNumber);
          const modalNumber = extractNumber(modalRequestNumber);
          
          // Check all possible matches
          return reviewRequestNumber === modalRequestNumber || 
                 reviewNumber === modalNumber ||
                 reviewRequestNumber === modalNumber ||
                 reviewNumber === modalRequestNumber;
        })
        .map(item => ({
          id: parseInt(item.id),
          requestId: this.request.id || this.request.request_number,
          itemId: item.mrf_det_id,
          partNumber: item.partNumber,
          description: item.description,
          quantity: parseInt(item.qty),
          reviewerId: item.reviewerId,
          reviewerName: item.requestor || 'Unknown Reviewer',
          reviewerDepartment: item.department || 'Unknown Department',
          reviewType: 'department', // Default type
          reviewPriority: item.reviewPriority || 'normal',
          reviewStatus: item.reviewDecision || this.mapReviewStatus(item.reviewStatus),
          reviewComments: item.reviewComment || item.reviewNote || '',
          reviewDate: item.reviewedAt || '',
          dueDate: item.dueDate || '',
          canReview: false, // Will be set below
          isOverdue: this.isItemOverdue(item.dueDate),
          newComments: ''
        }));
      
      // Calculate summary for this specific request
      this.summary = {
        pending: this.reviewItems.filter(item => item.reviewStatus === 'pending').length,
        completed: this.reviewItems.filter(item => item.reviewStatus !== 'pending').length,
        overdue: this.reviewItems.filter(item => item.isOverdue).length,
        myReviews: this.reviewItems.filter(item => String(item.reviewerId) === String(currentUserId)).length
      };
      
      // Mark items that can be reviewed by current user
      this.reviewItems = this.reviewItems.map(item => ({
        ...item,
        canReview: this.canUserReviewItem(item)
      }));
      
    } catch (error) {
      console.error('Error loading review data:', error);
      this.toastr.error('Error loading review information');
    } finally {
      this.isLoading = false;
    }
  }

  canUserReviewItem(item: ReviewItem): boolean {
    // User can review if they are the assigned reviewer and status is pending
    const canReview = Number(item.reviewerId) === this.currentUser?.id && item.reviewStatus === 'pending';
    console.log('canUserReviewItem check:', {
      itemId: item.id,
      partNumber: item.partNumber,
      reviewerId: item.reviewerId,
      currentUserId: this.currentUser?.id,
      reviewStatus: item.reviewStatus,
      canReview
    });
    return canReview;
  }

  mapReviewStatus(apiStatus: string): string {
    switch (apiStatus) {
      case 'pending_review':
        return 'pending';
      case 'reviewed':
        return 'approved'; // Default for reviewed items, will be overridden by reviewDecision
      default:
        return apiStatus;
    }
  }

  isItemOverdue(dueDate: string): boolean {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }

  addQuickComment(item: ReviewItem, comment: string) {
    if (item.newComments && item.newComments.trim()) {
      item.newComments += '\n' + comment;
    } else {
      item.newComments = comment;
    }
  }

  async submitReview(item: ReviewItem, status: string) {
    // Enhanced validation
    if ((status === 'rejected' || status === 'clarification_needed') && !item.newComments?.trim()) {
      this.toastr.warning(`Please provide comments when ${status === 'rejected' ? 'rejecting' : 'requesting clarification for'} an item`);
      return;
    }

    // Confirmation for important actions
    if (status === 'rejected') {
      if (!confirm(`Are you sure you want to reject "${item.partNumber}"? This action cannot be undone.`)) {
        return;
      }
    }

    this.isSubmitting = true;
    try {
      await this.validationService.submitReview(
        item.id,
        status as 'approved' | 'rejected',
        item.newComments || ''
      ).toPromise();

      const statusText = this.getStatusText(status);
      this.toastr.success(`${statusText} review submitted for ${item.partNumber}`);
      
      // Clear the comments after successful submission
      item.newComments = '';
      
      // Refresh the review data
      await this.loadReviewData();
      
    } catch (error) {
      console.error('Error submitting review:', error);
      this.toastr.error('Error submitting review');
    } finally {
      this.isSubmitting = false;
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'clarification_needed': return 'Clarification Needed';
      case 'pending': return 'Pending Review';
      case 'pending_review': return 'Pending Review';
      case 'reviewed': return 'Reviewed';
      default: return status || 'Unknown';
    }
  }

  getMyPendingReviews(): ReviewItem[] {
    return this.reviewItems.filter(item => item.canReview && item.reviewStatus === 'pending');
  }

  async bulkApprove() {
    const myPendingReviews = this.getMyPendingReviews();
    
    if (myPendingReviews.length === 0) {
      this.toastr.warning('No pending reviews to approve');
      return;
    }

    const confirmMessage = `Are you sure you want to approve all ${myPendingReviews.length} of your pending reviews?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    this.isSubmitting = true;
    let successCount = 0;
    let errorCount = 0;

    for (const item of myPendingReviews) {
      try {
        await this.validationService.submitReview(
          item.id,
          'approved',
          item.newComments || 'Bulk approved'
        ).toPromise();
        successCount++;
      } catch (error) {
        console.error(`Error approving item ${item.partNumber}:`, error);
        errorCount++;
      }
    }

    this.isSubmitting = false;

    if (successCount > 0) {
      this.toastr.success(`Successfully approved ${successCount} items`);
    }
    if (errorCount > 0) {
      this.toastr.error(`Failed to approve ${errorCount} items`);
    }

    // Refresh the review data
    await this.loadReviewData();
  }

  async markAllAsReviewed() {
    const myPendingReviews = this.getMyPendingReviews();
    
    if (myPendingReviews.length === 0) {
      this.toastr.warning('No pending reviews to mark as reviewed');
      return;
    }

    const confirmMessage = `Mark all ${myPendingReviews.length} items as reviewed? This will close your review actions.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    // Implementation depends on your API - this is a placeholder
    this.toastr.info('Mark as reviewed feature coming soon');
  }

  async refreshReviews() {
    await this.loadReviewData();
    this.toastr.success('Reviews refreshed');
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  trackByReviewId(index: number, item: ReviewItem): number {
    return item.id;
  }

  onClose() {
    this.activeModal.close('closed');
  }
}
