import { Component, Input, OnInit } from '@angular/core';
import { WorkOrderService } from '@app/core/api/field-service/work-order.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FieldServiceMobileService } from '@app/core/api/field-service/field-service-mobile.service';
import { TripExpenseService } from '@app/core/api/field-service/trip-expense.service';
import moment from 'moment';
import { TripExpenseTransactionsService } from '@app/core/api/field-service/trip-expense-transactions';
import { timeConvert, calculateSummaryLabor } from '@app/pages/field-service/shared/field-service-helpers.service';
import { SharedModule } from '@app/shared/shared.module';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';

@Injectable({
  providedIn: 'root'
})
export class WorkOrderSummaryService {
  constructor(
    public modalService: NgbModal
  ) { }

  open(workOrderId: any) {
    const modalRef = this.modalService.open(WorkOrderSummaryComponent, { size: 'md', fullscreen: false });
    modalRef.componentInstance.workOrderId = workOrderId;
    return modalRef;
  }

}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-work-order-summary',
  templateUrl: './work-order-summary.component.html',
})
export class WorkOrderSummaryComponent implements OnInit {
  @Input() public workOrderId: any;
  eventInfo: Object;

  timeConvert = timeConvert;

  // Enhanced properties for better UX
  isSubmitting = false;
  submissionProgress = 0;
  validationErrors: string[] = [];

  constructor(
    private ngbActiveModal: NgbActiveModal,
    private api: WorkOrderService,
    private fieldServiceMobileService: FieldServiceMobileService,
    public tripExpenseService: TripExpenseService,
    public tripExpenseTransactionsService: TripExpenseTransactionsService
  ) {}

  close() {
  }

  dismiss() {
    this.ngbActiveModal.dismiss()
  }

  ngOnInit(): void {
    this.getEventDetails()
    this.getTripExpense()
    this.getAllTransactionAssignedToFsId()
  }


  _travelAndWorkTotalHrs = 0;
  async getEventDetails() {
    this.eventInfo = await this.fieldServiceMobileService.getEventByWorkOrderId(this.workOrderId);
    this._travelAndWorkTotalHrs = calculateSummaryLabor(this.eventInfo);
  }

  tripExpenseTotal = 0;
  async getTripExpense() {
    let data: any = await this.tripExpenseService.getByWorkOrderId(this.workOrderId)

    this.tripExpenseTotal = 0;
    for (let i = 0; i < data?.length; i++) {
      this.tripExpenseTotal += data[i].cost
    }

  }

  get disableButton() {
    return this.totalBankTransactins != this.assignedTotalBankTransactions
  }

  transactions = []
  totalBankTransactins = 0
  assignedTotalBankTransactions = 0
  async getAllTransactionAssignedToFsId() {
    this.transactions = []
    this.totalBankTransactins = 0
    this.assignedTotalBankTransactions = 0

    let workOrderInfo: any = await this.api.getById(this.workOrderId);
    let transactions: any = await this.tripExpenseTransactionsService.getByFsId(workOrderInfo.fs_scheduler_id, this.workOrderId);

    for (let i = 0; i < transactions.length; i++) {
      this.totalBankTransactins++;
      if (transactions[i].work_order_transaction_id !== null) {
        this.assignedTotalBankTransactions++
      }
      if (transactions[i].work_order_transaction_id == null) {
        this.transactions.push(transactions[i])
      }
    }
  }

