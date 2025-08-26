import { Component, OnInit } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { MaterialRequestValidationService } from '@app/core/api/operations/material-request/material-request-validation.service';
import { ToastrService } from 'ngx-toastr';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from '@app/core/services/auth.service';

interface ReviewSummary {
  total_reviews: number;
  pending_reviews: number;
  approved_reviews: number;
  rejected_reviews: number;
  needs_clarification: number;
  urgent_pending: number;
  high_pending: number;
  overdue_reviews: number;
  avg_review_time_hours: number;
}

interface AdminReviewItem {
  id: number;
  requestId: number;
  requestNumber: string;
  partNumber: string;
  description: string;
  qty: number;
  reviewStatus: string;
  reviewDecision: string;
  reviewPriority: string;
  reviewNote: string;
  reviewComment: string;
  reviewerId: number;
  reviewerName: string;
  reviewerDepartment: string;
  assignedDate: string;
  reviewedDate: string;
  requestedBy: string;
  department: string;
  validationStatus: string;
  daysOverdue?: number;
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-material-request-admin-review-dashboard',
  template: `
    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h4 class="card-title mb-0">
              <i class="ri-admin-line me-2"></i>
              Admin Review Dashboard - All Material Request Reviews
            </h4>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-primary btn-sm" (click)="refreshData()">
                <i class="ri-refresh-line me-1"></i>Refresh
              </button>
              <button class="btn btn-primary btn-sm" (click)="exportReviews()">
                <i class="ri-download-line me-1"></i>Export
              </button>
            </div>
          </div>
          <div class="card-body">
            
            <!-- Admin Summary Statistics -->
            <div class="row mb-4" *ngIf="summary">
              <div class="col-md-2">
                <div class="card text-center bg-primary bg-gradient">
                  <div class="card-body py-3">
                    <h4 class="text-white mb-1">{{summary.total_reviews || 0}}</h4>
                    <p class="text-white mb-0 small">Total Reviews</p>
                  </div>
                </div>
              </div>
              <div class="col-md-2">
                <div class="card text-center bg-warning bg-gradient">
                  <div class="card-body py-3">
                    <h4 class="text-white mb-1">{{summary.pending_reviews || 0}}</h4>
                    <p class="text-white mb-0 small">Pending</p>
                  </div>
                </div>
              </div>
              <div class="col-md-2">
                <div class="card text-center bg-success bg-gradient">
                  <div class="card-body py-3">
                    <h4 class="text-white mb-1">{{summary.approved_reviews || 0}}</h4>
                    <p class="text-white mb-0 small">Approved</p>
                  </div>
                </div>
              </div>
              <div class="col-md-2">
                <div class="card text-center bg-danger bg-gradient">
                  <div class="card-body py-3">
                    <h4 class="text-white mb-1">{{summary.rejected_reviews || 0}}</h4>
                    <p class="text-white mb-0 small">Rejected</p>
                  </div>
                </div>
              </div>
              <div class="col-md-2">
                <div class="card text-center bg-info bg-gradient">
                  <div class="card-body py-3">
                    <h4 class="text-white mb-1">{{summary.needs_clarification || 0}}</h4>
                    <p class="text-white mb-0 small">Need Clarification</p>
                  </div>
                </div>
              </div>
              <div class="col-md-2">
                <div class="card text-center" 
                     [ngClass]="summary.overdue_reviews > 0 ? 'bg-dark bg-gradient' : 'bg-secondary bg-gradient'">
                  <div class="card-body py-3">
                    <h4 class="text-white mb-1">{{summary.overdue_reviews || 0}}</h4>
                    <p class="text-white mb-0 small">Overdue</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Performance Metrics -->
            <div class="row mb-4" *ngIf="summary">
              <div class="col-md-4">
                <div class="card border border-warning">
                  <div class="card-body text-center">
                    <h5 class="text-warning">{{summary.urgent_pending || 0}}</h5>
                    <p class="mb-0 small">Urgent Reviews Pending</p>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="card border border-info">
                  <div class="card-body text-center">
                    <h5 class="text-info">{{summary.high_pending || 0}}</h5>
                    <p class="mb-0 small">High Priority Pending</p>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="card border border-secondary">
                  <div class="card-body text-center">
                    <h5 class="text-secondary">{{summary.avg_review_time_hours || 0 | number:'1.1-1'}}</h5>
                    <p class="mb-0 small">Avg Review Time (hrs)</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Filters -->
            <div class="card bg-light mb-4">
              <div class="card-body">
                <div class="row g-3">
                  <div class="col-md-3">
                    <label class="form-label">Status</label>
                    <select class="form-select form-select-sm" [(ngModel)]="filters.status" (change)="applyFilters()">
                      <option value="">All Statuses</option>
                      <option value="pending_review">Pending Review</option>
                      <option value="reviewed">Reviewed</option>
                    </select>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label">Decision</label>
                    <select class="form-select form-select-sm" [(ngModel)]="filters.decision" (change)="applyFilters()">
                      <option value="">All Decisions</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="needs_clarification">Needs Clarification</option>
                    </select>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label">Priority</label>
                    <select class="form-select form-select-sm" [(ngModel)]="filters.priority" (change)="applyFilters()">
                      <option value="">All Priorities</option>
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="normal">Normal</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label">Department</label>
                    <select class="form-select form-select-sm" [(ngModel)]="filters.department" (change)="applyFilters()">
                      <option value="">All Departments</option>
                      <option *ngFor="let dept of departments" [value]="dept">{{dept}}</option>
                    </select>
                  </div>
                </div>
                <div class="row g-3 mt-2">
                  <div class="col-md-4">
                    <label class="form-label">Reviewer</label>
                    <input type="text" class="form-control form-control-sm" 
                           [(ngModel)]="filters.reviewer" 
                           (input)="applyFilters()"
                           placeholder="Search by reviewer name...">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Part Number</label>
                    <input type="text" class="form-control form-control-sm" 
                           [(ngModel)]="filters.partNumber" 
                           (input)="applyFilters()"
                           placeholder="Search by part number...">
                  </div>
                  <div class="col-md-4">
                    <div class="d-flex align-items-end h-100">
                      <button class="btn btn-outline-secondary btn-sm" (click)="clearFilters()">
                        <i class="ri-filter-off-line me-1"></i>Clear Filters
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- All Reviews Table -->
            <div *ngIf="filteredItems?.length; else noItems">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="mb-0">
                  All Reviews 
                  <span class="badge bg-secondary ms-2">{{filteredItems.length}} of {{allReviews.length}}</span>
                </h5>
                <div class="btn-group" role="group">
                  <button class="btn btn-outline-warning btn-sm" 
                          (click)="escalateOverdueReviews()"
                          [disabled]="!hasOverdueReviews()">
                    <i class="ri-alarm-warning-line me-1"></i>Escalate Overdue
                  </button>
                  <button class="btn btn-outline-info btn-sm" 
                          (click)="sendReminders()"
                          [disabled]="!hasPendingReviews()">
                    <i class="ri-notification-line me-1"></i>Send Reminders
                  </button>
                </div>
              </div>
              
              <div class="table-responsive">
                <table class="table table-bordered table-sm">
                  <thead class="table-light">
                    <tr>
                      <th width="100">Request #</th>
                      <th width="120">Part Number</th>
                      <th>Description</th>
                      <th width="60">Qty</th>
                      <th width="100">Status</th>
                      <th width="100">Decision</th>
                      <th width="80">Priority</th>
                      <th width="120">Reviewer</th>
                      <th width="100">Department</th>
                      <th width="100">Assigned</th>
                      <th width="100">Reviewed</th>
                      <th width="200">Comments</th>
                      <th width="150">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let review of filteredItems" 
                        [class.table-danger]="review.daysOverdue && review.daysOverdue > 0"
                        [class.table-warning]="review.reviewPriority === 'urgent' || review.reviewPriority === 'high'">
                      
                      <!-- Request Number -->
                      <td>
                        <a [routerLink]="['/dashboard/operations/material-request/validate', review.requestId]" 
                           class="text-decoration-none">
                          {{review.requestNumber}}
                        </a>
                      </td>
                      
                      <!-- Part Number -->
                      <td class="fw-bold">{{review.partNumber}}</td>
                      
                      <!-- Description -->
                      <td>
                        <div class="text-truncate" style="max-width: 200px;" [title]="review.description">
                          {{review.description}}
                        </div>
                      </td>
                      
                      <!-- Quantity -->
                      <td class="text-center">{{review.qty}}</td>
                      
                      <!-- Review Status -->
                      <td>
                        <span class="badge"
                              [ngClass]="{
                                'bg-warning': review.reviewStatus === 'pending_review',
                                'bg-success': review.reviewStatus === 'reviewed' && review.reviewDecision === 'approved',
                                'bg-danger': review.reviewStatus === 'reviewed' && review.reviewDecision === 'rejected',
                                'bg-info': review.reviewStatus === 'reviewed' && review.reviewDecision === 'needs_clarification',
                                'bg-secondary': review.reviewStatus === 'assigned'
                              }">
                          {{getStatusLabel(review.reviewStatus)}}
                        </span>
                      </td>
                      
                      <!-- Review Decision -->
                      <td>
                        <span *ngIf="review.reviewDecision" class="badge"
                              [ngClass]="{
                                'bg-success': review.reviewDecision === 'approved',
                                'bg-danger': review.reviewDecision === 'rejected',
                                'bg-info': review.reviewDecision === 'needs_clarification'
                              }">
                          {{review.reviewDecision | titlecase}}
                        </span>
                        <span *ngIf="!review.reviewDecision" class="text-muted">-</span>
                      </td>
                      
                      <!-- Priority -->
                      <td>
                        <span class="badge"
                              [ngClass]="{
                                'bg-danger': review.reviewPriority === 'urgent',
                                'bg-warning': review.reviewPriority === 'high',
                                'bg-info': review.reviewPriority === 'normal',
                                'bg-secondary': review.reviewPriority === 'low'
                              }">
                          {{review.reviewPriority | titlecase}}
                        </span>
                        <div *ngIf="review.daysOverdue && review.daysOverdue > 0" class="small text-danger">
                          <i class="ri-alarm-warning-line"></i> {{review.daysOverdue}}d overdue
                        </div>
                      </td>
                      
                      <!-- Reviewer -->
                      <td>
                        <div class="small">
                          <div class="fw-bold">{{review.reviewerName}}</div>
                          <div class="text-muted">ID: {{review.reviewerId}}</div>
                        </div>
                      </td>
                      
                      <!-- Department -->
                      <td>{{review.reviewerDepartment}}</td>
                      
                      <!-- Assigned Date -->
                      <td class="small">
                        {{formatDate(review.assignedDate)}}
                      </td>
                      
                      <!-- Reviewed Date -->
                      <td class="small">
                        {{formatDate(review.reviewedDate)}}
                      </td>
                      
                      <!-- Comments -->
                      <td>
                        <div *ngIf="review.reviewNote" class="small mb-1">
                          <strong>Note:</strong> 
                          <div class="text-truncate" [title]="review.reviewNote">{{review.reviewNote}}</div>
                        </div>
                        <div *ngIf="review.reviewComment" class="small">
                          <strong>Comment:</strong> 
                          <div class="text-truncate" [title]="review.reviewComment">{{review.reviewComment}}</div>
                        </div>
                      </td>
                      
                      <!-- Actions -->
                      <td>
                        <div class="btn-group-vertical gap-1" role="group">
                          <button class="btn btn-outline-primary btn-sm" 
                                  (click)="viewRequest(review.requestId)"
                                  title="View full request">
                            <i class="ri-eye-line me-1"></i>View
                          </button>
                          <button class="btn btn-outline-info btn-sm" 
                                  (click)="reassignReview(review)"
                                  *ngIf="review.reviewStatus === 'pending_review'"
                                  title="Reassign to different reviewer">
                            <i class="ri-user-line me-1"></i>Reassign
                          </button>
                          <button class="btn btn-outline-warning btn-sm" 
                                  (click)="sendReminder(review)"
                                  *ngIf="review.reviewStatus === 'pending_review'"
                                  title="Send reminder to reviewer">
                            <i class="ri-notification-line me-1"></i>Remind
                          </button>
                          <button class="btn btn-outline-danger btn-sm" 
                                  (click)="cancelReview(review)"
                                  *ngIf="review.reviewStatus === 'pending_review'"
                                  title="Cancel this review">
                            <i class="ri-close-line me-1"></i>Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <ng-template #noItems>
              <div class="text-center py-5">
                <i class="ri-search-line" style="font-size: 3rem; color: #ccc;"></i>
                <h5 class="mt-3">No reviews found</h5>
                <p class="text-muted">
                  {{allReviews.length === 0 ? 'No reviews in the system.' : 'No reviews match your current filters.'}}
                </p>
                <button class="btn btn-outline-secondary" *ngIf="hasActiveFilters()" (click)="clearFilters()">
                  Clear Filters
                </button>
              </div>
            </ng-template>

          </div>
        </div>
      </div>
    </div>

    <!-- Reassign Review Modal -->
    <div class="modal fade" [class.show]="showReassignModal" [style.display]="showReassignModal ? 'block' : 'none'" 
         tabindex="-1" role="dialog" *ngIf="showReassignModal">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="ri-user-line me-2"></i>
              Reassign Review
            </h5>
            <button type="button" class="btn-close" (click)="closeReassignModal()"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Current Reviewer:</label>
              <p class="text-muted">{{selectedReview?.reviewerName}} ({{selectedReview?.reviewerDepartment}})</p>
            </div>
            <div class="mb-3">
              <label class="form-label">New Reviewer:</label>
              <select class="form-select" [(ngModel)]="newReviewerId">
                <option value="">Select a reviewer...</option>
                <option *ngFor="let reviewer of availableReviewers" [value]="reviewer.id">
                  {{reviewer.name}} - {{reviewer.department}}
                </option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Reassignment Reason:</label>
              <textarea class="form-control" [(ngModel)]="reassignReason" rows="3" 
                        placeholder="Explain why this review is being reassigned..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeReassignModal()">Cancel</button>
            <button type="button" class="btn btn-primary" 
                    [disabled]="!newReviewerId || !reassignReason" 
                    (click)="confirmReassign()">
              Reassign Review
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal backdrop -->
    <div class="modal-backdrop fade" [class.show]="showReassignModal" *ngIf="showReassignModal"></div>
  `
})
export class MaterialRequestAdminReviewDashboardComponent implements OnInit {
  allReviews: AdminReviewItem[] = [];
  filteredItems: AdminReviewItem[] = [];
  summary: ReviewSummary | null = null;
  departments: string[] = [];
  availableReviewers: any[] = [];
  isLoading = false;

