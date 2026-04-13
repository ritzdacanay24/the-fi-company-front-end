import { Component, OnInit, OnDestroy } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MaterialRequestService } from '@app/core/api/operations/material-request/material-request.service';
import { MaterialRequestValidationService } from '@app/core/api/operations/material-request/material-request-validation.service';
import { NgbModal, NgbModalRef, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { MaterialRequestPickingModalComponent } from '../material-request-picking-modal/material-request-picking-modal.component';
import { MaterialRequestValidationModalComponent } from '../material-request-validation-modal/material-request-validation-modal.component';
import { MaterialRequestReviewModalComponent } from '../material-request-review-modal/material-request-review-modal.component';
import { MaterialRequestFormModalComponent } from '../material-request-form-modal/material-request-form-modal.component';
import { MaterialRequestFormModalService } from '../material-request-form-modal/material-request-form-modal.service';
import { MaterialRequestHelpGuideComponent } from './material-request-help-guide.component';
import moment from 'moment';

interface KanbanColumn {
  id: string;
  title: string;
  status: string[];
  items: any[];
  color: string;
  icon: string;
  maxItems?: number;
  description?: string;
}

interface ValidationSummary {
  status: string;
  text: string;
  badgeClass: string;
  details: string;
  reviewInfo?: {
    type: string;
    text: string;
    reviewers: any[];
    count?: number;
  } | null;
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-material-request-kanban',
  templateUrl: './material-request-kanban.component.html',
  styleUrls: ['./material-request-kanban.component.scss']
})
export class MaterialRequestKanbanComponent implements OnInit, OnDestroy {
  
  isLoading = false;
  refreshInterval: any;
  
  // Kanban configuration
  columns: KanbanColumn[] = [
    {
      id: 'validation',
      title: 'Pending Validation',
      status: ['new', 'under_validation', 'pending', 'submitted'],
      items: [],
      color: 'warning',
      icon: 'mdi mdi-clipboard-check',
      description: 'Requests needing validation or item-level reviews'
    },
    {
      id: 'ready_picking',
      title: 'Ready for Picking',
      status: ['approved', 'ready_for_picking'],
      items: [],
      color: 'success',
      icon: 'mdi mdi-clipboard-list',
      description: 'Fully validated and ready to be picked'
    },
    {
      id: 'in_picking',
      title: 'In Picking',
      status: ['picking', 'being_picked'],
      items: [],
      color: 'primary',
      icon: 'mdi mdi-package-variant',
      description: 'Currently being picked or processed'
    },
    {
      id: 'complete',
      title: 'Complete',
      status: ['complete', 'delivered', 'closed'],
      items: [],
      color: 'dark',
      icon: 'mdi mdi-check-all',
      description: 'Recently completed requests (last 14 days)'
    }
  ];

  // Filters and search
  searchTerm = '';
  selectedDepartment = '';
  selectedPriority = '';
  selectedRequester = '';
  showMyRequestsOnly = false;
  
  // Review filters
  selectedReviewer = ''; // Filter by specific reviewer
  selectedReviewStatus = ''; // 'pending', 'completed', 'overdue', ''
  showMyReviewsOnly = false; // Show only reviews assigned to current user
  
  // Productivity filters
  showHighPriorityOnly = false;
  showOverdueOnly = false;
  showMyDepartmentOnly = false;
  selectedValidationStatus = ''; // 'complete', 'partial', 'pending', ''
  selectedAgeRange = ''; // 'today', 'week', 'month', 'overdue', ''
  selectedValueRange = ''; // 'low', 'medium', 'high', ''
  
  // Queue visibility configuration
  visibleColumns: { [key: string]: boolean } = {
    validation: true,
    ready_picking: true,
    in_picking: true,
    complete: true
  };
  
  // User preferences
  currentUser = 'current_user'; // This should come from auth service
  currentUserDepartment = 'current_department'; // This should come from auth service
  
  // Completed items filter - show only recent completions
  completedItemsDaysFilter = 14; // Show completed items from last 14 days
  
  // Summary stats
  totalRequests = 0;
  avgProcessingTime = 0;
  overdueCount = 0;
  
  departments: string[] = [];
  requesters: any[] = [];
  reviewers: any[] = []; // List of available reviewers for filtering

  // Breadcrumb configuration
  breadCrumbItems = [
    { label: 'Operations', link: '/operations' },
    { label: 'Material Request', link: '/operations/material-request' },
    { label: 'Kanban Board', active: true }
  ];

  // Only keep modal references we still need
  // Removed moveToQueueModal - no longer needed with automatic queue management

  // Form handling properties - for dedicated modals
  currentModalRef: NgbModalRef | null = null;

  // Validation modal properties
  currentValidationModalRef: NgbModalRef | null = null;
  selectedRequestForValidation: any = null;

  // View modal properties
  currentViewModalRef: NgbModalRef | null = null;
  selectedRequestForView: any = null;

  // Review modal properties
  currentReviewModalRef: NgbModalRef | null = null;
  selectedRequestForReview: any = null;

  // Picking modal properties
  currentPickingModalRef: NgbModalRef | null = null;
  selectedRequestForPicking: any = null;

  // Edit modal properties
  currentEditModalRef: NgbModalRef | null = null;
  selectedRequestForEdit: any = null;

  // Move Queue modal properties
  currentMoveQueueModalRef: NgbModalRef | null = null;
  selectedRequestForMove: any = null;

