
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { MaterialRequestService } from '@app/core/api/operations/material-request/material-request.service';
import { MaterialRequestDetailService } from '@app/core/api/operations/material-request/material-request-detail.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { NewUserService } from '@app/core/api/users/users.service';
import moment from 'moment';


@Component({
    standalone: true,
    imports: [SharedModule],
    selector: 'app-material-request-validation-improved',
    templateUrl: './material-request-validation-improved.component.html',
    styleUrls: ['./material-request-validation-improved.component.scss']
})
export class MaterialRequestValidationImprovedComponent implements OnInit {
    // ...existing code...

    // New fields for multi-department workflow
    currentReviewer: any = null; // user or department object
    reviewNotes: string = '';
    workflowStatus: string = 'pending-admin-validation'; // or 'pending-department-review', 'denied', 'approved'

    // UI state for send-to-reviewer dialog
    showSendToReviewer: boolean = false;
    reviewerId: number | null = null;
    reviewerNotes: string = '';
    reviewerList: any[] = [];

    // Send to a specific reviewer (user) for review
    async sendToReviewer(reviewerId: number, notes: string) {
        try {
            this.isLoading = true;
            const updateData = {
                id: this.requestId,
                main: {
                    status: 'pending-department-review',
                    currentReviewer: reviewerId,
                    reviewNotes: notes
                }
            };
            await this.api.update(this.requestId, updateData);
            this.toastr.success('Sent to reviewer for validation');
            // Reset reviewer selection
            this.reviewerId = null;
            this.reviewerNotes = '';
            this.showSendToReviewer = false;
            this.goBack();
        } catch (error) {
            this.toastr.error('Error sending to reviewer');
            console.error(error);
        } finally {
            this.isLoading = false;
        }
    }

    // Handler for send button to prevent sending to self
    onSendReviewerClick() {
        if (this.reviewerId === this.authService.currentUserValue?.id) {
            this.toastr.error('You cannot send the request to yourself.');
            return;
        }
        this.sendToReviewer(this.reviewerId!, this.reviewerNotes);
    }

    // Reviewer submits notes and returns to admin
    async reviewerSubmitNotes(notes: string) {
        try {
            this.isLoading = true;
            const updateData = {
                id: this.requestId,
                main: {
                    status: 'pending-admin-validation',
                    reviewNotes: notes,
                    currentReviewer: null // clear reviewer assignment
                }
            };
            await this.api.update(this.requestId, updateData);
            this.toastr.success('Notes submitted, returned to admin');
            // Optionally clear reviewer notes field
            this.reviewerNotes = '';
            // Reload request data to update UI
            await this.loadRequestData();
        } catch (error) {
            this.toastr.error('Error submitting notes');
            console.error(error);
        } finally {
            this.isLoading = false;
        }
    }

    // Admin finalizes: approve/send to picking, send back for review, or deny
    async adminFinalize(action: 'approve' | 'review' | 'deny', notes: string) {
        try {
            this.isLoading = true;
            let main: any = {
                adminNotes: notes,
                validatedBy: this.authService.currentUserValue.id,
                validated: moment().format('YYYY-MM-DD HH:mm:ss')
            };
            if (action === 'approve') {
                main.status = 'approved';
            } else if (action === 'review') {
                main.status = 'pending-department-review';
            } else if (action === 'deny') {
                main.status = 'denied';
                main.rejectedBy = this.authService.currentUserValue.id;
                main.rejectedDate = moment().format('YYYY-MM-DD HH:mm:ss');
            }
            const updateData = {
                id: this.requestId,
                main,
                details: this.items.value
            };
            await this.api.update(this.requestId, updateData);
            if (action === 'approve') {
                this.toastr.success('Request approved and sent to picking');
            } else if (action === 'review') {
                this.toastr.success('Sent back for further review');
            } else if (action === 'deny') {
                this.toastr.success('Request denied');
            }
            this.goBack();
        } catch (error) {
            this.toastr.error('Error finalizing request');
            console.error(error);
        } finally {
            this.isLoading = false;
        }
    }