  // Filters
  filters = {
    status: '',
    decision: '',
    priority: '',
    department: '',
    reviewer: '',
    partNumber: ''
  };

  // Reassignment modal
  showReassignModal = false;
  selectedReview: AdminReviewItem | null = null;
  newReviewerId = '';
  reassignReason = '';

  constructor(
    private validationService: MaterialRequestValidationService,
    private toastrService: ToastrService,
    private router: Router,
    private authService: AuthenticationService
  ) { }

  ngOnInit() {
    this.loadAllReviews();
  }

  async loadAllReviews() {
    this.isLoading = true;
    try {
      // Load all reviews for admin dashboard
      const response: any = await this.validationService.getAllReviewsForAdmin().toPromise();
      
      this.allReviews = response.reviews || [];
      this.summary = response.summary || {};
      this.departments = response.departments || [];
      this.availableReviewers = response.availableReviewers || [];
      
      this.applyFilters();
    } catch (error) {
      console.error('Error loading admin reviews:', error);
      this.toastrService.error('Error loading review data');
    } finally {
      this.isLoading = false;
    }
  }

  refreshData() {
    this.loadAllReviews();
  }

  applyFilters() {
    this.filteredItems = this.allReviews.filter(review => {
      return (
        (!this.filters.status || review.reviewStatus === this.filters.status) &&
        (!this.filters.decision || review.reviewDecision === this.filters.decision) &&
        (!this.filters.priority || review.reviewPriority === this.filters.priority) &&
        (!this.filters.department || review.reviewerDepartment === this.filters.department) &&
        (!this.filters.reviewer || review.reviewerName.toLowerCase().includes(this.filters.reviewer.toLowerCase())) &&
        (!this.filters.partNumber || review.partNumber.toLowerCase().includes(this.filters.partNumber.toLowerCase()))
      );
    });
  }