  async onSubmit() {
    if (this.disableButton) {
      const remaining = this.totalBankTransactins - this.assignedTotalBankTransactions;
      
      const { value: accept } = await SweetAlert.confirm({
        allowOutsideClick: false,
        title: 'Incomplete Requirements',
        html: `
          <div class="text-start">
            <div class="alert alert-warning mb-3">
              <i class="ri-error-warning-line me-2"></i>
              <strong>Missing ${remaining} credit card transaction receipt(s)</strong>
            </div>
            <p class="mb-3">You have unassigned credit card transactions. This may cause:</p>
            <ul class="text-muted small mb-3">
              <li>Delays in expense reimbursement</li>
              <li>Compliance issues with accounting</li>
              <li>Additional follow-up requests</li>
            </ul>
            <p class="mb-0"><strong>Do you wish to proceed anyway?</strong></p>
          </div>
        `,
        showCloseButton: true,
        showCancelButton: true,
        focusConfirm: false,
        confirmButtonText: '<i class="ri-arrow-right-line me-1"></i>Proceed Anyway',
        confirmButtonColor: '#f59e0b',
        cancelButtonText: '<i class="ri-arrow-left-line me-1"></i>Go Back & Fix',
        cancelButtonColor: '#6b7280',
        reverseButtons: true,
        customClass: {
          popup: 'swal2-modern',
          confirmButton: 'btn btn-warning',
          cancelButton: 'btn btn-outline-secondary'
        }
      });
      
      if (!accept) return;
    }

    try {
      this.isSubmitting = true;
      
      // Enhanced loading with progress simulation
      SweetAlert.fire({
        title: 'Submitting Work Order',
        html: `
          <div class="text-center">
            <div class="spinner-border text-primary mb-3" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mb-2">Processing your submission...</p>
            <div class="progress" style="height: 6px;">
              <div class="progress-bar progress-bar-striped progress-bar-animated" 
                   style="width: 0%" id="submission-progress"></div>
            </div>
            <small class="text-muted mt-2 d-block">Please do not close this window</small>
          </div>
        `,
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          // Simulate progress for better UX
          let progress = 0;
          const interval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress > 90) progress = 90;
            const progressBar = document.getElementById('submission-progress');
            if (progressBar) {
              progressBar.style.width = `${progress}%`;
            }
          }, 200);
          
          // Clear interval after a reasonable time
          setTimeout(() => clearInterval(interval), 3000);
        }
      });

      await this.api.updateById(this.workOrderId, { 
        dateSubmitted: moment().format('YYYY-MM-DD HH:mm:ss'),
        submissionStatus: 'completed',
        submittedBy: 'current_user' // Replace with actual user
      });

      // Complete the progress bar
      const progressBar = document.getElementById('submission-progress');
      if (progressBar) {
        progressBar.style.width = '100%';
      }

      await SweetAlert.fire({
        icon: 'success',
        title: 'Work Order Submitted Successfully!',
        html: `
          <div class="text-center">
            <div class="mb-3">
              <i class="ri-check-circle-fill text-success" style="font-size: 3rem;"></i>
            </div>
            <p class="mb-3">Your work order has been successfully submitted and is now under review.</p>
            <div class="alert alert-info border-0 mb-3">
              <small>
                <i class="ri-information-line me-1"></i>
                You will receive a confirmation email shortly with submission details.
              </small>
            </div>
          </div>
        `,
        allowOutsideClick: false,
        showCloseButton: false,
        showCancelButton: false,
        focusConfirm: true,
        confirmButtonText: '<i class="ri-home-line me-1"></i>Return to Dashboard',
        confirmButtonColor: '#059669',
        customClass: {
          popup: 'swal2-modern',
          confirmButton: 'btn btn-success'
        }
      });

      // Enhanced navigation - could redirect to a status page
      window.location.reload();

    } catch (err) {
      this.isSubmitting = false;
      
      SweetAlert.fire({
        icon: 'error',
        title: 'Submission Failed',
        html: `
          <div class="text-start">
            <p class="mb-3">We encountered an error while submitting your work order:</p>
            <div class="alert alert-danger border-0 mb-3">
              <small class="font-monospace">${err.message || 'Unknown error occurred'}</small>
            </div>
            <p class="mb-0 small text-muted">Please try again or contact support if the problem persists.</p>
          </div>
        `,
        confirmButtonText: '<i class="ri-refresh-line me-1"></i>Try Again',
        confirmButtonColor: '#dc2626',
        showCancelButton: true,
        cancelButtonText: 'Cancel',
        customClass: {
          popup: 'swal2-modern'
        }
      });
    }
  }

  // Enhanced validation method
  validateSubmission(): string[] {
    const errors: string[] = [];
    
    if (this._travelAndWorkTotalHrs <= 0) {
      errors.push('No work hours recorded');
    }
    
    if (this.disableButton) {
      errors.push(`${this.totalBankTransactins - this.assignedTotalBankTransactions} credit card transactions missing receipts`);
    }
    
    return errors;
  }

  // Quick action methods for better productivity
  uploadReceipts() {
    // Navigate to receipt upload
    console.log('Navigate to receipt upload');
  }

  reviewTransactions() {
    // Navigate to transaction review
    console.log('Navigate to transaction review');
  }

}