    getRejectedCount(): number {
        return this.items.controls.filter(item => item.get('status')?.value === 'rejected').length;
    }
    getNeedsReviewCount(): number {
        return this.items.controls.filter(item => item.get('status')?.value === 'needs-review').length;
    }

    requestId: number;
    validationForm: FormGroup;
    requestData: any;
    isLoading = false;
    submitted = false;

    // Validation states
    validationStatus = {
        itemsValidated: 0,
        totalItems: 0,
        hasErrors: false,
        isComplete: false
    };

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private api: MaterialRequestService,
        private materialRequestDetailService: MaterialRequestDetailService,
        public authService: AuthenticationService,
        private toastr: ToastrService,
        private userService: NewUserService
    ) {
        this.initializeForm();
    }

    ngOnInit(): void {
        this.route.queryParams.subscribe(params => {
            this.requestId = params['id'];
            if (this.requestId) {
                this.loadRequestData();
            }
        });
        this.loadReviewerList();
    }

    async loadReviewerList() {
        try {
            this.reviewerList = await this.userService.getAll();
        } catch (err) {
            this.reviewerList = [];
        }
    }

    initializeForm() {
        this.validationForm = this.fb.group({
            adminNotes: [''],
            validatedBy: [this.authService.currentUserValue?.id],
            validatedDate: [moment().format('YYYY-MM-DD HH:mm:ss')],
            items: this.fb.array([])
        });
    }

    async loadRequestData() {
        try {
            this.isLoading = true;

            // Load main request data
            this.requestData = await this.api.getById(this.requestId);

            // Fetch all requested parts (details) using the detail service, as in the legacy component
            const details = await this.materialRequestDetailService.find({ mrf_id: this.requestId });
            if (details && Array.isArray(details)) {
                this.requestData.details = details;
            } else {
                this.requestData.details = [];
            }

            // Debug: log loaded details
            // console.log('Loaded details:', this.requestData.details);

            // Initialize form with request data and details
            this.setupValidationForm();

        } catch (error) {
            this.toastr.error('Error loading request data');
            console.error(error);
        } finally {
            this.isLoading = false;
        }
    }

    setupValidationForm() {
        const itemsArray = this.validationForm.get('items') as FormArray;

        // Clear existing items
        while (itemsArray.length !== 0) {
            itemsArray.removeAt(0);
        }

        // Add items from request data
        if (this.requestData.details) {
            this.requestData.details.forEach((item: any) => {
                const itemGroup = this.fb.group({
                    id: [item.id],
                    partNumber: [item.partNumber, Validators.required],
                    description: [item.description || ''],
                    requestedQty: [item.qty, [Validators.required, Validators.min(1)]],
                    availableQty: [item.availableQty || 0],
                    approvedQty: [item.qty, [Validators.required, Validators.min(0)]],
                    reasonCode: [item.reasonCode, Validators.required],
                    transactionType: [item.trType || ''],
                    accountCode: [item.ac_code || ''],
                    notes: [item.notes || ''],
                    status: ['pending'], // pending, approved, rejected, needs-review
                    validationNotes: ['']
                });

                itemsArray.push(itemGroup);
            });
        }

        this.updateValidationStatus();
    }

    get items() {
        return this.validationForm.get('items') as FormArray;
    }

    // Validation actions for individual items
    approveItem(index: number) {
        const item = this.items.at(index);
        item.patchValue({
            status: 'approved',
            approvedQty: item.get('requestedQty')?.value
        });
        this.updateValidationStatus();
    }

    rejectItem(index: number) {
        const item = this.items.at(index);
        item.patchValue({
            status: 'rejected',
            approvedQty: 0
        });
        this.updateValidationStatus();
    }

    approveWithChanges(index: number) {
        const item = this.items.at(index);
        item.patchValue({
            status: 'approved'
        });
        this.updateValidationStatus();
    }

    flagForReview(index: number) {
        const item = this.items.at(index);
        item.patchValue({
            status: 'needs-review'
        });
        this.updateValidationStatus();
    }

    // Bulk actions
    approveAllItems() {
        this.items.controls.forEach((item, index) => {
            this.approveItem(index);
        });
    }

    updateValidationStatus() {
        const totalItems = this.items.length;
        const validatedItems = this.items.controls.filter(item =>
            item.get('status')?.value !== 'pending'
        ).length;

        const hasErrors = this.items.controls.some(item =>
            item.get('status')?.value === 'rejected' ||
            item.get('status')?.value === 'needs-review'
        );

        const isComplete = validatedItems === totalItems;

        this.validationStatus = {
            itemsValidated: validatedItems,
            totalItems: totalItems,
            hasErrors: hasErrors,
            isComplete: isComplete
        };
    }

    getItemStatusClass(status: string): string {
        const statusClasses = {
            'pending': 'bg-secondary',
            'approved': 'bg-success',
            'rejected': 'bg-danger',
            'needs-review': 'bg-warning'
        };
        return statusClasses[status] || 'bg-secondary';
    }

    getItemStatusIcon(status: string): string {
        const statusIcons = {
            'pending': 'ri-time-line',
            'approved': 'ri-checkbox-circle-line',
            'rejected': 'ri-close-circle-line',
            'needs-review': 'ri-error-warning-line'
        };
        return statusIcons[status] || 'ri-time-line';
    }

    async saveValidation() {
        if (!this.validateForm()) {
            return;
        }

        try {
            this.isLoading = true;

            const validationData = {
                id: this.requestId,
                main: {
                    validated: moment().format('YYYY-MM-DD HH:mm:ss'),
                    validatedBy: this.authService.currentUserValue.id,
                    adminNotes: this.validationForm.get('adminNotes')?.value
                },
                details: this.items.value
            };

            await this.api.update(this.requestId, validationData);

            this.toastr.success('Validation saved successfully');

        } catch (error) {
            this.toastr.error('Error saving validation');
            console.error(error);
        } finally {
            this.isLoading = false;
        }
    }

    async approveAndSendToPicking() {
        if (!this.validateForm()) {
            return;
        }

        // Check if all items are approved
        const allApproved = this.items.controls.every(item =>
            item.get('status')?.value === 'approved'
        );

        if (!allApproved) {
            this.toastr.error('All items must be approved before sending to picking');
            return;
        }

        try {
            this.isLoading = true;

            const validationData = {
                id: this.requestId,
                main: {
                    validated: moment().format('YYYY-MM-DD HH:mm:ss'),
                    validatedBy: this.authService.currentUserValue.id,
                    status: 'approved',
                    adminNotes: this.validationForm.get('adminNotes')?.value
                },
                details: this.items.value
            };

            await this.api.update(this.requestId, validationData);

            this.toastr.success('Request approved and sent to picking');
            this.goBack();

        } catch (error) {
            this.toastr.error('Error approving request');
            console.error(error);
        } finally {
            this.isLoading = false;
        }
    }

    async rejectRequest() {
        if (!this.validationForm.get('adminNotes')?.value) {
            this.toastr.error('Admin notes are required when rejecting a request');
            return;
        }

        try {
            this.isLoading = true;

            const rejectionData = {
                id: this.requestId,
                main: {
                    status: 'rejected',
                    rejectedBy: this.authService.currentUserValue.id,
                    rejectedDate: moment().format('YYYY-MM-DD HH:mm:ss'),
                    adminNotes: this.validationForm.get('adminNotes')?.value
                }
            };

            await this.api.update(this.requestId, rejectionData);

            this.toastr.success('Request rejected');
            this.goBack();

        } catch (error) {
            this.toastr.error('Error rejecting request');
            console.error(error);
        } finally {
            this.isLoading = false;
        }
    }

    validateForm(): boolean {
        this.submitted = true;

        if (this.validationForm.invalid) {
            this.toastr.error('Please fix validation errors');
            return false;
        }

        return true;
    }

    goBack() {
        this.router.navigate(['/dashboard/operations/material-request/validate-list']);
    }

    getProgressPercentage(): number {
        if (this.validationStatus.totalItems === 0) return 0;
        return (this.validationStatus.itemsValidated / this.validationStatus.totalItems) * 100;
    }

    getApprovedCount(): number {
        return this.items.controls.filter(item => item.get('status')?.value === 'approved').length;
    }
}