  clearFilters() {
    this.filters = {
      status: '',
      decision: '',
      priority: '',
      department: '',
      reviewer: '',
      partNumber: ''
    };
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return Object.values(this.filters).some(value => value !== '');
  }

  hasOverdueReviews(): boolean {
    return this.filteredItems.some(review => review.daysOverdue && review.daysOverdue > 0);
  }

  hasPendingReviews(): boolean {
    return this.filteredItems.some(review => review.reviewStatus === 'pending_review');
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending_review': return 'Pending';
      case 'reviewed': return 'Completed';
      case 'assigned': return 'Assigned';
      default: return status;
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  }

  viewRequest(requestId: number) {
    this.router.navigate(['/dashboard/operations/material-request/validate', requestId]);
  }

  // Reassignment functionality
  reassignReview(review: AdminReviewItem) {
    this.selectedReview = review;
    this.newReviewerId = '';
    this.reassignReason = '';
    this.showReassignModal = true;
  }

  closeReassignModal() {
    this.showReassignModal = false;
    this.selectedReview = null;
    this.newReviewerId = '';
    this.reassignReason = '';
  }

  async confirmReassign() {
    if (!this.selectedReview || !this.newReviewerId || !this.reassignReason) return;

    try {
      await this.validationService.reassignReview(
        this.selectedReview.id,
        this.newReviewerId,
        this.reassignReason
      ).toPromise();

      this.toastrService.success('Review reassigned successfully');
      this.closeReassignModal();
      this.loadAllReviews();
    } catch (error) {
      this.toastrService.error('Error reassigning review');
    }
  }

