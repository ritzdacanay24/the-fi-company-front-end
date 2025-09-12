import { Component, Input, SimpleChanges, ViewChild, TemplateRef } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { NgSelectModule } from '@ng-select/ng-select';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NAVIGATION_ROUTE } from '../material-request-constant';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MaterialRequestFormComponent } from '../material-request-form/material-request-form.component';
import { MaterialRequestService } from '@app/core/api/operations/material-request/material-request.service';
import { MaterialRequestDetailService } from '@app/core/api/operations/material-request/material-request-detail.service';
import { MaterialRequestValidationService, ReviewAssignment } from '@app/core/api/operations/material-request/material-request-validation.service';
import { NewUserService } from '@app/core/api/users/users.service';
import { CommentEmailNotificationService } from '@app/core/api/comment-email-notification/comment-email-notification.service';
import { UserSearchComponent } from '@app/shared/components/user-search/user-search.component';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import materialRequestFormJson from '../material-request-form/material-request-form.json';
import moment from 'moment';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';

interface BusinessFlow {
  type: 'all_approved' | 'all_rejected' | 'mixed_results';
  action: 'picking' | 'complete' | 'partial_picking';
  title: string;
  description: string;
  confirmText: string;
  successMessage: string;
  approvedItems: number;
  rejectedItems: number;
}

@Component({
  standalone: true,
  imports: [SharedModule, NgSelectModule, MaterialRequestFormComponent, UserSearchComponent],
  selector: 'app-material-request-validate',
  templateUrl: './material-request-validate.component.html',
  styleUrls: ['./material-request-validate.component.scss']
})
export class MaterialRequestValidateComponent {
  // Material Request Form Data
  materialRequestForm = materialRequestFormJson;

  constructor(
    private router: Router,
    private api: MaterialRequestService,
    private materialRequestDetailService: MaterialRequestDetailService,
    private validationService: MaterialRequestValidationService,
    private userService: NewUserService,
    private emailNotificationService: CommentEmailNotificationService,
    private toastrService: ToastrService,
    private fb: FormBuilder,
    private modalService: NgbModal
  ) { }

  ngOnInit(): void {
    // Initialize the form structure to match the form component
    this.form = this.fb.group({
      main: this.fb.group({
        active: new FormControl(1),
        assemblyNumber: new FormControl("", Validators.required),
        createdBy: new FormControl(null),
        createdDate: new FormControl(null),
        deleteReason: new FormControl(""),
        deleteReasonBy: new FormControl(null),
        deleteReasonDate: new FormControl(null),
        dueDate: new FormControl(null, Validators.required),
        info: new FormControl(""),
        isCableRequest: new FormControl(""),
        lineNumber: new FormControl("", Validators.required),
        pickList: new FormControl("", Validators.required),
        pickedCompletedDate: new FormControl(null),
        priority: new FormControl("Low"),
        requestor: new FormControl("", Validators.required),
        specialInstructions: new FormControl(""),
        validated: new FormControl(null),
      }),
      details: this.fb.array([]),
    });
    
    this.initializeReviewForm();
    this.loadAvailableReviewers();
    
    // Load data if ID is provided
    if (this.id) {
      this.getData();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['id'].currentValue) {
      this.id = changes['id'].currentValue;
      this.getData();
    }
  }


  title = "Validatessss";

  form: FormGroup;

  @Input() id = null;

  isLoading = false;

