import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { WorkOrderService } from '@app/core/api/field-service/work-order.service';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { FieldServiceMobileService } from '@app/core/api/field-service/field-service-mobile.service';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { SignatureService } from '../signature/signature.component';
import { WorkOrderSummaryService } from '../work-order-summary/work-order-summary.component';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';
import { SharedModule } from '@app/shared/shared.module';
import { TeamsService } from '@app/core/api/field-service/teams.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import moment from 'moment';
import { TripExpenseService } from '@app/core/api/field-service/trip-expense.service';
import { TripExpenseTransactionsService } from '@app/core/api/field-service/trip-expense-transactions';
import { timeConvert, calculateSummaryLabor } from '@app/pages/field-service/shared/field-service-helpers.service';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    LazyLoadImageModule
  ],
  selector: 'app-work-order',
  templateUrl: `./work-order.component.html`,
})

export class WorkOrderComponent implements OnInit {
  @Input() public workOrderId: number
  @Input() public disabled: boolean = true;
  closeResult = '';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['workOrderId']) {
      this.workOrderId = changes['workOrderId'].currentValue
      this.getData();
    }
  }

  loading = false;

  goToBottom() {
    setTimeout(function () {
      window.scrollTo(0, document.body.scrollHeight);
    }, 500);
  }

  constructor(
    private api: WorkOrderService,
    public offcanvasService: NgbOffcanvas,
    private signatureService: SignatureService,
    private fieldServiceMobileService: FieldServiceMobileService,
    private workOrderSummaryService: WorkOrderSummaryService,
    private teamsService: TeamsService,
    public authenticationService: AuthenticationService,
    private tripExpenseService: TripExpenseService,
    private tripExpenseTransactionsService: TripExpenseTransactionsService
  ) {
  }

  teamsData: any = []
  async getTeams(id) {
    this.teamsData = await this.teamsService.getByFsId(id);
  }


  data: any = [];

  isLoading = false;
  async getData() {
    this.data = {}
    try {
      this.isLoading = true;
      this.data = await this.api.getById(this.workOrderId);

      await this.getTeams(this.data?.fs_scheduler_id)

      if (this.data.partLocation == "") {
        this.data.partLocation == "N/A"
      }
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  async update() {
    await this.api.updateById(this.workOrderId, this.data)
  }

  isEmptyOrNull(value) {
    return !value || value == ''
  }

  // async getEventDetails() {
  //   return await this.fieldServiceMobileService.getEventByWorkOrderId(this.workOrderId);
  // }

  async validateValues() {
    let errors = [];

    let orderInfo = this.data;

    let workInfo: any = await this.getEventDetails();

    //check errors
    if (this.isEmptyOrNull(orderInfo.technicianSignatureImage)) {
      errors.push({ 'error': 'Tech Signature required.' })
    }
    if (this.isEmptyOrNull(orderInfo.customerSignatureImage)) {
      errors.push({ 'error': 'Customer Signature required.' })
    }

    if (orderInfo.customerName1 == null || orderInfo.customerName1 == "") {
      errors.push({ 'error': 'Customer name is required' })
    }

    //START: Validate only if work is completed
    if (orderInfo.workCompleted == 'Yes') {
    } else {
      if (this.isEmptyOrNull(orderInfo.workCompletedComment)) {
        errors.push({ 'error': 'Since this work order was not completed, please explain why.' })
      }
    }

    if (!orderInfo.partLocation) {
      errors.push({ 'error': 'Part location is requied' })
    }

    if (orderInfo.partLocation == "Eye-Fi") {
      if (this.isEmptyOrNull(orderInfo.partReceivedBySignature)) {
        errors.push({ 'error': 'Part received by employee signature is required' })
      }
      if (this.isEmptyOrNull(orderInfo.partReceivedByName)) {
        errors.push({ 'error': 'Part received by name is required' })
      }
    }

    return errors;
  }

  async onClearSubmissionDate() {

    this.data.dateSubmitted = null
    this.data.submitted = null;

    try {
      SweetAlert.loading()
      await this.api.updateById(this.workOrderId, this.data)
      this.getData();
      SweetAlert.close(500)
    } catch (err) {
      SweetAlert.close(0)
    }

  }

  async ticketVerified(row) {
    //not needed for desktop view
    // if (this.authenticationService.currentUserValue.id !== row.user_id) {
    //   alert('You are not ' + row.user)
    //   return;
    // }

    if (row.ticket_verified) {
      alert('This was already verified on ' + row.ticket_verified)
      return;
    }

    if (!confirm('Please ensure this ticket is error free and event times are 100% correct. You will be held responsible for any incorrect information. Press ok to continue.')) return;

    try {
      row.ticket_verified = moment().format('YYYY-MM-DD HH:mm:ss')
      await this.teamsService.updateById(row.id, {
        ticket_verified: row.ticket_verified
      });
    } catch (err) {

    }

  }

  // Summary properties from work-order-summary
  _travelAndWorkTotalHrs = 0;
  tripExpenseTotal = 0;
  totalBankTransactins = 0;
  assignedTotalBankTransactions = 0;
  timeConvert = timeConvert;

  async ngOnInit() {
    await this.getSummaryData();
  }

  async getSummaryData() {
    await Promise.all([
      this.getEventDetails(),
      this.getTripExpense(),
      this.getAllTransactionAssignedToFsId()
    ]);
  }

  async getEventDetails() {
    try {
      const eventInfo = await this.fieldServiceMobileService.getEventByWorkOrderId(this.workOrderId);
      this._travelAndWorkTotalHrs = calculateSummaryLabor(eventInfo);
    } catch (error) {
      console.error('Error loading event details:', error);
    }
  }

  async getTripExpense() {
    try {
      const data: any = await this.tripExpenseService.getByWorkOrderId(this.workOrderId);
      this.tripExpenseTotal = 0;
      for (let i = 0; i < data?.length; i++) {
        this.tripExpenseTotal += data[i].cost;
      }
    } catch (error) {
      console.error('Error loading trip expenses:', error);
    }
  }

  async getAllTransactionAssignedToFsId() {
    try {
      this.totalBankTransactins = 0;
      this.assignedTotalBankTransactions = 0;

      const workOrderInfo: any = await this.api.getById(this.workOrderId);
      const transactions: any = await this.tripExpenseTransactionsService.getByFsId(
        workOrderInfo.fs_scheduler_id, 
        this.workOrderId
      );

      for (let i = 0; i < transactions.length; i++) {
        this.totalBankTransactins++;
        if (transactions[i].work_order_transaction_id !== null) {
          this.assignedTotalBankTransactions++;
        }
      }
    } catch (error) {
      console.error('Error loading bank transactions:', error);
    }
  }

  get disableButton() {
    return this.totalBankTransactins != this.assignedTotalBankTransactions;
  }

  async submit() {
    if (this.disableButton) {
      const remaining = this.totalBankTransactins - this.assignedTotalBankTransactions;
      const { value: accept } = await SweetAlert.confirm({
        allowOutsideClick: false,
        title: 'Warning',
        text: `You have ${remaining} credit card transaction(s) not assigned. Do you wish to continue?`,
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
      SweetAlert.loading('Submitting job. Please wait.');
      await this.api.updateById(this.workOrderId, { 
        dateSubmitted: moment().format('YYYY-MM-DD HH:mm:ss') 
      });

      await SweetAlert.fire({
        title: 'Success',
        text: 'Job submitted successfully.',
        allowOutsideClick: false,
        showCloseButton: false,
        showCancelButton: false,
        focusConfirm: false,
        confirmButtonText: 'Close',
        confirmButtonColor: 'green',
        reverseButtons: true
      });

      window.location.reload();

    } catch (err) {
      SweetAlert.close(0);
      console.error('Error submitting job:', err);
    }
  }

  // Enhanced validation that includes credit card transactions
  getValidationStatus() {
    const missingFields = [];
    let isValid = true;

    // Check work completion
    if (!this.data?.workCompleted) {
      missingFields.push('Work Completion Status');
      isValid = false;
    }

    // If work not completed, require explanation
    if (this.data?.workCompleted === 'No' && !this.data?.workCompletedComment?.trim()) {
      missingFields.push('Work Completion Explanation');
      isValid = false;
    }

    // Check customer information
    if (!this.data?.customerName1?.trim()) {
      missingFields.push('Customer Name');
      isValid = false;
    }

    if (!String(this.data?.phone || '').trim()) {
      missingFields.push('Customer Phone');
      isValid = false;
    }

    // Check signatures
    if (!this.data?.customerSignatureImage) {
      missingFields.push('Customer Signature');
      isValid = false;
    }

    if (!this.data?.technicianSignatureImage) {
      missingFields.push('Technician Signature');
      isValid = false;
    }

    // Check parts information if Eye-Fi selected
    if (this.data?.partLocation === 'Eye-Fi') {
      if (!this.data?.partReceivedByName?.trim()) {
        missingFields.push('Receiving Employee Name');
        isValid = false;
      }
      if (!this.data?.partReceivedBySignature) {
        missingFields.push('Employee Signature');
        isValid = false;
      }
    }

    // Check team verification
    const unverifiedMembers = this.teamsData?.filter(member => !member.ticket_verified) || [];
    if (unverifiedMembers.length > 0) {
      missingFields.push(`Team Verification (${unverifiedMembers.length} pending)`);
      isValid = false;
    }

    return {
      isValid,
      missingFields,
      completionPercentage: Math.round(((8 - missingFields.length) / 8) * 100),
      hasUnassignedTransactions: this.disableButton
    };
  }

  openSignature() {
    if (this.data.dateSubmitted) return;

    const modalRef = this.signatureService.open(this.data, 'Customer Signature', 'customerSignatureImage')
    modalRef.result.then((result: any) => {
      this.data = result;
    }, () => { });
  }


  openTechSignature() {
    if (this.data.dateSubmitted) return;

    const modalRef = this.signatureService.open(this.data, 'Tech Signature', 'technicianSignatureImage')
    modalRef.result.then((result: any) => {
      this.data = result;
    }, () => { });
  }

  openRecSignature() {
    if (this.data.dateSubmitted) return;

    const modalRef = this.signatureService.open(this.data, 'Receiving Signature', 'partReceivedBySignature')
    modalRef.result.then((result: any) => {
      this.data = result;
    }, () => { });
  }
}