  async sendReminder(review: AdminReviewItem) {
    try {
      await this.validationService.sendReviewReminder(review.id).toPromise();
      this.toastrService.success(`Reminder sent to ${review.reviewerName}`);
    } catch (error) {
      this.toastrService.error('Error sending reminder');
    }
  }

  async sendReminders() {
    const pendingReviews = this.filteredItems.filter(r => r.reviewStatus === 'pending_review');
    
    if (pendingReviews.length === 0) {
      this.toastrService.warning('No pending reviews to send reminders for');
      return;
    }

    const confirmed = confirm(`Send reminders for ${pendingReviews.length} pending reviews?`);
    if (!confirmed) return;

    try {
      for (const review of pendingReviews) {
        await this.validationService.sendReviewReminder(review.id).toPromise();
      }
      this.toastrService.success(`Reminders sent for ${pendingReviews.length} reviews`);
    } catch (error) {
      this.toastrService.error('Error sending reminders');
    }
  }

  async escalateOverdueReviews() {
    const overdueReviews = this.filteredItems.filter(r => r.daysOverdue && r.daysOverdue > 0);
    
    if (overdueReviews.length === 0) {
      this.toastrService.warning('No overdue reviews to escalate');
      return;
    }

    const confirmed = confirm(`Escalate ${overdueReviews.length} overdue reviews to department managers?`);
    if (!confirmed) return;

    try {
      for (const review of overdueReviews) {
        await this.validationService.escalateReview(review.id).toPromise();
      }
      this.toastrService.success(`Escalated ${overdueReviews.length} overdue reviews`);
      this.loadAllReviews();
    } catch (error) {
      this.toastrService.error('Error escalating reviews');
    }
  }

