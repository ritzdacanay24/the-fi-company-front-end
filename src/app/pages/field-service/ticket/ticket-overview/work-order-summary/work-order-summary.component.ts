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

  constructor(
    private ngbActiveModal: NgbActiveModal,
    private api: WorkOrderService,
    private fieldServiceMobileService: FieldServiceMobileService,
    public tripExpenseService: TripExpenseService,
    public tripExpenseTransactionsService: TripExpenseTransactionsService
  ) {
  }

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
      let reamining = this.totalBankTransactins - this.assignedTotalBankTransactions
      const { value: accept } = await SweetAlert.confirm({
        allowOutsideClick: false,
        title: 'Warning',
        text: `You have ${reamining} credit card transactions not assigned. You wish to continue? `,
        showCloseButton: false,
        showCancelButton: true,
        focusConfirm: false,
        confirmButtonText: 'Proceed',
        confirmButtonColor: 'green',
        cancelButtonText: 'Cancel',
        reverseButtons: true
      });
      if (!accept) return;
    }

    try {
      SweetAlert.loading('Submitting job. Please wait.')
      await this.api.updateById(this.workOrderId, { dateSubmitted: moment().format('YYYY-MM-DD HH:mm:ss') });

      await SweetAlert.fire({
        title: 'Success',
        text: 'Successfully submitted.',
        allowOutsideClick: false,
        showCloseButton: false,
        showCancelButton: false,
        focusConfirm: false,
        confirmButtonText: 'close',
        confirmButtonColor: 'green',
        reverseButtons: true
      })

      window.location.reload()

    } catch (err) {
      SweetAlert.close(0)
    }

  }

}
