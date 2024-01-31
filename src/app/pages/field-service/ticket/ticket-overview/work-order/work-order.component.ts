import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { WorkOrderService } from '@app/core/api/field-service/work-order.service';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { FieldServiceMobileService } from '@app/core/api/field-service/field-service-mobile.service';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { SignatureService } from '../signature/signature.component';
import { WorkOrderSummaryService } from '../work-order-summary/work-order-summary.component';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';
import { SharedModule } from '@app/shared/shared.module';

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
  ) {
  }

  ngOnInit(): void {
  }

  data: any = [];

  isLoading = false;
  async getData() {
    this.data = {}
    try {
      this.isLoading = true;
      this.data = await this.api.getById(this.workOrderId);

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

  async getEventDetails() {
    return await this.fieldServiceMobileService.getEventByWorkOrderId(this.workOrderId);
  }

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

  async submit() {

    if (this.data.dateSubmitted) {
      alert(`This ticket was already submitted on ${this.data.dateSubmitted}.`);
      return
    }

    let errors: any = await this.validateValues();

    if (errors.length > 0) {
      var info = errors;
      var list = '<ol style="text-align:left">'
      for (var i = 0; i < info.length; i++) {
        list += '<li style="font-size:14px">' + info[i].error + '</li>';
      }
      list += '</ol>';

      SweetAlert.fire({
        title: '<strong><p class="text-danger">Please fix below errors</p></strong>',
        html: list,
        focusConfirm: false,
        confirmButtonText: `Ok`,
        confirmButtonColor: '#3085d6',
      })
      return;
    }

    const modalRef = this.workOrderSummaryService.open(this.workOrderId);

    modalRef.result.then(async (result: any) => {

      this.data.submitted = 1;

      try {
        SweetAlert.loading()
        await this.api.updateById(this.workOrderId, this.data)

        SweetAlert.fire({
          title: 'Ticket successfully submitted. Thank you ',
          icon: 'success',
          focusConfirm: false,
          confirmButtonText: `Ok`,
          confirmButtonColor: '#3085d6',
        })
        this.getData();
        SweetAlert.close(500)
      } catch (err) {
        SweetAlert.close(0)
      }

    }, () => { });

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