  async cancelReview(review: AdminReviewItem) {
    const confirmed = confirm(`Cancel review assignment for ${review.partNumber}?`);
    if (!confirmed) return;

    try {
      await this.validationService.cancelReview(review.id).toPromise();
      this.toastrService.success('Review cancelled');
      this.loadAllReviews();
    } catch (error) {
      this.toastrService.error('Error cancelling review');
    }
  }

  exportReviews() {
    // Create CSV export functionality
    const csvData = this.filteredItems.map(review => ({
      'Request #': review.requestNumber,
      'Part Number': review.partNumber,
      'Description': review.description,
      'Qty': review.qty,
      'Status': this.getStatusLabel(review.reviewStatus),
      'Decision': review.reviewDecision || '',
      'Priority': review.reviewPriority,
      'Reviewer': review.reviewerName,
      'Department': review.reviewerDepartment,
      'Assigned': this.formatDate(review.assignedDate),
      'Reviewed': this.formatDate(review.reviewedDate),
      'Days Overdue': review.daysOverdue || 0,
      'Review Note': review.reviewNote || '',
      'Review Comment': review.reviewComment || ''
    }));

    // Convert to CSV and download
    const csvContent = this.convertToCSV(csvData);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `material-request-reviews-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        return `"${value}"`;
      }).join(','))
    ];
    
    return csvRows.join('\n');
  }
}