  isSubmittingToPicking = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.VALIDATION], { queryParamsHandling: 'merge' });
  }

  data: any;

  details: FormArray;
  header

  // Modal properties
  @ViewChild('editRequestModal', { static: false }) editRequestModal!: TemplateRef<any>;
  currentModalRef: NgbModalRef | null = null;
  modalForm: any = null;
  modalFormSubmitted = false;

  // Employee review properties
  showReviewModal = false;
  availableReviewers: any[] = [];
  selectedItems: any[] = [];
  reviewForm: FormGroup;
  itemsForReview: any[] = [];
  selectedItemsForReview: Set<number> = new Set();
  reviewData: Map<number, any[]> = new Map(); // Store review data by item ID
  
  // Row expansion properties
  expandedRows: Set<number> = new Set();

  async getData() {
    // Prevent concurrent getData calls that might cause duplicate form controls
    if (this.isLoading) {
      console.log('getData() already in progress, skipping duplicate call');
      return;
    }

    try {
      this.details?.clear()
      this.form?.reset()

      this.isLoading = true;
      let data: any = this.header = await this.api.getById(this.id);
      this.data = await this.materialRequestDetailService.find({ mrf_id: data.id });

      if (this.data) {
        this.details = this.form.get('details') as FormArray;
        for (let i = 0; i < this.data.length; i++) {
          let row = this.data[i];
          console.log(`Initializing item ${i}:`, row);
          console.log(`Item ${i} ID:`, row.id);
          
          const formGroup = this.fb.group({
            id: new FormControl(row.id),
            partNumber: new FormControl(row.partNumber, Validators.required),
            reasonCode: new FormControl(row.reasonCode, Validators.required),
            qty: new FormControl(row.qty, Validators.required),
            trType: new FormControl(row.trType),
            ac_code: new FormControl(row.ac_code),
            notes: new FormControl(row.notes),
            availableQty: new FormControl(row.availableQty),
            description: new FormControl(row.description),
            // Keep minimal validation fields for UI display only
            validationStatus: new FormControl(row.validationStatus || 'pending'),
            validationComment: new FormControl(row.validationComment || ''),
            validatedBy: new FormControl(row.validatedBy),
            validatedAt: new FormControl(row.validatedAt)
          });
          
          console.log(`Form group ${i} value after creation:`, formGroup.value);
          console.log(`Form group ${i} ID control value:`, formGroup.get('id')?.value);
          
          this.details.push(formGroup);

        }
        
        // Load review data for all items
        await this.loadReviewData();
      }

      this.form.patchValue({ main: data }, { emitEvent: false })

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  async loadReviewData() {
    try {
      console.log('Starting loadReviewData...');
      if (!this.data || this.data.length === 0) {
        console.log('No data available, skipping review data load');
        return;
      }

      // Extract all item IDs
      const itemIds = this.data.map(item => item.id).filter(id => id);
      console.log('Item IDs to load reviews for:', itemIds);
      
      if (itemIds.length === 0) {
        console.log('No valid item IDs found');
        return;
      }

      // Make a single bulk API call instead of multiple individual calls
      console.log('Calling getBulkItemReviews...');
      const bulkReviews = await this.validationService.getBulkItemReviews(itemIds).toPromise();
      console.log('Bulk reviews response:', bulkReviews);
      
      // Populate reviewData map from the bulk response
      this.reviewData.clear();
      if (bulkReviews) {
        console.log('Processing bulk reviews response...');
        Object.keys(bulkReviews).forEach(itemId => {
          const numericItemId = parseInt(itemId);
          console.log(`Processing item ${itemId} (numeric: ${numericItemId}):`, bulkReviews[itemId]);
          this.reviewData.set(numericItemId, bulkReviews[itemId] || []);
        });
      }

      // Ensure all items have an entry in reviewData (even if empty)
      itemIds.forEach(itemId => {
        const numericItemId = parseInt(itemId.toString());
        if (!this.reviewData.has(numericItemId)) {
          console.log(`Adding empty reviews for item ${numericItemId}`);
          this.reviewData.set(numericItemId, []);
        }
      });

      console.log('Final reviewData map:', this.reviewData);
    } catch (error) {
      console.error('Error loading review data:', error);
      // Fallback to individual calls if bulk fails
      console.log('Attempting fallback to individual review loading...');
      await this.loadReviewDataIndividually();
    }
  }

  async loadReviewDataIndividually() {
    try {
      // Fallback method - individual API calls
      for (const item of this.data) {
        const reviews = await this.validationService.getItemReviews(item.id).toPromise();
        this.reviewData.set(item.id, reviews || []);
      }
    } catch (error) {
      console.error('Error loading review data individually:', error);
    }
  }

  initializeReviewForm() {
    this.reviewForm = this.fb.group({
      reviewerId: ['', Validators.required],
      reviewNote: [''],
      priority: ['normal', Validators.required]
    });
  }

  async loadAvailableReviewers() {
    try {
      // Load users who can review material requests
      const users = await this.userService.getAll();
      this.availableReviewers = users.filter(user => 
        user.role === 'supervisor' || 
        user.role === 'manager' || 
        user.permissions?.includes('material_request_review')
      );
    } catch (error) {
      console.error('Error loading reviewers:', error);
    }
  }

  // Handle reviewer selection from user search component
  selectedReviewer: any = null;
  
  onReviewerSelected(selectedUser: any) {
    if (selectedUser && selectedUser.id) {
      this.selectedReviewer = selectedUser;
      this.reviewForm.patchValue({
        reviewerId: selectedUser.id
      });
    } else {
      this.selectedReviewer = null;
      this.reviewForm.patchValue({
        reviewerId: ''
      });
    }
  }

  async onSubmit() {
    // Prevent duplicate submissions
    if (this.isLoading) {
      return;
    }

    console.log('Save operation - ID check:', this.id);
    
    if (!this.id) {
      this.toastrService.error('No material request ID found. Cannot save.');
      return;
    }

    this.submitted = true;

    if (this.form.invalid && this.form.value.main.active == 1) {
      return;
    }

    try {
      this.isLoading = true;
      
      console.log('Starting save operation...');
      console.log('Raw form value:', this.form.value);
      console.log('Form details raw:', this.form.value.details);
      
      // Get form data and ensure all IDs are preserved
      let formData = { ...this.form.value };
      
      // Manually ensure all detail items have their IDs preserved
      if (formData.details && this.data) {
        formData.details = formData.details.map((item: any, index: number) => {
          const originalId = this.data[index]?.id;
          const formId = item.id;
          const preservedId = formId || originalId;
          
          console.log(`Item ${index}: originalId=${originalId}, formId=${formId}, preservedId=${preservedId}`);
          
          return {
            ...item,
            id: preservedId
          };
        });
      }
      
      console.log('Form details with preserved IDs:', formData.details?.map((item: any) => ({ 
        id: item.id, 
        partNumber: item.partNumber, 
        validationStatus: item.validationStatus,
        validationComment: item.validationComment,
        validatedBy: item.validatedBy,
        validatedAt: item.validatedAt
      })));
      
      // Verify all details have IDs before sending
      const detailsWithoutIds = formData.details?.filter((item: any) => !item.id) || [];
      if (detailsWithoutIds.length > 0) {
        console.warn('Found details without IDs after preservation attempt:', detailsWithoutIds);
        this.toastrService.error('Some items are missing IDs. Cannot update properly.');
        this.isLoading = false;
        return;
      }
      
      console.log('Saving to ID:', this.id);
      
      // Use the formData with preserved IDs instead of this.form.value
      await this.api.update(this.id, formData);
      
      this.isLoading = false;
      this.toastrService.success('Successfully Updated');
      this.goBack(true);
    } catch (err) {
      this.isLoading = false;
      this.toastrService.error('Save failed. Please try again.');
      console.error('Save error:', err);
    }
  }

  // Bulk save method that uses the existing onSubmit functionality
  async onBulkSaveChanges() {
    console.log('💾 onBulkSaveChanges: Bulk save requested - calling existing save functionality');
    if (this.isLoading) {
      console.log('🚫 onBulkSaveChanges: Already loading, preventing duplicate submission');
      return;
    }
    await this.onSubmit();
  }

  async onSubmitAndSendToPicking() {
    // Prevent duplicate submissions
    if (this.isLoading) {
      console.log('🚫 onSubmitAndSendToPicking: Already loading, preventing duplicate submission');
      return;
    }

    console.log('🔄 onSubmitAndSendToPicking: Starting validation process');
    console.log('Validation operation - ID check:', this.id);
    
    if (!this.id) {
      this.toastrService.error('No material request ID found. Cannot validate.');
      return;
    }

    if (this.form.value.details?.length == 0) {
      alert('No items to be picked.')
      return;
    }

    this.submitted = true;

    if (this.form.invalid) {
      getFormValidationErrors()
      return;
    }

    // Check validation status and pending reviews before proceeding
    const validationCheck = this.validateBeforeSendingToPicking();
    if (!validationCheck.canSendToPicking) {
      this.toastrService.error(validationCheck.message);
      return;
    }

    // Analyze item statuses to determine business flow
    const businessFlow = this.analyzeBusinessFlow();
    
    // Show confirmation dialog based on business flow
    const confirmResult = await this.showValidationConfirmation(businessFlow);
    if (!confirmResult) {
      return; // User cancelled
    }

    try {
      this.isLoading = true;
      
      console.log('Starting validation operation...');
      console.log('Form value:', this.form.value);
      console.log('Form details with IDs:', this.form.value.details?.map((item: any) => ({ id: item.id, partNumber: item.partNumber, validationStatus: item.validationStatus })));
      console.log('Validating with ID:', this.id);
      
      // Execute business flow action
      await this.executeBusinessFlow(businessFlow);
      
      // Save the form data in a single update call (like the old working version)
      const formData = {
        ...this.form.value,
        main: {
          ...this.form.value.main,
          validated: moment().format('YYYY-MM-DD HH:mm:ss')
        }
      };
      
      await this.api.update(this.id, formData);
      
      this.isLoading = false;
      this.toastrService.success(businessFlow.successMessage);
      this.goBack(true);
    } catch (err) {
      this.isLoading = false;
      this.toastrService.error('Validation failed. Please try again.');
    }

  }

  validateBeforeSendingToPicking(): { canSendToPicking: boolean, message: string, details?: any[] } {
    // Add null checks to prevent errors during initialization
    if (!this.details || this.details.length === 0) {
      return {
        canSendToPicking: false,
        message: 'No items to validate',
        details: []
      };
    }

    const validationIssues: any[] = [];
    
    for (let i = 0; i < this.details.length; i++) {
      const formGroup = this.details.at(i) as FormGroup;
      if (!formGroup) continue; // Skip if form group is invalid
      
      const itemId = this.data && this.data[i] ? this.data[i].id : null;
      const partNumber = formGroup.get('partNumber')?.value;
      const validationStatus = formGroup.get('validationStatus')?.value;
      const reviews = this.getItemReviewDetails(i); // Use the improved method
      
      // Check if item is validated
      if (validationStatus === 'pending') {
        validationIssues.push({
          partNumber,
          issue: 'Not validated (pending approval/rejection)',
          type: 'validation'
        });
        continue;
      }
      
      // If item has reviews, check their status
      if (reviews.length > 0) {
        const pendingReviews = reviews.filter(r => r.reviewStatus === 'pending_review' || r.reviewStatus === 'assigned');
        const needsClarification = reviews.filter(r => r.reviewStatus === 'reviewed' && r.reviewDecision === 'needs_clarification');
        
        /* 
        UPDATED BLOCKING LOGIC FOR PICKING:
        
        Business Rule: Items can be sent to picking if:
        - Validation status is NOT 'pending' AND
        - Review status is NOT 'pending_review' AND
        - No reviews need clarification
        
        Rejections alone do not block picking if there are approvals or if reviews are complete.
        This allows business flexibility where one department can approve even if another rejected.
        */
        
        // Priority 1: Any pending review blocks picking
        if (pendingReviews.length > 0) {
          validationIssues.push({
            partNumber,
            issue: `${pendingReviews.length} pending review(s) from: ${pendingReviews.map(r => r.reviewerDepartment || r.department || 'Unknown').join(', ')}`,
            type: 'pending_review'
          });
        }
        // Priority 2: Any clarification request blocks picking
        else if (needsClarification.length > 0) {
          validationIssues.push({
            partNumber,
            issue: `Needs clarification from: ${needsClarification.map(r => r.reviewerDepartment || r.department || 'Unknown').join(', ')}`,
            type: 'needs_clarification'
          });
        }
        // Note: Rejected reviews no longer block picking by themselves
        // Business decision: Multiple departments can have different opinions,
        // and one approval can override rejections for picking purposes
      }
    }
    
    if (validationIssues.length > 0) {
      const message = `Cannot send to picking. Issues found:\n${validationIssues.map(issue => 
        `• ${issue.partNumber}: ${issue.issue}`
      ).join('\n')}`;
      
      return {
        canSendToPicking: false,
        message,
        details: validationIssues
      };
    }
    
    return {
      canSendToPicking: true,
      message: 'All items are ready for picking'
    };
  }

  /**
   * Public getter to check if validation can proceed
   * Used by parent components to control button states
   */
  get canValidate(): boolean {
    return this.validateBeforeSendingToPicking().canSendToPicking;
  }

  /**
   * Analyzes the current item statuses to determine the appropriate business flow
   */
  analyzeBusinessFlow(): BusinessFlow {
    const approvedCount = this.countByStatus(null, 'approved');
    const rejectedCount = this.countByStatus(null, 'rejected');
    const totalItems = this.details.length;
    
    if (approvedCount === 0 && rejectedCount === totalItems) {
      // All items rejected
      return {
        type: 'all_rejected',
        action: 'complete',
        title: 'All Items Rejected',
        description: `All ${totalItems} items have been rejected. The material request will be marked as complete with no items sent to picking.`,
        confirmText: 'Mark as Complete',
        successMessage: 'Material request completed - all items were rejected.',
        approvedItems: 0,
        rejectedItems: rejectedCount
      };
    } else if (approvedCount === totalItems && rejectedCount === 0) {
      // All items approved
      return {
        type: 'all_approved',
        action: 'picking',
        title: 'All Items Approved',
        description: `All ${totalItems} items have been approved and will be sent to picking.`,
        confirmText: 'Send to Picking',
        successMessage: 'Successfully sent all items to picking.',
        approvedItems: approvedCount,
        rejectedItems: 0
      };
    } else {
      // Mixed results
      return {
        type: 'mixed_results',
        action: 'partial_picking',
        title: 'Mixed Results',
        description: `${approvedCount} items approved (will go to picking), ${rejectedCount} items rejected (will be marked as complete).`,
        confirmText: 'Process Results',
        successMessage: `Successfully processed: ${approvedCount} items sent to picking, ${rejectedCount} items completed as rejected.`,
        approvedItems: approvedCount,
        rejectedItems: rejectedCount
      };
    }
  }

  /**
   * Shows a confirmation dialog based on the business flow
   */
  async showValidationConfirmation(businessFlow: BusinessFlow): Promise<boolean> {
    const { default: Swal } = await import('sweetalert2');
    
    // Set higher z-index for SweetAlert to appear above NgBootstrap modals
    const originalZIndex = (document.querySelector('.swal2-container') as HTMLElement)?.style.zIndex;
    
    const result = await Swal.fire({
      title: businessFlow.title,
      html: `
        <div class="text-start">
          <p class="mb-3">${businessFlow.description}</p>
          <div class="alert alert-info small">
            <div class="d-flex justify-content-between">
              <span><i class="mdi mdi-check-circle text-success me-1"></i>Approved Items:</span>
              <strong>${businessFlow.approvedItems}</strong>
            </div>
            <div class="d-flex justify-content-between">
              <span><i class="mdi mdi-close-circle text-danger me-1"></i>Rejected Items:</span>
              <strong>${businessFlow.rejectedItems}</strong>
            </div>
          </div>
        </div>
      `,
      icon: businessFlow.type === 'all_rejected' ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: businessFlow.confirmText,
      cancelButtonText: 'Cancel',
      confirmButtonColor: businessFlow.type === 'all_rejected' ? '#dc3545' : '#28a745',
      focusCancel: businessFlow.type === 'all_rejected', // Focus cancel for destructive actions
      backdrop: true,
      allowOutsideClick: false,
      heightAuto: false, // Prevent viewport issues
      customClass: {
        container: 'swal-validation-modal'
      },
      didOpen: () => {
        // Ensure SweetAlert appears above NgBootstrap modals
        const swalContainer = document.querySelector('.swal2-container') as HTMLElement;
        if (swalContainer) {
          swalContainer.style.zIndex = '9999';
        }
      }
    });

    return result.isConfirmed;
  }

  /**
   * Executes the appropriate business flow action
   */
  async executeBusinessFlow(businessFlow: BusinessFlow): Promise<void> {
    switch (businessFlow.action) {
      case 'complete':
        // Mark request as complete (all items rejected)
        await this.markRequestAsComplete();
        break;
      case 'picking':
        // Send all items to picking (all approved)
        await this.sendApprovedItemsToPicking();
        break;
      case 'partial_picking':
        // Send approved items to picking, complete rejected items
        await this.sendApprovedItemsToPicking();
        await this.markRejectedItemsAsComplete();
        break;
    }
  }

  /**
   * Marks the entire request as complete
   */
  async markRequestAsComplete(): Promise<void> {
    // Implementation depends on your API structure
    // This might involve updating the main request status
    console.log('Marking request as complete - all items rejected');
  }

  /**
   * Sends approved items to picking
   */
  async sendApprovedItemsToPicking(): Promise<void> {
    // Implementation depends on your API structure
    // This might involve updating item statuses or creating picking tasks
    console.log('Sending approved items to picking');
  }

  /**
   * Marks rejected items as complete
   */
  async markRejectedItemsAsComplete(): Promise<void> {
    // Implementation depends on your API structure
    // This might involve updating rejected item statuses
    console.log('Marking rejected items as complete');
  }

  /**
   * Updates validation reviews in the mr_review table instead of mr_detail
   */
  async updateValidationReviews(): Promise<void> {
    const details = this.form.value.details;
    
    if (!details || details.length === 0) {
      console.log('No details to update');
      return;
    }

    console.log('Updating validation reviews for details:', details);

    try {
      // Process each item's validation status
      for (let i = 0; i < details.length; i++) {
        const detail = details[i];
        if (!detail.id) continue;

        const validationStatus = detail.validationStatus;
        const validationComment = detail.validationComment;

        console.log(`Processing item ${detail.id} (${detail.partNumber}): status=${validationStatus}, comment=${validationComment}`);

        // Skip items that are already processed and haven't changed
        const formGroup = this.details.at(i) as FormGroup;
        const currentFormStatus = formGroup.get('validationStatus')?.value;
        
        // Only process if the form status differs from the current validation status
        // This prevents duplicate API calls for items that haven't changed
        if (currentFormStatus === validationStatus) {
          console.log(`Skipping item ${detail.id} - already has status ${validationStatus}`);
          continue;
        }

        // Update the review record based on validation status
        if (validationStatus === 'approved') {
          console.log(`Approving item ${detail.id}`);
          await this.validationService.approveItem(detail.id).toPromise();
          
          // Update the form group to reflect the change
          const formGroup = this.details.at(i) as FormGroup;
          formGroup.patchValue({
            validationStatus: 'approved',
            validatedBy: 'current_user',
            validatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
          });
          
        } else if (validationStatus === 'rejected') {
          console.log(`Rejecting item ${detail.id}`);
          await this.validationService.rejectItem(detail.id, validationComment || 'Item rejected during validation').toPromise();
          
          // Update the form group to reflect the change
          formGroup.patchValue({
            validationStatus: 'rejected',
            validationComment: validationComment || 'Item rejected during validation',
            validatedBy: 'current_user',
            validatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
          });
        }
        
        // Add comment if provided and different from current (separate from approve/reject)
        const currentComment = formGroup.get('validationComment')?.value;
        if (validationComment && validationComment.trim() && validationComment.trim() !== currentComment) {
          console.log(`Adding/updating comment for item ${detail.id}: ${validationComment}`);
          await this.validationService.addComment(detail.id, validationComment.trim()).toPromise();
        }
      }
      
      console.log('Validation reviews updated successfully');
    } catch (error) {
      console.error('Error updating validation reviews:', error);
      throw error;
    }
  }

  onCancel() {
    this.goBack()
  }

  onDeleteItem = async ($event, index) => {
    if (!$event?.id) {
      this.details.removeAt(index);
      return;
    }

    try {
      if (!confirm('Are you sure you want to delete this line item?')) return;
      this.isLoading = true;
      await this.materialRequestDetailService.delete($event?.id);
      this.details.removeAt(index);

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }

  }

  // Per-item validation methods
  async approvePart(item: any, index: number) {
    console.log('approvePart called with item:', item);
    console.log('approvePart called with index:', index);
    
    // Validate inputs
    if (index < 0 || !this.details || index >= this.details.length) {
      console.error('Invalid index in approvePart:', index);
      this.toastrService.error('Invalid item index. Cannot approve.');
      return;
    }

    const formGroup = this.details.at(index) as FormGroup;
    if (!formGroup) {
      console.error('No form group found at index:', index);
      this.toastrService.error('Form data not found. Cannot approve.');
      return;
    }

    // Check if already approved to prevent duplicate operations
    const currentStatus = formGroup.get('validationStatus')?.value;
    if (currentStatus === 'approved') {
      console.log('Item already approved, skipping duplicate operation');
      this.toastrService.info('Item is already approved.');
      return;
    }

    // Get part number for display (with fallback)
    const partNumber = item?.partNumber || 
                      formGroup.get('partNumber')?.value || 
                      this.data?.[index]?.partNumber || 
                      'Unknown Part';
    
    try {
      // Log current form state before update
      console.log('Before approval - FormGroup value:', formGroup.value);
      console.log('Before approval - ID from form:', formGroup.get('id')?.value);
      console.log('Before approval - ID from data array:', this.data?.[index]?.id);
      
      // Ensure the ID is preserved - get it before patching
      const itemId = formGroup.get('id')?.value || this.data?.[index]?.id;
      
      // Only update the form locally - no API call
      // The actual database update will happen when the main form is submitted
      formGroup.patchValue({
        id: itemId, // Explicitly preserve the ID
        validationStatus: 'approved',
        validatedBy: 'current_user',
        validatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
      });
      
      // Log form state after update to ensure ID is preserved
      console.log('After approval - FormGroup value:', formGroup.value);
      console.log('After approval - ID from form:', formGroup.get('id')?.value);
      
      this.toastrService.success(`Part ${partNumber} approved.`);
      this.updateValidationProgress();
      
      // Automatically save the changes after approval
      await this.onSubmit();
    } catch (error) {
      console.error('Error in approvePart:', error);
      this.toastrService.error('Error approving item');
    }
  }

  async rejectPart(item: any, index: number) {
    // Validate inputs
    if (index < 0 || !this.details || index >= this.details.length) {
      console.error('Invalid index in rejectPart:', index);
      this.toastrService.error('Invalid item index. Cannot reject.');
      return;
    }

    const formGroup = this.details.at(index) as FormGroup;
    if (!formGroup) {
      console.error('No form group found at index:', index);
      this.toastrService.error('Form data not found. Cannot reject.');
      return;
    }

    // Check if already rejected to prevent duplicate operations
    const currentStatus = formGroup.get('validationStatus')?.value;
    if (currentStatus === 'rejected') {
      console.log('Item already rejected, skipping duplicate operation');
      this.toastrService.info('Item is already rejected.');
      return;
    }

    const comment = prompt('Enter rejection reason (required):', '');
    if (!comment) {
      this.toastrService.warning('Rejection reason is required');
      return;
    }

    // Get part number for display (with fallback)
    const partNumber = item?.partNumber || 
                      formGroup.get('partNumber')?.value || 
                      this.data?.[index]?.partNumber || 
                      'Unknown Part';

    try {
      // Ensure the ID is preserved - get it before patching
      const itemId = formGroup.get('id')?.value || this.data?.[index]?.id;
      
      // Only update the form locally - no API call
      // The actual database update will happen when the main form is submitted
      formGroup.patchValue({
        id: itemId, // Explicitly preserve the ID
        validationStatus: 'rejected',
        validationComment: comment,
        validatedBy: 'current_user',
        validatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
      });
      
      this.toastrService.error(`Part ${partNumber} rejected.`);
      this.updateValidationProgress();
      
      // Automatically save the changes after rejection
      await this.onSubmit();
    } catch (error) {
      console.error('Error in rejectPart:', error);
      this.toastrService.error('Error rejecting item');
    }
  }

  async undoPart(item: any, index: number) {
    // Validate inputs first
    if (index < 0 || !this.details || index >= this.details.length) {
      console.error('Invalid index in undoPart:', index);
      this.toastrService.error('Invalid item index. Cannot reset.');
      return;
    }

    const currentStatus = this.getItemStatus(index);
    
    if (currentStatus === 'pending') {
      this.toastrService.info('Item is already pending');
      return;
    }

    // Get part number for display (with fallback)
    const partNumber = item?.partNumber || 
                      this.details.at(index)?.get('partNumber')?.value || 
                      this.data?.[index]?.partNumber || 
                      'Unknown Part';

    const confirmMessage = `Are you sure you want to reset "${partNumber}" back to pending status? This will undo the ${currentStatus} decision.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    const formGroup = this.details.at(index) as FormGroup;
    if (!formGroup) {
      console.error('No form group found at index:', index);
      this.toastrService.error('Form data not found. Cannot reset.');
      return;
    }

    try {
      // Ensure the ID is preserved - get it before patching
      const itemId = formGroup.get('id')?.value || this.data?.[index]?.id;
      
      // Only update the form locally - no API call
      // The actual database update will happen when the main form is submitted
      formGroup.patchValue({
        id: itemId, // Explicitly preserve the ID
        validationStatus: 'pending',
        validationComment: '',
        validatedBy: null,
        validatedAt: null
      });
      
      this.toastrService.info(`Part ${partNumber} reset to pending status.`);
      this.updateValidationProgress();
      
      // Automatically save the changes after undo
      await this.onSubmit();
    } catch (error) {
      console.error('Error in undoPart:', error);
      this.toastrService.error('Error resetting item status');
    }
  }

  async commentPart(item: any, index: number) {
    // Validate inputs first
    if (index < 0 || !this.details || index >= this.details.length) {
      console.error('Invalid index in commentPart:', index);
      this.toastrService.error('Invalid item index. Cannot add comment.');
      return;
    }

    const formGroup = this.details.at(index) as FormGroup;
    if (!formGroup) {
      console.error('No form group found at index:', index);
      this.toastrService.error('Form data not found. Cannot add comment.');
      return;
    }

    // Get existing comment for pre-population
    const existingComment = item?.validationComment || 
                           formGroup.get('validationComment')?.value || 
                           this.data?.[index]?.validationComment || 
                           '';

    const comment = prompt('Enter comment for part:', existingComment);
    if (comment !== null) {
      try {
        // Ensure the ID is preserved - get it before patching
        const itemId = formGroup.get('id')?.value || this.data?.[index]?.id;
        
        // Only update the form locally - no API call
        // The actual database update will happen when the main form is submitted
        formGroup.patchValue({
          id: itemId, // Explicitly preserve the ID
          validationComment: comment
        });
        
        this.toastrService.info('Comment added.');
        
        // Automatically save the changes after adding comment
        await this.onSubmit();
      } catch (error) {
        console.error('Error in commentPart:', error);
        this.toastrService.error('Error updating comment');
      }
    }
  }

  // Send item(s) for additional review
  openReviewModal(item?: any, index?: number) {
    if (item && index !== undefined) {
      // Single item review
      this.itemsForReview = [{ ...item, formIndex: index }];
      this.selectedItemsForReview.clear();
      this.selectedItemsForReview.add(index);
    } else {
      // Multiple items review (from selected checkboxes)
      this.itemsForReview = [];
      this.selectedItemsForReview.forEach(idx => {
        const formGroup = this.details.at(idx) as FormGroup;
        const item = formGroup.value;
        this.itemsForReview.push({ ...item, formIndex: idx });
      });
    }
    
    this.showReviewModal = true;
    this.selectedReviewer = null;
    this.reviewForm.reset({
      reviewerId: '',
      reviewNote: '',
      priority: 'normal'
    });
  }

  closeReviewModal() {
    this.showReviewModal = false;
    this.itemsForReview = [];
    this.selectedItemsForReview.clear();
    this.selectedReviewer = null;
  }

  async submitForReview() {
    if (this.reviewForm.invalid) {
      this.toastrService.warning('Please select a reviewer');
      return;
    }

    const reviewData = this.reviewForm.value;
    const itemIds = this.itemsForReview.map(item => item.id);
    
    const assignment: ReviewAssignment = {
      reviewerId: reviewData.reviewerId,
      reviewNote: reviewData.reviewNote,
      priority: reviewData.priority,
      itemIds: itemIds,
      department: ''
    };
    
    try {
      await this.validationService.sendForReview(assignment).toPromise();
      
      // Update form controls
      for (const item of this.itemsForReview) {
        const formGroup = this.details.at(item.formIndex) as FormGroup;
        formGroup.patchValue({
          reviewStatus: 'pending_review',
          reviewerId: reviewData.reviewerId,
          reviewNote: reviewData.reviewNote,
          reviewPriority: reviewData.priority
        });
      }

      // Send notification to reviewer
      await this.sendReviewNotification(reviewData.reviewerId, this.itemsForReview, reviewData);

      // Reload review data to get updated status
      await this.loadReviewData();

      this.toastrService.success(`${this.itemsForReview.length} item(s) sent for review`);
      this.closeReviewModal();
      this.updateValidationProgress();
    } catch (error) {
      this.toastrService.error('Error sending items for review');
    }
  }

  async sendReviewNotification(reviewerId: string, items: any[], reviewData: any) {
    try {
      const reviewer = this.availableReviewers.find(r => r.id === reviewerId);
      
      // Create notification data for each item
      for (const item of items) {
        const notificationData = {
          to: reviewer.email,
          subject: `Material Request Review Required - ${item.partNumber}`,
          body: `
            You have been assigned to review a material request item:
            
            Part Number: ${item.partNumber}
            Description: ${item.description}
            Quantity: ${item.qty}
            Reason: ${item.reasonCode}
            Priority: ${reviewData.priority}
            
            Review Note: ${reviewData.reviewNote || 'None'}
            
            Please review this item in the Material Request Validation system.
          `,
          type: 'material_request_review',
          entityId: item.id,
          entityType: 'material_request_detail'
        };

        // Use the notification service (adjust method name as needed)
        if (this.emailNotificationService && typeof this.emailNotificationService.create === 'function') {
          await this.emailNotificationService.create(notificationData);
        }
      }
    } catch (error) {
      console.error('Error sending review notification:', error);
      // Don't fail the whole operation if notification fails
    }
  }

  // Event handlers
  handleSelectAllChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.selectAllItems();
    } else {
      this.deselectAllItems();
    }
  }

  // Checkbox management for bulk operations
  toggleItemSelection(index: number) {
    if (this.selectedItemsForReview.has(index)) {
      this.selectedItemsForReview.delete(index);
    } else {
      this.selectedItemsForReview.add(index);
    }
  }

  isItemSelected(index: number): boolean {
    return this.selectedItemsForReview.has(index);
  }

  hasSelectedItems(): boolean {
    return this.selectedItemsForReview.size > 0;
  }

  hasSelectedItemsWithStatus(statuses: string[]): boolean {
    if (this.selectedItemsForReview.size === 0) {
      return false;
    }
    
    for (const index of this.selectedItemsForReview) {
      const status = this.getItemStatus(index);
      if (statuses.includes(status)) {
        return true;
      }
    }
    return false;
  }

  hasSelectedItemsWithPendingReviews(): boolean {
    if (this.selectedItemsForReview.size === 0) {
      return false;
    }
    
    for (const index of this.selectedItemsForReview) {
      if (this.canCancelReview(index)) {
        return true;
      }
    }
    return false;
  }

  async undoSelectedItems() {
    const selectedItems = Array.from(this.selectedItemsForReview);
    const itemsToUndo = selectedItems.filter(index => {
      const status = this.getItemStatus(index);
      return status === 'approved' || status === 'rejected';
    });

    if (itemsToUndo.length === 0) {
      this.toastrService.warning('No approved or rejected items selected to undo');
      return;
    }

    const confirmMessage = `Are you sure you want to reset ${itemsToUndo.length} item(s) back to pending status? This will undo their approved/rejected decisions.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const index of itemsToUndo) {
      const formGroup = this.details.at(index) as FormGroup;
      const item = this.data[index]; // Use original data instead of form value

      try {
        // Ensure the ID is preserved - get it before patching
        const itemId = formGroup.get('id')?.value || this.data?.[index]?.id;
        
        // Only update the form locally - no API call
        // The actual database update will happen when the main form is submitted
        formGroup.patchValue({
          id: itemId, // Explicitly preserve the ID
          validationStatus: 'pending',
          validationComment: '',
          validatedBy: null,
          validatedAt: null
        });
        
        successCount++;
      } catch (error) {
        console.error('Error resetting item:', item.partNumber, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      this.toastrService.success(`${successCount} item(s) reset to pending status`);
      this.updateValidationProgress();
      this.selectedItemsForReview.clear(); // Clear selection after bulk operation
      
      // Automatically save the changes after bulk undo
      await this.onSubmit();
    }

    if (errorCount > 0) {
      this.toastrService.error(`Failed to reset ${errorCount} item(s)`);
    }
  }

  async bulkApproveItems() {
    const selectedItems = Array.from(this.selectedItemsForReview);
    
    if (selectedItems.length === 0) {
      this.toastrService.warning('No items selected');
      return;
    }

    const confirmMessage = `Are you sure you want to approve ${selectedItems.length} selected item(s)?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const index of selectedItems) {
      const formGroup = this.details.at(index) as FormGroup;
      const item = this.data[index]; // Use original data instead of form value

      try {
        // Ensure the ID is preserved - get it before patching
        const itemId = formGroup.get('id')?.value || this.data?.[index]?.id;
        
        // Only update the form locally - no API call
        // The actual database update will happen when the main form is submitted
        formGroup.patchValue({
          id: itemId, // Explicitly preserve the ID
          validationStatus: 'approved',
          validatedBy: 'current_user',
          validatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
        });
        
        successCount++;
      } catch (error) {
        console.error('Error approving item:', item.partNumber, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      this.toastrService.success(`${successCount} item(s) approved successfully`);
      this.updateValidationProgress();
      this.selectedItemsForReview.clear();
      
      // Automatically save the changes after bulk approval
      await this.onSubmit();
    }

    if (errorCount > 0) {
      this.toastrService.error(`Failed to approve ${errorCount} item(s)`);
    }
  }

  async bulkRejectItems() {
    const selectedItems = Array.from(this.selectedItemsForReview);
    
    if (selectedItems.length === 0) {
      this.toastrService.warning('No items selected');
      return;
    }

    const reason = prompt(`Please provide a reason for rejecting ${selectedItems.length} selected item(s):`);
    
    if (reason === null) {
      return; // User cancelled
    }

    if (!reason.trim()) {
      this.toastrService.warning('A reason is required for rejection');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const index of selectedItems) {
      const formGroup = this.details.at(index) as FormGroup;
      const item = this.data[index]; // Use original data instead of form value

      try {
        // Ensure the ID is preserved - get it before patching
        const itemId = formGroup.get('id')?.value || this.data?.[index]?.id;
        
        // Only update the form locally - no API call
        // The actual database update will happen when the main form is submitted
        formGroup.patchValue({
          id: itemId, // Explicitly preserve the ID
          validationStatus: 'rejected',
          validationComment: reason.trim(),
          validatedBy: 'current_user',
          validatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
        });
        
        successCount++;
      } catch (error) {
        console.error('Error rejecting item:', item.partNumber, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      this.toastrService.success(`${successCount} item(s) rejected successfully`);
      this.updateValidationProgress();
      this.selectedItemsForReview.clear();
      
      // Automatically save the changes after bulk rejection
      await this.onSubmit();
    }

    if (errorCount > 0) {
      this.toastrService.error(`Failed to reject ${errorCount} item(s)`);
    }
  }

  async bulkCommentItems() {
    const selectedItems = Array.from(this.selectedItemsForReview);
    
    if (selectedItems.length === 0) {
      this.toastrService.warning('No items selected');
      return;
    }

    const comment = prompt(`Add a comment to ${selectedItems.length} selected item(s):`);
    
    if (comment === null) {
      return; // User cancelled
    }

    if (!comment.trim()) {
      this.toastrService.warning('Please enter a comment');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const index of selectedItems) {
      const formGroup = this.details.at(index) as FormGroup;
      const item = this.data[index]; // Use original data instead of form value

      try {
        // Ensure the ID is preserved - get it before patching
        const itemId = formGroup.get('id')?.value || this.data?.[index]?.id;
        
        // Only update the form locally - no API call
        // The actual database update will happen when the main form is submitted
        formGroup.patchValue({
          id: itemId, // Explicitly preserve the ID
          validationComment: comment.trim()
        });
        
        successCount++;
      } catch (error) {
        console.error('Error adding comment to item:', item.partNumber, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      this.toastrService.success(`Comment added to ${successCount} item(s) successfully`);
      this.selectedItemsForReview.clear();
      
      // Automatically save the changes after bulk comment addition
      await this.onSubmit();
    }

    if (errorCount > 0) {
      this.toastrService.error(`Failed to add comment to ${errorCount} item(s)`);
    }
  }

  async bulkUpdateAcCode(acCode: string | number) {
    const selectedItems = Array.from(this.selectedItemsForReview);
    
    if (selectedItems.length === 0) {
      this.toastrService.warning('No items selected');
      return;
    }

    const action = acCode ? `set AC Code to "${acCode}"` : 'clear AC Code';
    const confirmMessage = `Are you sure you want to ${action} for ${selectedItems.length} selected item(s)?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const index of selectedItems) {
      const formGroup = this.details.at(index) as FormGroup;
      const item = formGroup.value;

      try {
        // Update AC Code via API (when available) or locally for now
        // await this.validationService.updateItemConfiguration(item.id, { ac_code: acCode }).toPromise();
        
        formGroup.patchValue({
          ac_code: acCode
        });
        
        successCount++;
      } catch (error) {
        console.error('Error updating AC Code for item:', item.partNumber, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      const actionText = acCode ? `AC Code updated to "${acCode}"` : 'AC Code cleared';
      this.toastrService.success(`${actionText} for ${successCount} item(s)`);
      this.selectedItemsForReview.clear();
    }

    if (errorCount > 0) {
      this.toastrService.error(`Failed to update AC Code for ${errorCount} item(s)`);
    }
  }

  async bulkUpdateTrType(trType: string) {
    const selectedItems = Array.from(this.selectedItemsForReview);
    
    if (selectedItems.length === 0) {
      this.toastrService.warning('No items selected');
      return;
    }

    const action = trType ? `set TR Type to "${trType}"` : 'clear TR Type';
    const confirmMessage = `Are you sure you want to ${action} for ${selectedItems.length} selected item(s)?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const index of selectedItems) {
      const formGroup = this.details.at(index) as FormGroup;
      const item = formGroup.value;

      try {
        // Update TR Type via API (when available) or locally for now
        // await this.validationService.updateItemConfiguration(item.id, { trType: trType }).toPromise();
        
        formGroup.patchValue({
          trType: trType
        });
        
        successCount++;
      } catch (error) {
        console.error('Error updating TR Type for item:', item.partNumber, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      const actionText = trType ? `TR Type updated to "${trType}"` : 'TR Type cleared';
      this.toastrService.success(`${actionText} for ${successCount} item(s)`);
      this.selectedItemsForReview.clear();
    }

    if (errorCount > 0) {
      this.toastrService.error(`Failed to update TR Type for ${errorCount} item(s)`);
    }
  }

  // Event handlers for bulk ng-select changes
  onBulkAcCodeChange(selectedItem: any) {
    if (this.hasSelectedItems()) {
      // Extract the ac_code value from the selected object
      const acCode = selectedItem ? selectedItem.ac_code || selectedItem : '';
      this.bulkUpdateAcCode(acCode);
    } else {
      this.toastrService.warning('Please select items first');
    }
  }

  onBulkTrTypeChange(selectedItem: any) {
    if (this.hasSelectedItems()) {
      // Extract the TrType value from the selected object
      const trType = selectedItem ? selectedItem.TrType || selectedItem : '';
      this.bulkUpdateTrType(trType);
    } else {
      this.toastrService.warning('Please select items first');
    }
  }

  selectAllItems() {
    if (this.data?.length) {
      for (let i = 0; i < this.data.length; i++) {
        this.selectedItemsForReview.add(i);
      }
    }
  }

  deselectAllItems() {
    this.selectedItemsForReview.clear();
  }

  updateValidationProgress() {
    // Check if all parts are processed to enable "Send to Picking" button
    if (this.details?.length) {
      const allProcessed = this.details.controls.every(control => {
        const status = control.get('validationStatus')?.value;
        return status === 'approved' || status === 'rejected';
      });
      // You can use this flag to conditionally enable/disable buttons
    }
  }

  // Helper for progress bar and table
  countByStatus(items: any[], status: string): number {
    if (!Array.isArray(items) || !this.details?.length) return 0;
    
    return this.details.controls.filter(control => {
      const validationStatus = control.get('validationStatus')?.value;
      return validationStatus === status;
    }).length;
  }

  // Helper methods for enhanced header
  getValidationProgress(): number {
    if (!this.details?.length) return 0;
    
    const totalItems = this.details.length;
    const validatedItems = this.countByStatus(null, 'approved') + this.countByStatus(null, 'rejected');
    return Math.round((validatedItems / totalItems) * 100);
  }

  getTotalReviewsCount(): number {
    if (!this.details?.length) return 0;
    
    return this.details.controls.reduce((total, control, index) => {
      const reviewDetails = this.getItemReviewDetails(index);
      return total + (reviewDetails?.length || 0);
    }, 0);
  }

  getItemReviewDetails(index: number): any[] {
    // Add null checks to prevent errors during initialization
    if (!this.details || index < 0 || index >= this.details.length || !this.data || !this.data[index]) {
      return [];
    }

    const formGroup = this.details.at(index) as FormGroup;
    if (!formGroup) {
      return [];
    }

    const itemId = this.data[index].id;
    
    // Try both numeric and string versions to handle any type mismatches
    const numericId = parseInt(itemId?.toString() || '0');
    const reviews = this.reviewData.get(numericId) || this.reviewData.get(itemId) || [];
    
    return reviews;
  }

  getItemReviewCounts(index: number): { pending: number, approved: number, rejected: number, clarification: number, total: number } {
    const reviews = this.getItemReviewDetails(index);
    
    return {
      pending: reviews.filter(r => r.reviewStatus === 'pending_review' || r.reviewStatus === 'assigned').length,
      approved: reviews.filter(r => r.reviewStatus === 'reviewed' && r.reviewDecision === 'approved').length,
      rejected: reviews.filter(r => r.reviewStatus === 'reviewed' && r.reviewDecision === 'rejected').length,
      clarification: reviews.filter(r => r.reviewStatus === 'reviewed' && r.reviewDecision === 'needs_clarification').length,
      total: reviews.length
    };
  }

  hasMultipleReviews(index: number): boolean {
    const reviews = this.getItemReviewDetails(index);
    return reviews.length > 1;
  }

  // Row expansion methods
  toggleRowExpansion(index: number): void {
    if (this.expandedRows.has(index)) {
      this.expandedRows.delete(index);
    } else {
      this.expandedRows.add(index);
    }
  }

  isRowExpanded(index: number): boolean {
    return this.expandedRows.has(index);
  }

  canSendForReview(index: number): boolean {
    // Can send for review if not globally validated yet
    // This allows escalation, second opinions, or clarification at any validation status
    return !this.header?.validated;
  }

  // Review cancellation/deletion methods
  canCancelReview(index: number, reviewId?: number): boolean {
    // Can cancel review if:
    // 1. Not globally validated
    // 2. Review is still pending (not yet completed)
    // 3. User has permission (for now, allow all non-validated requests)
    if (this.header?.validated) {
      return false;
    }

    if (reviewId) {
      // Check specific review
      const reviews = this.getItemReviewDetails(index);
      const review = reviews.find(r => r.id === reviewId);
      return review && (review.reviewStatus === 'pending_review' || review.reviewStatus === 'assigned');
    } else {
      // Check if any pending reviews exist for this item
      const reviews = this.getItemReviewDetails(index);
      return reviews.some(r => r.reviewStatus === 'pending_review' || r.reviewStatus === 'assigned');
    }
  }

  async cancelItemReview(item: any, index: number, reviewId?: number) {
    const reviews = this.getItemReviewDetails(index);
    const pendingReviews = reviews.filter(r => r.reviewStatus === 'pending_review' || r.reviewStatus === 'assigned');
    
    if (pendingReviews.length === 0) {
      this.toastrService.warning('No pending reviews to cancel for this item');
      return;
    }

    let reviewsToCancel = [];
    if (reviewId) {
      // Cancel specific review
      const specificReview = pendingReviews.find(r => r.id === reviewId);
      if (specificReview) {
        reviewsToCancel = [specificReview];
      }
    } else {
      // Cancel all pending reviews for this item
      reviewsToCancel = pendingReviews;
    }

    if (reviewsToCancel.length === 0) {
      this.toastrService.warning('Selected review cannot be cancelled');
      return;
    }

    const confirmMessage = reviewsToCancel.length === 1 
      ? `Are you sure you want to cancel the review assignment for "${item.partNumber}"?`
      : `Are you sure you want to cancel ${reviewsToCancel.length} pending review(s) for "${item.partNumber}"?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Cancel each review
      for (const review of reviewsToCancel) {
        console.log('Cancelling review:', review.id);
        await this.validationService.cancelReview(review.id).toPromise();
        console.log('Review cancelled successfully:', review.id);
        
        // Send cancellation notification to reviewer
        try {
          await this.sendReviewCancellationNotification(review, item);
          console.log('Notification sent for review:', review.id);
        } catch (notificationError) {
          console.warn('Failed to send notification, but continuing:', notificationError);
          // Don't let notification failure break the cancellation
        }
      }

      // Reload review data to get updated status
      try {
        console.log('Reloading review data...');
        await this.loadReviewData();
        console.log('Review data reloaded successfully');
      } catch (loadError) {
        console.warn('Failed to reload review data, but continuing:', loadError);
        // Don't let reload failure break the cancellation success message
      }

      const message = reviewsToCancel.length === 1 
        ? 'Review cancelled successfully'
        : `${reviewsToCancel.length} reviews cancelled successfully`;
      
      this.toastrService.success(message);
      this.updateValidationProgress();
    } catch (error) {
      console.error('Error cancelling review:', error);
      this.toastrService.error('Error cancelling review(s)');
    }
  }

  async bulkCancelReviews() {
    const selectedItems = Array.from(this.selectedItemsForReview);
    
    if (selectedItems.length === 0) {
      this.toastrService.warning('No items selected');
      return;
    }

    // Find items with pending reviews
    const itemsWithPendingReviews = selectedItems.filter(index => this.canCancelReview(index));
    
    if (itemsWithPendingReviews.length === 0) {
      this.toastrService.warning('No pending reviews to cancel for selected items');
      return;
    }

    const confirmMessage = `Are you sure you want to cancel all pending reviews for ${itemsWithPendingReviews.length} selected item(s)? This will notify the assigned reviewers.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    let cancelledReviewsCount = 0;

    for (const index of itemsWithPendingReviews) {
      const formGroup = this.details.at(index) as FormGroup;
      const item = this.data[index];
      
      try {
        const reviews = this.getItemReviewDetails(index);
        const pendingReviews = reviews.filter(r => r.reviewStatus === 'pending_review' || r.reviewStatus === 'assigned');
        
        for (const review of pendingReviews) {
          await this.validationService.cancelReview(review.id).toPromise();
          await this.sendReviewCancellationNotification(review, item);
          cancelledReviewsCount++;
        }
        
        successCount++;
      } catch (error) {
        console.error('Error cancelling reviews for item:', item.partNumber, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      await this.loadReviewData();
      this.toastrService.success(`${cancelledReviewsCount} review(s) cancelled for ${successCount} item(s)`);
      this.updateValidationProgress();
      this.selectedItemsForReview.clear();
    }

    if (errorCount > 0) {
      this.toastrService.error(`Failed to cancel reviews for ${errorCount} item(s)`);
    }
  }

  // Get pending reviews for an item that can be cancelled
  getPendingReviewsForItem(index: number): any[] {
    const reviews = this.getItemReviewDetails(index);
    return reviews.filter(r => 
      r.reviewStatus === 'pending_review' || 
      r.reviewStatus === 'assigned'
    ).map(review => ({
      ...review,
      displayName: `${review.reviewerName || 'Unknown'} (${review.reviewerDepartment || 'Unknown Dept'})`,
      priorityText: review.priority ? review.priority.charAt(0).toUpperCase() + review.priority.slice(1) : 'Normal'
    }));
  }

  // Cancel a specific review by ID
  async cancelSpecificReview(item: any, index: number, reviewId: number, reviewerName?: string) {
    const confirmMessage = `Are you sure you want to cancel the review assignment for "${item.partNumber}" assigned to ${reviewerName || 'this reviewer'}?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await this.validationService.cancelReview(reviewId).toPromise();
      
      // Send cancellation notification
      const reviews = this.getItemReviewDetails(index);
      const cancelledReview = reviews.find(r => r.id === reviewId);
      if (cancelledReview) {
        await this.sendReviewCancellationNotification(cancelledReview, item);
      }

      // Reload review data to get updated status
      await this.loadReviewData();

      this.toastrService.success('Review cancelled successfully');
    } catch (error) {
      console.error('Error cancelling specific review:', error);
      this.toastrService.error('Error cancelling review');
    }
  }

  async sendReviewCancellationNotification(review: any, item: any) {
    try {
      const reviewer = this.availableReviewers.find(r => r.id === review.reviewerId);
      
      if (reviewer && this.emailNotificationService && typeof this.emailNotificationService.create === 'function') {
        const notificationData = {
          to: reviewer.email,
          subject: `Material Request Review Cancelled - ${item.partNumber}`,
          body: `
            The material request review assignment has been cancelled:
            
            Part Number: ${item.partNumber}
            Description: ${item.description}
            Quantity: ${item.qty}
            
            Original Review Note: ${review.reviewNote || 'None'}
            Cancellation Reason: Cancelled by requester
            
            No further action is required for this review.
          `,
          type: 'material_request_review_cancelled',
          entityId: item.id,
          entityType: 'material_request_detail'
        };

        await this.emailNotificationService.create(notificationData);
      }
    } catch (error) {
      console.error('Error sending cancellation notification:', error);
      // Don't fail the whole operation if notification fails
    }
  }

  getReviewButtonTooltip(index: number): string {
    if (this.header?.validated) {
      return 'Cannot send for review - Material request is globally validated';
    }
    
    const reviewStatus = this.getItemReviewStatus(index);
    switch (reviewStatus) {
      case 'pending_review':
        return 'Send for additional review (escalation/second opinion)';
      case 'approved':
        return 'Send for additional review (escalation/second opinion)';
      case 'rejected':
        return 'Send for re-review after addressing concerns';
      case 'needs_clarification':
        return 'Send for additional review';
      case 'none':
        return 'Send for review';
      default:
        return 'Send for review';
    }
  }

  getItemStatus(index: number): string {
    if (!this.details || index < 0 || index >= this.details.length) {
      return 'pending';
    }
    const formGroup = this.details.at(index) as FormGroup;
    return formGroup?.get('validationStatus')?.value || 'pending';
  }

  getItemComment(index: number): string {
    if (!this.details || index < 0 || index >= this.details.length) {
      return '';
    }
    const formGroup = this.details.at(index) as FormGroup;
    return formGroup?.get('validationComment')?.value || '';
  }

  getItemReviewStatus(index: number): string {
    const reviews = this.getItemReviewDetails(index);
    
    if (reviews.length === 0) {
      return 'none';
    }
    
    // Categorize all reviews by their status
    const pendingReviews = reviews.filter(r => 
      r.reviewStatus === 'pending_review' || 
      r.reviewStatus === 'assigned' ||
      (r.reviewStatus === 'reviewed' && (!r.reviewDecision || r.reviewDecision === ''))
    );
    const rejectedReviews = reviews.filter(r => 
      r.reviewStatus === 'reviewed' && r.reviewDecision === 'rejected'
    );
    const needsClarification = reviews.filter(r => 
      r.reviewStatus === 'reviewed' && r.reviewDecision === 'needs_clarification'
    );
    const approvedReviews = reviews.filter(r => 
      r.reviewStatus === 'reviewed' && r.reviewDecision === 'approved'
    );
    
    /* 
    REVISED PRIORITY SYSTEM FOR MULTIPLE REVIEWS:
    
    Key Business Rule: If there are PENDING reviews, they take precedence as they represent
    the current active state that could potentially override previous rejections/clarifications.
    
    This handles scenarios like:
    - Item was rejected, but sent for re-review → Show "Pending Review" 
    - Item needs clarification, but sent for additional review → Show "Pending Review"
    
    1. PENDING_REVIEW - Any pending review indicates active review process (highest priority)
    2. NEEDS_CLARIFICATION - Any review needs clarification (when no pending reviews)
    3. REJECTED - Any review is rejected (when no pending reviews or clarifications)
    4. APPROVED - Only if ALL reviews are approved and none pending
    5. MIXED - Fallback for edge cases
    */
    
    // Priority 1: Any pending review indicates active review process
    if (pendingReviews.length > 0) {
      return 'pending_review';
    }
    
    // Priority 2: Clarification needed (but no pending reviews)
    if (needsClarification.length > 0) {
      return 'needs_clarification';
    }
    
    // Priority 3: Rejected (but no pending reviews or clarifications)
    if (rejectedReviews.length > 0) {
      return 'rejected';
    }
    
    // Priority 4: All reviews are approved
    if (approvedReviews.length === reviews.length && reviews.length > 0) {
      return 'approved';
    }
    
    // Priority 5: Mixed or unknown status (should rarely occur)
    return 'mixed';
  }

  getItemReviewSummary(index: number): string {
    const reviews = this.getItemReviewDetails(index);
    
    if (reviews.length === 0) {
      return 'No reviews assigned';
    }
    
    if (reviews.length === 1) {
      const review = reviews[0];
      const department = review.reviewerDepartment || review.department || 'Unknown Dept';
      const reviewer = review.reviewerName || 'Unknown Reviewer';
      
      if (review.reviewStatus === 'assigned' || review.reviewStatus === 'pending_review') {
        return `Pending review by ${department} (${reviewer})`;
      } else if (review.reviewStatus === 'reviewed') {
        const decision = review.reviewDecision;
        const comment = review.reviewComment ? `: "${review.reviewComment}"` : '';
        return `${decision} by ${department} (${reviewer})${comment}`;
      }
      return `${review.reviewStatus} - ${department} (${reviewer})`;
    }
    
    // Multiple reviews - provide detailed breakdown with new priority system
    const statusGroups = {
      pending: reviews.filter(r => r.reviewStatus === 'pending_review' || r.reviewStatus === 'assigned'),
      approved: reviews.filter(r => r.reviewStatus === 'reviewed' && r.reviewDecision === 'approved'),
      rejected: reviews.filter(r => r.reviewStatus === 'reviewed' && r.reviewDecision === 'rejected'),
      clarification: reviews.filter(r => r.reviewStatus === 'reviewed' && r.reviewDecision === 'needs_clarification')
    };
    
    const summaryParts = [];
    
    // Show most critical status first based on new priority system
    if (statusGroups.pending.length > 0) {
      const departments = statusGroups.pending.map(r => r.reviewerDepartment || r.department || 'Unknown').join(', ');
      summaryParts.push(`🔄 PENDING: ${departments}`);
    }
    
    if (statusGroups.rejected.length > 0) {
      const departments = statusGroups.rejected.map(r => r.reviewerDepartment || r.department || 'Unknown').join(', ');
      const status = statusGroups.pending.length > 0 ? 'Previously rejected' : 'REJECTED';
      summaryParts.push(`❌ ${status}: ${departments}`);
    }
    
    if (statusGroups.clarification.length > 0) {
      const departments = statusGroups.clarification.map(r => r.reviewerDepartment || r.department || 'Unknown').join(', ');
      const status = statusGroups.pending.length > 0 ? 'Previously needed clarification' : 'NEEDS CLARIFICATION';
      summaryParts.push(`❓ ${status}: ${departments}`);
    }
    
    if (statusGroups.approved.length > 0) {
      const departments = statusGroups.approved.map(r => r.reviewerDepartment || r.department || 'Unknown').join(', ');
      summaryParts.push(`✅ Approved: ${departments}`);
    }
    
    return summaryParts.join(' | ');
  }

  // Modal methods for editing request
  openEditModal() {
    // Reset modal form state
    this.modalForm = null;
    this.modalFormSubmitted = false;
    
    this.currentModalRef = this.modalService.open(this.editRequestModal, {
      size: 'xl',
      backdrop: 'static',
      keyboard: false,
      centered: true
    });

    this.currentModalRef.result.then(
      (result) => {
        if (result === 'saved') {
          this.toastrService.success('Material request updated successfully');
          this.getData(); // Refresh the validation data
        }
        this.currentModalRef = null;
      },
      (dismissed) => {
        this.currentModalRef = null;
      }
    );
  }

  onModalFormSet(form: any) {
    this.modalForm = form;
    // Pre-populate the form with current data
    if (this.form && form) {
      form.patchValue(this.form.value);
    }
  }

  async onSaveModalRequest() {
    this.modalFormSubmitted = true;
    
    if (!this.modalForm || this.modalForm.invalid) {
      // Extract and display specific field errors
      const errors = this.getAngularFormErrors(this.modalForm);
      let errorMsg = 'Please fill in all required fields.';
      if (errors && errors.length) {
        errorMsg += '\n\nMissing or invalid fields:';
        errorMsg += '\n' + errors.map(e => `• ${e.control}: ${e.error}`).join('\n');
      }
      this.toastrService.error(errorMsg);
      return;
    }

    try {
      const formData = this.modalForm.value;
      // Use the update method instead of create since we're editing
      const result = await this.api.update(this.id, formData);
      this.toastrService.success(result.message || 'Material request updated successfully');
      this.currentModalRef?.close('saved');
    } catch (error) {
      this.toastrService.error('Error updating material request');
      console.error('Error updating request:', error);
    } finally {
      this.modalFormSubmitted = false;
    }
  }

  onCancelModalRequest() {
    this.modalFormSubmitted = false;
    this.modalForm = null;
    this.currentModalRef?.dismiss('cancelled');
  }

  /**
   * Handler for "Update & Send to Picking" button in modal
   * Updates the request and marks it as validated, then triggers picking logic
   */
  async onUpdateAndSendToPicking() {
    this.modalFormSubmitted = true;
    
    if (!this.modalForm || this.modalForm.invalid) {
      // Extract and display specific field errors
      const errors = this.getAngularFormErrors(this.modalForm);
      let errorMsg = 'Please fill in all required fields.';
      if (errors && errors.length) {
        errorMsg += '\n\nMissing or invalid fields:';
        errorMsg += '\n' + errors.map(e => `• ${e.control}: ${e.error}`).join('\n');
      }
      this.toastrService.error(errorMsg);
      this.modalFormSubmitted = false;
      return;
    }

    // Check if ready for picking
    const validationCheck = this.validateBeforeSendingToPicking();
    if (!validationCheck.canSendToPicking) {
      this.toastrService.error(validationCheck.message);
      this.modalFormSubmitted = false;
      return;
    }

    try {
      // Mark as validated and send to picking
      const formData = {
        ...this.modalForm.value,
        main: {
          ...this.modalForm.value.main,
          validated: moment().format('YYYY-MM-DD HH:mm:ss'),
          status: 'Ready for Picking'
        }
      };
      
      const result = await this.api.update(this.id, formData);
      this.toastrService.success(result.message || 'Material request updated and sent to picking');
      this.currentModalRef?.close('saved');
      // Optionally, trigger picking logic here if needed
      // e.g., await this.api.sendToPicking(this.id);
    } catch (error) {
      this.toastrService.error('Error updating and sending to picking');
      console.error('Error updating and sending to picking:', error);
    } finally {
      this.modalFormSubmitted = false;
    }
  }

  /**
   * Extract form validation errors for better user feedback
   */
  private getAngularFormErrors(form: FormGroup): { control: string; error: string }[] {
    const errors: { control: string; error: string }[] = [];
    
    if (!form) return errors;

    const processFormGroup = (formGroup: FormGroup, prefix = '') => {
      Object.keys(formGroup.controls).forEach(key => {
        const control = formGroup.get(key);
        const controlName = prefix ? `${prefix}.${key}` : key;
        
        if (control instanceof FormGroup) {
          processFormGroup(control, controlName);
        } else if (control instanceof FormArray) {
          control.controls.forEach((arrayControl, index) => {
            if (arrayControl instanceof FormGroup) {
              processFormGroup(arrayControl, `${controlName}[${index}]`);
            } else if (arrayControl.invalid && arrayControl.errors) {
              Object.keys(arrayControl.errors).forEach(errorKey => {
                errors.push({
                  control: `${controlName}[${index}]`,
                  error: this.getErrorMessage(errorKey, arrayControl.errors![errorKey])
                });
              });
            }
          });
        } else if (control && control.invalid && control.errors) {
          Object.keys(control.errors).forEach(errorKey => {
            errors.push({
              control: this.formatControlName(controlName),
              error: this.getErrorMessage(errorKey, control.errors![errorKey])
            });
          });
        }
      });
    };

    processFormGroup(form);
    return errors;
  }

  /**
   * Format control name for better readability
   */
  private formatControlName(controlName: string): string {
    return controlName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/\./g, ' > ');
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(errorKey: string, errorValue: any): string {
    switch (errorKey) {
      case 'required':
        return 'This field is required';
      case 'email':
        return 'Please enter a valid email address';
      case 'minlength':
        return `Minimum length is ${errorValue.requiredLength}`;
      case 'maxlength':
        return `Maximum length is ${errorValue.requiredLength}`;
      case 'pattern':
        return 'Please enter a valid format';
      case 'min':
        return `Minimum value is ${errorValue.min}`;
      case 'max':
        return `Maximum value is ${errorValue.max}`;
      default:
        return `Invalid ${errorKey}`;
    }
  }

  /**
   * Submit validated material request to picking queue
   */
  async submitToPicking() {
    // Prevent duplicate submissions
    if (this.isSubmittingToPicking) {
      return;
    }

    try {
      this.isSubmittingToPicking = true;
      await this.onSubmitAndSendToPicking();
    } catch (error) {
      // Error handling is already done in onSubmitAndSendToPicking
      console.error('Error submitting to picking:', error);
    } finally {
      this.isSubmittingToPicking = false;
    }
  }

  /**
   * Preview the picking sheet before submitting
   */
  previewPickingSheet() {
    // Check if the request has valid items to pick
    if (!this.form.value.details?.length) {
      this.toastrService.warning('No items available to preview.');
      return;
    }

    // Navigate to picking preview or open a modal with pick sheet preview
    const approvedItems = this.form.value.details.filter((item: any) => 
      item.validationStatus === 'approved'
    );

    if (approvedItems.length === 0) {
      this.toastrService.warning('No approved items available for picking.');
      return;
    }

    // For now, show a simple preview alert - this could be enhanced to show a modal
    const itemCount = approvedItems.length;
    const totalQty = approvedItems.reduce((sum: number, item: any) => sum + (item.qty || 0), 0);
    
    this.toastrService.info(
      `Pick Sheet Preview: ${itemCount} items, Total Qty: ${totalQty}`,
      'Preview Available',
      { timeOut: 5000 }
    );

    // Optional: Navigate to a dedicated preview page
    // this.router.navigate(['/picking-preview', this.id]);
  }
}