  // Drag and drop properties
  private draggedRequest: any = null;
  private draggedFromColumn: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private materialRequestService: MaterialRequestService,
    private validationService: MaterialRequestValidationService,
    private toastr: ToastrService,
    private modalService: NgbModal,
    private formModalService: MaterialRequestFormModalService,
    private offcanvas: NgbOffcanvas
  ) {}

  ngOnInit(): void {
    this.loadUserPreferences();
    this.loadFiltersFromUrl();
    this.loadKanbanData(true);
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  async loadKanbanData(showLoading: boolean = true) {
    try {
      if (showLoading) {
        this.isLoading = true;
      }
      
      const response: any = await this.materialRequestService.getAllWithStatus().toPromise();
      const requests = Array.isArray(response) ? response : (response?.data || []);
      
      const requestsWithReviews = await this.loadReviewData(requests);
      const newColumnsData = this.columns.map(col => ({ ...col, items: [] }));
      
      requestsWithReviews.forEach(request => {
        const columns = this.determineColumns(request);
        columns.forEach(columnId => {
          const column = newColumnsData.find(c => c.id === columnId);
          if (column) {
            column.items.push(this.enhanceRequestData(request));
          }
        });
      });
      
      this.columns.forEach((col, index) => {
        col.items = newColumnsData[index].items;
      });
      
      this.updateSummaryStats(requestsWithReviews);
      this.extractFilterOptions(requestsWithReviews);
      
    } catch (error) {
      console.error('Error loading kanban data:', error);
      this.toastr.error('Error loading material request data');
    } finally {
      if (showLoading) {
        this.isLoading = false;
      }
    }
  }

  async loadReviewData(requests: any[]): Promise<any[]> {
    // Simplified - just pass through requests since review data is already included
    return requests;
  }

  determineColumns(request: any): string[] {
    const status = request.status;
    const validationProgress = parseInt(request.validation_progress) || 0;
    const pendingValidations = parseInt(request.pending_validations) || 0;
    const approvedItems = parseInt(request.approved_items) || 0;
    const totalItems = parseInt(request.item_count) || 0;
    
    // Priority 1: Check completion status first
    if (status === 'complete' || status === 'delivered' || status === 'closed') {
      // Only show recent completions to avoid cluttering the board
      if (this.isRecentCompletion(request)) {
        return ['complete'];
      } else {
        return []; // Don't show old completed items
      }
    }
    
    // Priority 2: Check if currently in picking
    if (status === 'picking' || status === 'being_picked') {
      return ['in_picking'];
    }
    
    // Priority 3: Check if ready for picking
    // Must be approved/ready_for_picking AND validation is 100% complete
    if ((status === 'approved' || status === 'ready_for_picking') && 
        validationProgress === 100 && pendingValidations === 0) {
      return ['ready_picking'];
    }
    
    // Priority 4: Everything else goes to validation queue
    // This includes:
    // - New requests
    // - Partial validations (even if some items approved)
    // - Requests with pending reviews (reviews are part of validation process)
    // - Status inconsistencies (like approved with pending validations)
    return ['validation'];
  }

  // Keep the original method for backward compatibility
  determineColumn(request: any): KanbanColumn | null {
    const columns = this.determineColumns(request);
    if (columns.length > 0) {
      return this.columns.find(c => c.id === columns[0]) || null;
    }
    return null;
  }

  /**
   * Check if a completed request is recent enough to display on the Kanban board
   */
  isRecentCompletion(request: any): boolean {
    // Get the completion date from various possible fields
    const completionDate = request.completed_at || request.delivered_at || request.closed_at || request.updated_at;
    
    if (!completionDate) {
      return false; // If no completion date, don't show
    }
    
    const completedMoment = moment(completionDate);
    const daysSinceCompletion = moment().diff(completedMoment, 'days');
    
    // Show if completed within the configured days filter
    return daysSinceCompletion <= this.completedItemsDaysFilter;
  }

  /**
   * Check if a request is overdue based on business rules
   */
  isOverdue(request: any): boolean {
    const age = parseInt(request.age_days) || 0;
    const priority = request.priority?.toLowerCase();
    const status = request.status;
    
    // Don't mark completed items as overdue
    if (status === 'complete' || status === 'delivered' || status === 'closed') {
      return false;
    }
    
    // Define overdue thresholds based on priority
    switch (priority) {
      case 'high':
        return age > 2; // High priority overdue after 2 days
      case 'medium':
        return age > 5; // Medium priority overdue after 5 days
      case 'low':
        return age > 10; // Low priority overdue after 10 days
      default:
        return age > 7; // Default overdue after 7 days
    }
  }

  enhanceRequestData(request: any): any {
    const age = parseInt(request.age_days) || 0;
    const validationProgress = parseInt(request.validation_progress) || 0;
    const pendingValidations = parseInt(request.pending_validations) || 0;
    const pendingReviews = parseInt(request.pending_reviews) || 0;
    const totalReviews = parseInt(request.total_reviews) || 0;
    
    return {
      ...request,
      requestNumber: request.request_number,
      requesterName: request.requester_name || request.requestor,
      createdAt: request.created_at || request.createdDate,
      lastActivity: request.last_activity,
      itemCount: parseInt(request.item_count) || 0,
      totalValue: request.total_value || 0,
      validationProgress,
      age,
      ageText: this.getAgeText(age),
      priorityClass: this.getPriorityClass(request.priority),
      statusBadge: this.getStatusBadge(request),
      fulfillmentStage: this.getFulfillmentStage(request.status),
      validationSummary: this.getValidationSummary(request),
      actionable: true
    };
  }

  /**
   * Get a clear summary of validation status that includes detailed review information
   */
  getValidationSummary(request: any): ValidationSummary {
    const validationProgress = parseInt(request.validation_progress) || 0;
    const pendingValidations = parseInt(request.pending_validations) || 0;
    const pendingReviews = parseInt(request.pending_reviews) || 0;
    const totalReviews = parseInt(request.total_reviews) || 0;
    const approvedItems = parseInt(request.approved_items) || 0;
    const rejectedItems = parseInt(request.rejected_items) || 0;
    
    // Get detailed review information if available
    const reviewDetails = this.getDetailedReviewInfo(request);
    
    // Use actual parsed review counts instead of just database count
    const actualPendingReviews = reviewDetails.pending.length;
    const actualOverdueReviews = reviewDetails.overdue.length;
    const totalActualPendingReviews = actualPendingReviews + actualOverdueReviews;
    
    // If fully validated (100%) and no pending work
    if (validationProgress === 100 && pendingValidations === 0 && totalActualPendingReviews === 0) {
      return {
        status: 'complete',
        text: 'Validation Complete',
        badgeClass: 'badge bg-success',
        details: `${approvedItems} approved${rejectedItems > 0 ? `, ${rejectedItems} rejected` : ''}`,
        reviewInfo: reviewDetails.completed.length > 0 ? {
          type: 'completed',
          text: `${reviewDetails.completed.length} review(s) completed`,
          reviewers: reviewDetails.completed
        } : null
      };
    }
    
    // If has pending work, show what's pending with detailed review info
    const pendingWork = [];
    if (pendingValidations > 0) {
      pendingWork.push(`${pendingValidations} validation${pendingValidations > 1 ? 's' : ''}`);
    }
    if (totalActualPendingReviews > 0) {
      pendingWork.push(`${totalActualPendingReviews} review${totalActualPendingReviews > 1 ? 's' : ''}`);
    }
    
    if (pendingWork.length > 0) {
      const summary: ValidationSummary = {
        status: 'pending',
        text: `${validationProgress}% validated`,
        badgeClass: 'badge bg-warning text-dark',
        details: `Pending: ${pendingWork.join(', ')}`,
        reviewInfo: null
      };
      
      // Add detailed review information for pending reviews
      if (totalActualPendingReviews > 0) {
        const allPendingReviews = [...reviewDetails.pending, ...reviewDetails.overdue];
        summary.reviewInfo = {
          type: 'pending',
          text: allPendingReviews.length > 0
            ? `Pending reviews from: ${allPendingReviews.map(r => r.reviewer_name || r.department || 'Unknown').join(', ')}`
            : '',
          reviewers: allPendingReviews,
          count: totalActualPendingReviews
        };
      }
      
      return summary;
    }
    
    // Default case
    return {
      status: 'new',
      text: 'Awaiting Validation',
      badgeClass: 'badge bg-secondary',
      details: 'Not yet started',
      reviewInfo: null
    };
  }

  /**
   * Extract detailed review information from request data
   */
  getDetailedReviewInfo(request: any): { pending: any[], completed: any[], overdue: any[] } {
    const reviews = {
      pending: [],
      completed: [],
      overdue: []
    };
    
    // Parse review information from request if available
    if (request.review_details) {
      try {
        const reviewDetails = typeof request.review_details === 'string' 
          ? JSON.parse(request.review_details) 
          : request.review_details;
        
        if (Array.isArray(reviewDetails)) {
          reviewDetails.forEach(review => {
            if (review.review_status === 'pending_review' || review.review_status === 'assigned') {
              // Check if review is overdue (more than 2 days for high priority, 5 days for others)
              const assignedDate = moment(review.assigned_at || review.created_at);
              const daysSinceAssigned = moment().diff(assignedDate, 'days');
              const isOverdue = (request.priority === 'high' && daysSinceAssigned > 2) || daysSinceAssigned > 5;
              
              if (isOverdue) {
                reviews.overdue.push(review);
              } else {
                reviews.pending.push(review);
              }
            } else if (review.review_status === 'reviewed' || review.review_status === 'completed') {
              reviews.completed.push(review);
            }
          });
        }
      } catch (error) {
        console.warn('Error parsing review details:', error);
      }
    }
    
    return reviews;
  }

  /**
   * Get review status indicators for display in the UI
   */
  getReviewStatusIndicators(request: any): { badge: string, text: string, tooltip: string } | null {
    const reviewDetails = this.getDetailedReviewInfo(request);
    
    if (reviewDetails.overdue.length > 0) {
      return {
        badge: 'badge bg-danger',
        text: `${reviewDetails.overdue.length} Overdue`,
        tooltip: `Overdue reviews: ${reviewDetails.overdue.map(r => r.reviewer_name || 'Unknown').join(', ')}`
      };
    }
    
    if (reviewDetails.pending.length > 0) {
      return {
        badge: 'badge bg-warning text-dark',
        text: `${reviewDetails.pending.length} Pending`,
        tooltip: `Pending reviews: ${reviewDetails.pending.map(r => r.reviewer_name || 'Unknown').join(', ')}`
      };
    }
    
    if (reviewDetails.completed.length > 0) {
      return {
        badge: 'badge bg-success',
        text: `${reviewDetails.completed.length} Complete`,
        tooltip: `Completed reviews: ${reviewDetails.completed.map(r => r.reviewer_name || 'Unknown').join(', ')}`
      };
    }
    
    return null;
  }

  /**
   * Check if a request has any review activity
   */
  hasReviewActivity(request: any): boolean {
    const reviewDetails = this.getDetailedReviewInfo(request);
    return reviewDetails.pending.length > 0 || 
           reviewDetails.completed.length > 0 || 
           reviewDetails.overdue.length > 0;
  }

  getAgeText(days: number): string {
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    return `${Math.floor(days / 7)} week(s)`;
  }

  getPriorityClass(priority: string): string {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-danger fw-bold';
      case 'low': return 'text-muted';
      default: return 'text-dark';
    }
  }

  getStatusBadge(request: any): any {
    if (request.priority === 'high') {
      return { class: 'badge bg-warning', text: 'High Priority' };
    }
    return null;
  }

  getFulfillmentStage(status: string): any {
    switch (status) {
      case 'approved':
      case 'ready_for_picking':
        return { 
          stage: 'ready', 
          text: 'Ready to Pick', 
          class: 'badge bg-success',
          icon: 'mdi mdi-clipboard-list'
        };
      case 'picking':
      case 'being_picked':
        return { 
          stage: 'picking', 
          text: 'In Picking', 
          class: 'badge bg-primary',
          icon: 'mdi mdi-package-variant'
        };
      case 'complete':
      case 'delivered':
      case 'closed':
        return { 
          stage: 'complete', 
          text: 'Complete', 
          class: 'badge bg-dark',
          icon: 'mdi mdi-check-all'
        };
      default:
        return null;
    }
  }

  updateSummaryStats(requests: any[]) {
    this.totalRequests = requests.length;
    this.overdueCount = 0;
    this.avgProcessingTime = 0;
  }

  extractFilterOptions(requests: any[]) {
    const departmentSet = new Set<string>();
    const requesterSet = new Set<string>();
    const reviewerSet = new Set<string>();
    
    requests.forEach(request => {
      if (request.department && request.department !== 'Unknown') {
        departmentSet.add(request.department);
      }
      if (request.requesterName || request.requestor) {
        requesterSet.add(request.requesterName || request.requestor);
      }
      
      // Extract reviewers from review details
      const reviewDetails = this.getDetailedReviewInfo(request);
      const allReviews = [...reviewDetails.pending, ...reviewDetails.completed, ...reviewDetails.overdue];
      allReviews.forEach(review => {
        if (review.reviewer_name && review.reviewer_name !== 'Unknown') {
          reviewerSet.add(review.reviewer_name);
        }
      });
    });
    
    this.departments = Array.from(departmentSet).sort();
    this.requesters = Array.from(requesterSet).sort().map(name => ({ name }));
    this.reviewers = Array.from(reviewerSet).sort().map(name => ({ name }));
  }

  /**
   * Get filter summary for productivity insights
   */
  getFilterSummary(): any {
    const allItems = this.columns.flatMap(col => col.items);
    
    return {
      total: allItems.length,
      highPriority: allItems.filter(item => item.priority?.toLowerCase() === 'high').length,
      overdue: allItems.filter(item => this.isOverdue(item)).length,
      myRequests: allItems.filter(item => item.requesterName === this.currentUser).length,
      pendingValidation: allItems.filter(item => {
        const progress = parseInt(item.validation_progress) || 0;
        const pending = parseInt(item.pending_validations) || 0;
        return progress < 100 || pending > 0;
      }).length,
      highValue: allItems.filter(item => (parseFloat(item.total_value) || 0) >= 10000).length
    };
  }

  openRequestDetail(request: any) {
    console.log('openRequestDetail called with request:', request);
    console.log('request.id:', request.id);
    
    if (request && request.id) {
      console.log('Opening validation modal for request ID:', request.id);
      this.openValidationModal(request);
    } else {
      console.log('Cannot open modal: request missing ID or request is null');
      this.toastr.warning('Cannot open request details: Invalid request data');
    }
  }

  setupAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      this.loadKanbanData(false);
    }, 30000);
  }

  manualRefresh() {
    this.loadKanbanData(true);
  }

  getFilteredItems(column: KanbanColumn): any[] {
    let items = column.items;
    
    // Basic search filter
    if (this.searchTerm) {
      items = items.filter(item => 
        item.requestNumber?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.requesterName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.department?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
    
    // Department filter
    if (this.selectedDepartment) {
      items = items.filter(item => item.department === this.selectedDepartment);
    }
    
    // Priority filter
    if (this.selectedPriority) {
      items = items.filter(item => item.priority?.toLowerCase() === this.selectedPriority.toLowerCase());
    }
    
    // Requester filter
    if (this.selectedRequester) {
      items = items.filter(item => item.requesterName === this.selectedRequester);
    }
    
    // PRODUCTIVITY FILTERS
    
    // My requests only
    if (this.showMyRequestsOnly) {
      items = items.filter(item => item.requesterName === this.currentUser);
    }
    
    // High priority only
    if (this.showHighPriorityOnly) {
      items = items.filter(item => item.priority?.toLowerCase() === 'high');
    }
    
    // My department only
    if (this.showMyDepartmentOnly) {
      items = items.filter(item => item.department === this.currentUserDepartment);
    }
    
    // Overdue items only
    if (this.showOverdueOnly) {
      items = items.filter(item => this.isOverdue(item));
    }
    
    // REVIEW FILTERS
    
    // Filter by specific reviewer
    if (this.selectedReviewer) {
      items = items.filter(item => {
        const reviewDetails = this.getDetailedReviewInfo(item);
        const allReviews = [...reviewDetails.pending, ...reviewDetails.completed, ...reviewDetails.overdue];
        return allReviews.some(review => 
          review.reviewer_name === this.selectedReviewer || 
          review.reviewer_id === this.selectedReviewer
        );
      });
    }
    
    // Filter by review status - show all reviews regardless of reviewer assignment
    if (this.selectedReviewStatus) {
      items = items.filter(item => {
        const reviewDetails = this.getDetailedReviewInfo(item);
        switch (this.selectedReviewStatus) {
          case 'pending':
            return reviewDetails.pending.length > 0;
          case 'overdue':
            return reviewDetails.overdue.length > 0;
          case 'completed':
            return reviewDetails.completed.length > 0 && reviewDetails.pending.length === 0;
          default:
            return true;
        }
      });
    }
    
    // Show only reviews assigned to current user (optional filter)
    if (this.showMyReviewsOnly) {
      items = items.filter(item => {
        const reviewDetails = this.getDetailedReviewInfo(item);
        const allReviews = [...reviewDetails.pending, ...reviewDetails.completed, ...reviewDetails.overdue];
        return allReviews.some(review => 
          review.reviewer_name === this.currentUser || 
          review.reviewer_id === this.currentUser
        );
      });
    }
    
    // Validation status filter
    if (this.selectedValidationStatus) {
      items = items.filter(item => {
        const progress = parseInt(item.validation_progress) || 0;
        const pending = parseInt(item.pending_validations) || 0;
        
        switch (this.selectedValidationStatus) {
          case 'complete':
            return progress === 100 && pending === 0;
          case 'partial':
            return progress > 0 && progress < 100;
          case 'pending':
            return progress === 0 || pending > 0;
          default:
            return true;
        }
      });
    }
    
    // Age range filter
    if (this.selectedAgeRange) {
      items = items.filter(item => {
        const age = parseInt(item.age_days) || 0;
        switch (this.selectedAgeRange) {
          case 'today':
            return age === 0;
          case 'week':
            return age <= 7;
          case 'month':
            return age <= 30;
          case 'overdue':
            return this.isOverdue(item);
          default:
            return true;
        }
      });
    }
    
    // Value range filter
    if (this.selectedValueRange) {
      items = items.filter(item => {
        const value = parseFloat(item.total_value) || 0;
        switch (this.selectedValueRange) {
          case 'low':
            return value < 1000;
          case 'medium':
            return value >= 1000 && value < 10000;
          case 'high':
            return value >= 10000;
          default:
            return true;
        }
      });
    }
    
    return items;
  }

  /**
   * Get visible columns based on user configuration
   */
  getVisibleColumns(): KanbanColumn[] {
    return this.columns.filter(column => this.visibleColumns[column.id]);
  }

  /**
   * Toggle column visibility
   */
  toggleColumnVisibility(columnId: string) {
    this.visibleColumns[columnId] = !this.visibleColumns[columnId];
    this.saveUserPreferences();
  }

  /**
   * Quick filter presets for common workflows
   */
  applyQuickFilter(filterType: string) {
    this.clearFilters();
    
    switch (filterType) {
      case 'my-work':
        this.showMyRequestsOnly = true;
        break;
      case 'urgent':
        this.showHighPriorityOnly = true;
        this.showOverdueOnly = true;
        break;
      case 'department':
        this.showMyDepartmentOnly = true;
        break;
      case 'validation-needed':
        this.selectedValidationStatus = 'pending';
        this.visibleColumns = { validation: true, ready_picking: false, in_picking: false, complete: false };
        break;
      case 'my-reviews':
        this.showMyReviewsOnly = true;
        this.visibleColumns = { validation: true, ready_picking: false, in_picking: false, complete: false };
        break;
      case 'pending-reviews':
        this.selectedReviewStatus = 'pending';
        this.visibleColumns = { validation: true, ready_picking: false, in_picking: false, complete: false };
        break;
      case 'overdue-reviews':
        this.selectedReviewStatus = 'overdue';
        this.visibleColumns = { validation: true, ready_picking: false, in_picking: false, complete: false };
        break;
      case 'picking-focus':
        this.visibleColumns = { validation: false, ready_picking: true, in_picking: true, complete: false };
        break;
      case 'recent-activity':
        this.selectedAgeRange = 'week';
        break;
      case 'high-value':
        this.selectedValueRange = 'high';
        break;
      default:
        // Reset to show all columns
        this.visibleColumns = { validation: true, ready_picking: true, in_picking: true, complete: true };
        break;
    }
    
    // Update URL after applying quick filter
    this.updateUrlParams();
  }

  /**
   * Save user preferences (in a real app, this would save to backend/localStorage)
   */
  saveUserPreferences() {
    const preferences = {
      visibleColumns: this.visibleColumns,
      completedItemsDaysFilter: this.completedItemsDaysFilter
    };
    
    // In a real implementation, save to localStorage or user profile
    localStorage.setItem('kanban-preferences', JSON.stringify(preferences));
  }

  /**
   * Load user preferences
   */
  loadUserPreferences() {
    try {
      const saved = localStorage.getItem('kanban-preferences');
      if (saved) {
        const preferences = JSON.parse(saved);
        this.visibleColumns = { ...this.visibleColumns, ...preferences.visibleColumns };
        this.completedItemsDaysFilter = preferences.completedItemsDaysFilter || 14;
      }
    } catch (error) {
      console.log('Could not load user preferences:', error);
    }
  }

  exportData() {
    // Export functionality
  }

  trackByColumnId(index: number, column: KanbanColumn): string {
    return column.id;
  }

  trackByRequestId(index: number, request: any): number {
    return request.id;
  }

  trackByAction(index: number, action: any): string {
    return action.action;
  }

  async quickApprove(request: any) {
    try {
      console.log('Quick approving request:', request);
      await this.materialRequestService.updateStatus(request.id, 'approved').toPromise();
      this.toastr.success(`Request ${request.requestNumber || request.request_number} approved`);
      this.loadKanbanData(false);
    } catch (error) {
      console.error('Error approving request:', error);
      this.toastr.error('Error approving request');
    }
  }

  async markAsComplete(request: any) {
    try {
      console.log('Marking request as complete:', request);
      await this.materialRequestService.updateStatus(request.id, 'complete').toPromise();
      this.toastr.success(`Request ${request.requestNumber || request.request_number} marked as complete`);
      this.loadKanbanData(false);
    } catch (error) {
      console.error('Error marking request as complete:', error);
      this.toastr.error('Error marking request as complete');
    }
  }

  /**
   * Quick action to view picking details from Kanban card
   */
  quickViewPicking(request: any, event?: Event) {
    if (event) {
      event.stopPropagation(); // Prevent card click from triggering
    }
    
    console.log('Quick viewing picking details for request:', request);
    this.viewPicking(request);
  }

  /**
   * Get available quick actions for a request based on its status and column
   */
  getQuickActions(request: any): any[] {
    const actions = [];
    const status = request.status;
    
    // Determine column for this request
    const columns = this.determineColumns(request);
    const currentColumn = columns.length > 0 ? columns[0] : null;
    
    // Always add Move Queue action first - available for all requests
    actions.push({
      icon: 'mdi mdi-arrow-right-bold-circle',
      label: 'Move Queue',
      action: 'move_queue',
      class: 'btn btn-outline-secondary btn-sm',
      tooltip: 'Move request to a different queue'
    });
    
    switch (currentColumn) {
      case 'validation':
        actions.push({
          icon: 'mdi mdi-clipboard-check',
          label: 'Validate',
          action: 'validate',
          class: 'btn btn-outline-primary btn-sm',
          tooltip: 'Open validation modal'
        });
        break;
        
      case 'ready_picking':
        // Show picking details + print action to move to in_picking
        actions.push({
          icon: 'mdi mdi-eye',
          label: 'View Picking',
          action: 'view_picking',
          class: 'btn btn-outline-info btn-sm',
          tooltip: 'View picking details'
        });
        actions.push({
          icon: 'mdi mdi-printer',
          label: 'Print & Start',
          action: 'print_and_pick',
          class: 'btn btn-outline-success btn-sm',
          tooltip: 'Print picking slip and start picking'
        });
        break;
        
      case 'in_picking':
        actions.push({
          icon: 'mdi mdi-clipboard-list-outline',
          label: 'View Pick Sheet',
          action: 'view_pick_sheet',
          class: 'btn btn-outline-info btn-sm',
          tooltip: 'View pick sheet with current progress'
        });
        actions.push({
          icon: 'mdi mdi-package-variant-closed',
          label: 'Enter Picked Qty',
          action: 'enter_picked_qty',
          class: 'btn btn-outline-warning btn-sm',
          tooltip: 'Enter picked quantities and shortages'
        });
        actions.push({
          icon: 'mdi mdi-check-all',
          label: 'Complete',
          action: 'mark_complete',
          class: 'btn btn-outline-success btn-sm',
          tooltip: 'Mark picking as complete'
        });
        break;
        
      case 'complete':
        actions.push({
          icon: 'mdi mdi-eye',
          label: 'View',
          action: 'view',
          class: 'btn btn-outline-secondary btn-sm',
          tooltip: 'View request details'
        });
        break;
    }
    
    // Always add edit action if not complete
    if (status !== 'complete' && status !== 'delivered' && status !== 'closed') {
      actions.push({
        icon: 'mdi mdi-pencil',
        label: 'Edit',
        action: 'edit',
        class: 'btn btn-outline-warning btn-sm',
        tooltip: 'Edit request'
      });
    }
    
    return actions;
  }

  /**
   * Handle quick action clicks
   */
  handleQuickAction(action: string, request: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    switch (action) {
      case 'move_queue':
        this.openMoveQueueDialog(request);
        break;
      case 'validate':
        this.validateRequest(request);
        break;
      case 'start_picking':
        this.startPicking(request);
        break;
      case 'view_picking':
        this.quickViewPicking(request);
        break;
      case 'view_pick_sheet':
        this.viewPickSheet(request);
        break;
      case 'enter_picked_qty':
        this.enterPickedQuantities(request);
        break;
      case 'print_and_pick':
        this.printAndStartPicking(request);
        break;
      case 'mark_complete':
        this.markAsComplete(request);
        break;
      case 'view':
        this.viewRequest(request);
        break;
      case 'edit':
        this.editRequest(request);
        break;
      default:
        console.log('Unknown action:', action);
    }
  }

  /**
   * Start picking process - change status to picking
   */
  async startPicking(request: any) {
    try {
      console.log('Starting picking for request:', request);
      await this.materialRequestService.updateStatus(request.id, 'picking').toPromise();
      this.toastr.success(`Picking started for request ${request.requestNumber || request.request_number}`);
      this.loadKanbanData(false);
    } catch (error) {
      console.error('Error starting picking:', error);
      this.toastr.error('Error starting picking process');
    }
  }

  /**
   * Print picking slip and automatically start picking process
   */
  async printAndStartPicking(request: any) {
    try {
      console.log('Printing and starting picking for request:', request);
      
      // First open the picking modal to show details and allow printing
      const printingPromise = new Promise<boolean>((resolve) => {
        const modalRef = this.modalService.open(MaterialRequestPickingModalComponent, {
          size: 'xl',
          backdrop: 'static',
          keyboard: false,
          centered: true,
          windowClass: 'picking-modal',
          container: 'body'
        });

        // Pass the request data to the modal
        modalRef.componentInstance.request = request;
        modalRef.componentInstance.printMode = true; // Special flag to indicate print mode
        modalRef.componentInstance.autoStartPicking = true; // Flag to auto-transition

        modalRef.result.then(
          (result) => {
            if (result === 'printed' || result === 'started') {
              resolve(true);
            } else {
              resolve(false);
            }
          },
          (dismissed) => {
            resolve(false);
          }
        );
      });

      const printed = await printingPromise;
      
      if (printed) {
        // Update status to picking after printing
        await this.materialRequestService.updateStatus(request.id, 'picking').toPromise();
        this.toastr.success(`Picking slip printed and picking started for request ${request.requestNumber || request.request_number}`);
        this.loadKanbanData(false);
      } else {
        this.toastr.info('Picking process cancelled');
      }
    } catch (error) {
      console.error('Error printing and starting picking:', error);
      this.toastr.error('Error processing print and pick request');
    }
  }

  createNewRequest() {
    this.currentModalRef = this.formModalService.open('Create New Material Request', true);

    this.currentModalRef.result.then(
      (result) => {
        if (result === 'saved') {
          this.toastr.success('Material request created successfully');
          this.loadKanbanData(false);
        }
        this.currentModalRef = null;
      },
      (dismissed) => {
        this.currentModalRef = null;
      }
    );
  }

  openValidationModal(request: any) {
    console.log('Opening validation modal for request:', request);
    
    if (this.currentValidationModalRef) {
      this.currentValidationModalRef.close();
      this.currentValidationModalRef = null;
    }
    
    this.selectedRequestForValidation = request;
    
    setTimeout(() => {
      this.currentValidationModalRef = this.modalService.open(MaterialRequestValidationModalComponent, {
        size: 'xl',
        backdrop: 'static',
        keyboard: false,
        centered: true,
        scrollable: true,
        container: 'body'
      });

      // Pass the request data to the modal
      this.currentValidationModalRef.componentInstance.request = request;

      this.currentValidationModalRef.result.then(
        (result) => {
          console.log('Validation modal result:', result);
          if (result === 'updated' || result === 'validated') {
            this.toastr.success('Material request updated successfully');
            this.loadKanbanData(false);
          }
          this.currentValidationModalRef = null;
          this.selectedRequestForValidation = null;
        },
        (dismissed) => {
          console.log('Validation modal dismissed:', dismissed);
          this.currentValidationModalRef = null;
          this.selectedRequestForValidation = null;
        }
      );
    }, 100);
  }

  onValidationModalClose(result?: string) {
    this.currentValidationModalRef?.close(result || 'cancelled');
  }

  // View Request Modal Methods
  viewRequest(request: any) {
    console.log('Opening view modal for request:', request);
    
    if (this.currentViewModalRef) {
      this.currentViewModalRef.close();
    }
    
    this.selectedRequestForView = request;
    
    setTimeout(() => {
      this.currentViewModalRef = this.formModalService.open(
        `View Material Request - ${request.requestNumber || request.request_number}`, 
        false, 
        request.id
      );

      this.currentViewModalRef.result.then(
        (result) => {
          this.currentViewModalRef = null;
          this.selectedRequestForView = null;
        },
        (dismissed) => {
          this.currentViewModalRef = null;
          this.selectedRequestForView = null;
        }
      );
    }, 100);
  }

  // Validate Request Modal Methods
  validateRequest(request: any) {
    console.log('Opening validation modal for request:', request);
    this.openValidationModal(request);
  }

  // Review Request Modal Methods
  reviewRequest(request: any) {
    console.log('Opening review modal for request:', request);
    
    if (this.currentReviewModalRef) {
      this.currentReviewModalRef.close();
    }
    
    this.selectedRequestForReview = request;
    
    setTimeout(() => {
      this.currentReviewModalRef = this.modalService.open(MaterialRequestReviewModalComponent, {
        size: 'xl',
        backdrop: 'static',
        keyboard: false,
        centered: true,
        scrollable: true
      });

      // Pass the request data to the modal
      this.currentReviewModalRef.componentInstance.request = request;
      this.currentReviewModalRef.componentInstance.title = 'Review Material Request';

      this.currentReviewModalRef.result.then(
        (result) => {
          if (result === 'updated' || result === 'reviewed') {
            this.toastr.success('Review completed successfully');
            this.loadKanbanData(false);
          }
          this.currentReviewModalRef = null;
          this.selectedRequestForReview = null;
        },
        (dismissed) => {
          this.currentReviewModalRef = null;
          this.selectedRequestForReview = null;
        }
      );
    }, 100);
  }

  // View Picking Modal Methods
  viewPicking(request: any) {
    console.log('Opening picking modal for request:', request);
    
    if (this.currentPickingModalRef) {
      this.currentPickingModalRef.close();
    }
    
    this.selectedRequestForPicking = request;
    
    setTimeout(() => {
      this.currentPickingModalRef = this.modalService.open(MaterialRequestPickingModalComponent, {
        size: 'xl',
        backdrop: 'static',
        keyboard: false,
        centered: true,
        windowClass: 'picking-modal',
        container: 'body'
      });

      // Pass the request data to the modal
      this.currentPickingModalRef.componentInstance.request = request;

      this.currentPickingModalRef.result.then(
        (result) => {
          if (result === 'updated' || result === 'picked') {
            this.toastr.success('Picking updated successfully');
            this.loadKanbanData(false);
          }
          this.currentPickingModalRef = null;
          this.selectedRequestForPicking = null;
        },
        (dismissed) => {
          this.currentPickingModalRef = null;
          this.selectedRequestForPicking = null;
        }
      );
    }, 100);
  }

  // Edit Request Modal Methods
  editRequest(request: any) {
    console.log('Opening edit modal for request:', request);
    
    if (this.currentEditModalRef) {
      this.currentEditModalRef.close();
    }
    
    this.selectedRequestForEdit = request;
    
    setTimeout(() => {
      this.currentEditModalRef = this.formModalService.open(
        'Edit Material Request', 
        true, 
        request.id
      );

      this.currentEditModalRef.result.then(
        (result) => {
          if (result === 'saved') {
            this.toastr.success('Material request updated successfully');
            this.loadKanbanData(false);
          }
          this.currentEditModalRef = null;
          this.selectedRequestForEdit = null;
        },
        (dismissed) => {
          this.currentEditModalRef = null;
          this.selectedRequestForEdit = null;
        }
      );
    }, 100);
  }

  /**
   * View pick sheet with current picking progress - optimized for viewing only
   */
  viewPickSheet(request: any) {
    console.log('Opening pick sheet view for request:', request);
    
    if (this.currentPickingModalRef) {
      this.currentPickingModalRef.close();
    }
    
    this.selectedRequestForPicking = request;
    
    setTimeout(() => {
      this.currentPickingModalRef = this.modalService.open(MaterialRequestPickingModalComponent, {
        size: 'xl',
        backdrop: 'static',
        keyboard: false,
        centered: true,
        windowClass: 'picking-modal pick-sheet-view',
        container: 'body'
      });

      // Pass the request data to the modal with view-only flag
      this.currentPickingModalRef.componentInstance.request = request;
      this.currentPickingModalRef.componentInstance.viewMode = true; // Read-only mode
      this.currentPickingModalRef.componentInstance.showPickingProgress = true; // Show current progress

      this.currentPickingModalRef.result.then(
        (result) => {
          this.currentPickingModalRef = null;
          this.selectedRequestForPicking = null;
        },
        (dismissed) => {
          this.currentPickingModalRef = null;
          this.selectedRequestForPicking = null;
        }
      );
    }, 100);
  }

  /**
   * Enter picked quantities and shortages - focused on data entry
   */
  enterPickedQuantities(request: any) {
    console.log('Opening picked quantity entry for request:', request);
    
    if (this.currentPickingModalRef) {
      this.currentPickingModalRef.close();
    }
    
    this.selectedRequestForPicking = request;
    
    setTimeout(() => {
      this.currentPickingModalRef = this.modalService.open(MaterialRequestPickingModalComponent, {
        size: 'xl',
        backdrop: 'static',
        keyboard: false,
        centered: true,
        windowClass: 'picking-modal quantity-entry',
        container: 'body'
      });

      // Pass the request data to the modal with quantity entry focus
      this.currentPickingModalRef.componentInstance.request = request;
      this.currentPickingModalRef.componentInstance.editMode = true; // Enable editing
      this.currentPickingModalRef.componentInstance.focusOnQuantities = true; // Focus on qty entry
      this.currentPickingModalRef.componentInstance.showShortageEntry = true; // Enable shortage entry

      this.currentPickingModalRef.result.then(
        (result) => {
          if (result === 'updated' || result === 'quantities_entered') {
            this.toastr.success('Picked quantities updated successfully');
            this.loadKanbanData(false);
          }
          this.currentPickingModalRef = null;
          this.selectedRequestForPicking = null;
        },
        (dismissed) => {
          this.currentPickingModalRef = null;
          this.selectedRequestForPicking = null;
        }
      );
    }, 100);
  }

  // ==============================================
  // Move Queue Dialog Method
  // ==============================================

  /**
   * Open dialog to move request to a different queue
   */
  openMoveQueueDialog(request: any): void {
    console.log('Opening move queue modal for request:', request);
    this.selectedRequestForMove = request;
    
    // Use document to trigger the modal
    const modalElement = document.getElementById('moveQueueModal');
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  /**
   * Close the move queue modal
   */
  closeMoveQueueModal(): void {
    const modalElement = document.getElementById('moveQueueModal');
    if (modalElement) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
    this.selectedRequestForMove = null;
  }

  /**
   * Handle queue selection from modal
   */
  selectTargetQueue(targetQueueId: string): void {
    if (this.selectedRequestForMove && targetQueueId) {
      // Check if this is a backward movement that needs confirmation
      if (this.isBackwardMovement(this.selectedRequestForMove, targetQueueId)) {
        this.showBackwardMovementConfirmation(this.selectedRequestForMove, targetQueueId);
      } else {
        this.closeMoveQueueModal();
        setTimeout(() => {
          this.moveRequestToQueueWithValidation(this.selectedRequestForMove, targetQueueId);
        }, 300); // Wait for modal to close
      }
    }
  }

  /**
   * Get queue options for modal display
   */
  getQueueOptions(): any[] {
    if (!this.selectedRequestForMove) return [];
    
    const currentColumn = this.getCurrentColumnForRequest(this.selectedRequestForMove);
    
    return this.columns.map(column => ({
      value: column.id,
      label: column.title,
      description: column.description,
      icon: column.icon,
      color: column.color,
      isCurrent: column.id === currentColumn,
      canMoveTo: this.canMoveToColumn(this.selectedRequestForMove, column.id),
      recommended: this.isRecommendedQueue(this.selectedRequestForMove, column.id),
      isBackward: this.isBackwardMovement(this.selectedRequestForMove, column.id)
    }));
  }

  /**
   * Get current queue info for selected request
   */
  getCurrentQueueInfo(): any {
    if (!this.selectedRequestForMove) return null;
    
    const currentColumn = this.getCurrentColumnForRequest(this.selectedRequestForMove);
    return this.columns.find(col => col.id === currentColumn);
  }

  /**
   * Simple queue selection using browser prompt (replace with proper modal in production)
   */
  private promptForQueueSelection(queueOptions: any[], currentColumn: string): string | null {
    let message = `Select target queue for request:\n\n`;
    
    queueOptions.forEach((option, index) => {
      const status = option.isCurrent 
        ? ' (CURRENT)' 
        : option.canMoveTo 
          ? ' (ALLOWED)' 
          : ' (RESTRICTED - will show warning)';
      message += `${index + 1}. ${option.title}${status}\n`;
    });
    
    message += `\nEnter queue number (1-${queueOptions.length}) or cancel:`;
    
    const selection = prompt(message);
    if (selection) {
      const index = parseInt(selection) - 1;
      if (index >= 0 && index < queueOptions.length) {
        return queueOptions[index].id;
      }
    }
    
    return null;
  }

  /**
   * Check if moving from current queue to target queue is a backward movement
   */
  isBackwardMovement(request: any, targetQueueId: string): boolean {
    const currentColumn = this.getCurrentColumnForRequest(request);
    
    // Define workflow order (index represents progression)
    const workflowOrder = ['validation', 'ready_picking', 'in_picking', 'complete'];
    
    const currentIndex = workflowOrder.indexOf(currentColumn);
    const targetIndex = workflowOrder.indexOf(targetQueueId);
    
    // Backward movement is when target index is less than current index
    return currentIndex > -1 && targetIndex > -1 && targetIndex < currentIndex;
  }

  /**
   * Check if a queue is recommended for the current request state
   */
  isRecommendedQueue(request: any, targetQueueId: string): boolean {
    const currentColumn = this.getCurrentColumnForRequest(request);
    
    // Define workflow order for progression
    const workflowOrder = ['validation', 'ready_picking', 'in_picking', 'complete'];
    
    const currentIndex = workflowOrder.indexOf(currentColumn);
    const targetIndex = workflowOrder.indexOf(targetQueueId);
    
    // Recommended if it's the next step in normal workflow
    return currentIndex > -1 && targetIndex > -1 && targetIndex === currentIndex + 1;
  }

  /**
   * Show confirmation modal for backward movements
   */
  showBackwardMovementConfirmation(request: any, targetQueueId: string): void {
    const targetColumn = this.columns.find(col => col.id === targetQueueId);
    const currentColumn = this.getCurrentColumnForRequest(request);
    const currentColumnInfo = this.columns.find(col => col.id === currentColumn);
    
    if (!targetColumn || !currentColumnInfo) {
      return;
    }

    const requestNumber = request.requestNumber || request.request_number || request.mrf_number;
    
    const confirmMessage = `
⚠️ BACKWARD MOVEMENT WARNING ⚠️

You are about to move request "${requestNumber}" backward in the workflow:

FROM: ${currentColumnInfo.title}
TO: ${targetColumn.title}

This is moving against the normal workflow direction and may:
• Undo completed work or validations
• Create confusion for other team members
• Require re-doing previous steps
• Impact approval processes

Are you sure you want to proceed with this backward movement?
    `.trim();

    if (confirm(confirmMessage)) {
      this.closeMoveQueueModal();
      setTimeout(() => {
        this.moveRequestToQueueWithValidation(request, targetQueueId);
      }, 300);
    }
    // If user cancels, do nothing - keep modal open
  }

  /**
   * Move request to queue with enhanced validation and user-friendly alerts
   */
  moveRequestToQueueWithValidation(request: any, targetQueueId: string): void {
    const targetColumn = this.columns.find(col => col.id === targetQueueId);
    const currentColumn = this.getCurrentColumnForRequest(request);
    const currentColumnInfo = this.columns.find(col => col.id === currentColumn);
    
    if (!targetColumn) {
      alert('Invalid target queue selected.');
      return;
    }
    
    // Check if movement is allowed by workflow rules
    const isAllowed = this.canMoveToColumn(request, targetQueueId);
    
    if (!isAllowed) {
      // Show detailed warning for restricted movements
      const warningMessage = this.getMovementWarningMessage(request, currentColumn, targetQueueId);
      const proceedAnyway = confirm(`⚠️ WORKFLOW WARNING ⚠️\n\n${warningMessage}\n\nThis movement may skip normal workflow steps or cause issues.\n\nProceed anyway?`);
      
      if (!proceedAnyway) {
        return;
      }
    }
    
    // Final confirmation
    const confirmMessage = `Move request ${request.requestNumber || request.request_number} from "${currentColumnInfo?.title}" to "${targetColumn.title}"?`;
    if (!confirm(confirmMessage)) {
      return;
    }
    
    this.isLoading = true;
    
    // Determine the new status based on target queue
    const newStatus = this.getStatusForQueue(targetQueueId);
    
    // API call to update request status
    this.materialRequestService.updateStatus(request.id, newStatus).subscribe({
      next: (response) => {
        this.toastr.success(`✅ Request moved to ${targetColumn.title} successfully`);
        this.loadKanbanData(false); // Refresh the board
      },
      error: (error) => {
        console.error('Error moving request:', error);
        this.toastr.error('❌ Failed to move request. Please try again.');
        this.isLoading = false;
      }
    });
  }

  /**
   * Get detailed warning message for restricted queue movements
   */
  private getMovementWarningMessage(request: any, fromQueue: string, toQueue: string): string {
    const validationProgress = parseInt(request.validation_progress) || 0;
    const pendingValidations = parseInt(request.pending_validations) || 0;
    const pendingReviews = parseInt(request.pending_reviews) || 0;
    
    switch (`${fromQueue}->${toQueue}`) {
      case 'validation->in_picking':
        return `Moving directly from Validation to In Picking skips the Ready for Picking stage.\n\nCurrent validation: ${validationProgress}%\nPending validations: ${pendingValidations}\n\nThis may cause picking issues if validation is incomplete.`;
      
      case 'validation->complete':
        return `Moving directly from Validation to Complete skips normal picking workflow.\n\nThis should only be done for cancelled or special cases.`;
      
      case 'ready_picking->validation':
        return `Moving back from Ready for Picking to Validation.\n\nThis may indicate validation issues were found after approval.`;
      
      case 'in_picking->validation':
        return `Moving from In Picking back to Validation.\n\nThis typically indicates serious issues found during picking that require re-validation.`;
      
      case 'complete->validation':
      case 'complete->ready_picking':
      case 'complete->in_picking':
        return `Reopening a completed request.\n\nThis will make the request active again and may affect reporting.`;
      
      default:
        return `This movement doesn't follow the normal workflow sequence.\n\nFrom: ${fromQueue}\nTo: ${toQueue}\n\nPlease verify this is the intended action.`;
    }
  }

  // Duplicate Request Method
  duplicateRequest(request: any) {
    console.log('Duplicating request:', request);
    
    this.currentModalRef = this.formModalService.open(
      'Duplicate Material Request', 
      true, 
      request.id
    );

    this.currentModalRef.result.then(
      (result) => {
        if (result === 'saved') {
          this.toastr.success('Material request duplicated successfully');
          this.loadKanbanData(false);
        }
        this.currentModalRef = null;
      },
      (dismissed) => {
        this.currentModalRef = null;
      }
    );
  }

  // Help Guide Method
  openHelpGuide() {
    this.offcanvas.open(MaterialRequestHelpGuideComponent, {
      position: 'end',
      backdrop: 'static',
      scroll: false,
      keyboard: true,
      panelClass: 'help-guide-offcanvas'
    });
  }

  /**
   * Update URL parameters with current filter state
   */
  updateUrlParams() {
    const queryParams: any = {};
    
    // Basic filters
    if (this.searchTerm) queryParams.search = this.searchTerm;
    if (this.selectedDepartment) queryParams.dept = this.selectedDepartment;
    if (this.selectedPriority) queryParams.priority = this.selectedPriority;
    if (this.selectedRequester) queryParams.requester = this.selectedRequester;
    
    // Review filters
    if (this.selectedReviewer) queryParams.reviewer = this.selectedReviewer;
    if (this.selectedReviewStatus) queryParams.reviewStatus = this.selectedReviewStatus;
    if (this.showMyReviewsOnly) queryParams.myReviews = 'true';
    
    // Productivity filters (boolean flags)
    if (this.showHighPriorityOnly) queryParams.highPriority = 'true';
    if (this.showOverdueOnly) queryParams.overdue = 'true';
    if (this.showMyRequestsOnly) queryParams.myRequests = 'true';
    if (this.showMyDepartmentOnly) queryParams.myDept = 'true';
    
    // Advanced filters
    if (this.selectedValidationStatus) queryParams.validation = this.selectedValidationStatus;
    if (this.selectedAgeRange) queryParams.age = this.selectedAgeRange;
    if (this.selectedValueRange) queryParams.value = this.selectedValueRange;
    
    // Column visibility
    const hiddenColumns = Object.keys(this.visibleColumns)
      .filter(key => !this.visibleColumns[key])
      .join(',');
    if (hiddenColumns) queryParams.hideCols = hiddenColumns;
    
    console.log('Updating URL with params:', queryParams);
    
    // Update URL without triggering navigation
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge' // Changed from 'merge' to 'replace'
    });
  }

  /**
   * Load filters from URL parameters on page load
   */
  loadFiltersFromUrl() {
    this.route.queryParams.subscribe(params => {
      console.log('Loading filters from URL:', params);
      
      // Basic filters
      if (params['search']) this.searchTerm = params['search'];
      if (params['dept']) this.selectedDepartment = params['dept'];
      if (params['priority']) this.selectedPriority = params['priority'];
      if (params['requester']) this.selectedRequester = params['requester'];
      
      // Review filters
      if (params['reviewer']) this.selectedReviewer = params['reviewer'];
      if (params['reviewStatus']) this.selectedReviewStatus = params['reviewStatus'];
      this.showMyReviewsOnly = params['myReviews'] === 'true';
      
      // Productivity filters
      this.showHighPriorityOnly = params['highPriority'] === 'true';
      this.showOverdueOnly = params['overdue'] === 'true';
      this.showMyRequestsOnly = params['myRequests'] === 'true';
      this.showMyDepartmentOnly = params['myDept'] === 'true';
      
      // Advanced filters
      if (params['validation']) this.selectedValidationStatus = params['validation'];
      if (params['age']) this.selectedAgeRange = params['age'];
      if (params['value']) this.selectedValueRange = params['value'];
      
      // Column visibility
      if (params['hideCols']) {
        const hiddenColumns = params['hideCols'].split(',');
        console.log('Hidden columns:', hiddenColumns);
        // Reset all columns to visible first
        Object.keys(this.visibleColumns).forEach(key => {
          this.visibleColumns[key] = true;
        });
        // Hide specified columns
        hiddenColumns.forEach((col: string) => {
          if (this.visibleColumns.hasOwnProperty(col)) {
            this.visibleColumns[col] = false;
          }
        });
      }
      
      console.log('Filters loaded:', {
        searchTerm: this.searchTerm,
        selectedDepartment: this.selectedDepartment,
        selectedPriority: this.selectedPriority,
        showHighPriorityOnly: this.showHighPriorityOnly,
        visibleColumns: this.visibleColumns
      });
    });
  }

  /**
   * Enhanced clear filters method that also updates URL
   */
  clearFilters() {
    // Basic filters
    this.searchTerm = '';
    this.selectedDepartment = '';
    this.selectedPriority = '';
    this.selectedRequester = '';
    
    // Review filters
    this.selectedReviewer = '';
    this.selectedReviewStatus = '';
    this.showMyReviewsOnly = false;
    
    // Productivity filters
    this.showMyRequestsOnly = false;
    this.showHighPriorityOnly = false;
    this.showOverdueOnly = false;
    this.showMyDepartmentOnly = false;
    this.selectedValidationStatus = '';
    this.selectedAgeRange = '';
    this.selectedValueRange = '';
    
    // Reset column visibility
    this.visibleColumns = {
      validation: true,
      ready_picking: true,
      in_picking: true,
      complete: true
    };
    
    // Clear URL parameters
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {}
    });
  }

  // ==============================================
  // Drag and Drop Methods
  // ==============================================

  onDragStart(event: DragEvent, request: any): void {
    this.draggedRequest = request;
    this.draggedFromColumn = this.getCurrentColumnForRequest(request);
    
    // Add dragging class for visual feedback
    const element = event.target as HTMLElement;
    element.classList.add('dragging');
    
    // Set drag data
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', request.id.toString());
    }
  }

  onDragEnd(event: DragEvent): void {
    // Remove dragging class
    const element = event.target as HTMLElement;
    element.classList.remove('dragging');
    
    // Clear drag state
    this.draggedRequest = null;
    this.draggedFromColumn = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDragEnter(event: DragEvent, column: KanbanColumn): void {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    
    if (this.canMoveToColumn(this.draggedRequest, column.id)) {
      element.classList.add('drag-over');
    } else {
      element.classList.add('invalid-drop');
    }
  }

  onDragLeave(event: DragEvent): void {
    const element = event.currentTarget as HTMLElement;
    element.classList.remove('drag-over', 'invalid-drop');
  }

  onDrop(event: DragEvent, column: KanbanColumn): void {
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    element.classList.remove('drag-over', 'invalid-drop');
    
    if (this.draggedRequest && this.canMoveToColumn(this.draggedRequest, column.id)) {
      this.moveRequestToQueue(this.draggedRequest, column.id);
    }
  }

  // ==============================================
  // Manual Queue Movement Methods
  // ==============================================

  getAvailableTargetColumns(currentColumnId: string): KanbanColumn[] {
    return this.columns.filter(column => 
      column.id !== currentColumnId && 
      this.canMoveToColumn(this.draggedRequest, column.id)
    );
  }

  moveRequestToQueue(request: any, targetQueueId: string): void {
    if (!this.canMoveToColumn(request, targetQueueId)) {
      this.toastr.warning('This request cannot be moved to that queue at this time.');
      return;
    }

    // Show confirmation dialog
    const targetColumn = this.columns.find(col => col.id === targetQueueId);
    const confirmation = confirm(`Move request ${request.requestNumber} to ${targetColumn?.title}?`);
    
    if (!confirmation) {
      return;
    }

    this.isLoading = true;
    
    // Determine the new status based on target queue
    const newStatus = this.getStatusForQueue(targetQueueId);
    
    // API call to update request status
    this.materialRequestService.updateStatus(request.id, newStatus).subscribe({
      next: (response) => {
        this.toastr.success(`Request moved to ${targetColumn?.title} successfully`);
        this.loadKanbanData(false); // Refresh the board
      },
      error: (error) => {
        console.error('Error moving request:', error);
        this.toastr.error('Failed to move request. Please try again.');
        this.isLoading = false;
      }
    });
  }

  private canMoveToColumn(request: any, targetColumnId: string): boolean {
    if (!request) return false;
    
    const currentColumn = this.getCurrentColumnForRequest(request);
    
    // Don't allow moving to the same column
    if (currentColumn === targetColumnId) return false;
    
    // Define recommended transitions (but don't strictly enforce them)
    const recommendedTransitions: { [key: string]: string[] } = {
      'validation': ['ready_picking'], // Normal flow: validation → ready_picking
      'ready_picking': ['in_picking'], // Normal flow: ready_picking → in_picking  
      'in_picking': ['complete'], // Normal flow: in_picking → complete
      'complete': [] // Completed items normally don't move (but we'll allow with warnings)
    };
    
    // Return true if it's a recommended transition, false if it requires warning
    return recommendedTransitions[currentColumn]?.includes(targetColumnId) || false;
  }

  private getCurrentColumnForRequest(request: any): string {
    // Find which column currently contains this request
    for (const column of this.columns) {
      if (this.getFilteredItems(column).some(item => item.id === request.id)) {
        return column.id;
      }
    }
    return '';
  }

  private getStatusForQueue(queueId: string): string {
    const statusMap: { [key: string]: string } = {
      'validation': 'pending_validation',
      'reviews': 'pending_review',
      'ready_picking': 'approved',
      'in_picking': 'in_progress',
      'complete': 'complete'
    };
    
    return statusMap[queueId] || 'pending_validation';
  }

  // ==============================================
  // Quick Move Actions
  // ==============================================

  quickMoveToNext(request: any): void {
    const currentColumn = this.getCurrentColumnForRequest(request);
    const nextColumn = this.getNextLogicalColumn(currentColumn);
    
    if (nextColumn) {
      this.moveRequestToQueue(request, nextColumn);
    }
  }

  quickMoveToPrevious(request: any): void {
    const currentColumn = this.getCurrentColumnForRequest(request);
    const previousColumn = this.getPreviousLogicalColumn(currentColumn);
    
    if (previousColumn) {
      this.moveRequestToQueue(request, previousColumn);
    }
  }

  private getNextLogicalColumn(currentColumn: string): string | null {
    const flow = ['validation', 'reviews', 'ready_picking', 'in_picking', 'complete'];
    const currentIndex = flow.indexOf(currentColumn);
    
    if (currentIndex >= 0 && currentIndex < flow.length - 1) {
      return flow[currentIndex + 1];
    }
    
    return null;
  }

  private getPreviousLogicalColumn(currentColumn: string): string | null {
    const flow = ['validation', 'reviews', 'ready_picking', 'in_picking', 'complete'];
    const currentIndex = flow.indexOf(currentColumn);
    
    if (currentIndex > 0) {
      return flow[currentIndex - 1];
    }
    
    return null;
  }
}
