import { SharedModule } from '@app/shared/shared.module';
import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { SweetAlert } from '@app/shared/services/sweet-alert.service';
import { getFormValidationErrors } from '@app/shared/util/form-helpers';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { NgSelectConfig, NgSelectModule } from '@ng-select/ng-select';
import { AgGridModule } from 'ag-grid-angular';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { NgxMaskModule } from 'ngx-mask';
import { SchedulerService } from '@app/core/api/field-service/scheduler.service';

export interface IEmmiter { }
export interface IForm { }

@Component({
  standalone: true,
  imports: [
    SharedModule,
    NgSelectModule,
    BsDatepickerModule,
    AgGridModule,
    NgxMaskModule,
    NgbModule
  ],
  selector: 'app-invoice',
  templateUrl: './invoice.component.html'
})
export class InvoiceComponent implements OnInit {

  ngOnChanges(changes: SimpleChanges) {
    if (changes?.fsId?.currentValue) {
      this.getData()
    }
  }

  bsConfig1 = { dateInputFormat: 'YYYY-MM-DD', selectFromOtherMonth: true }


  @Input() public title = "Invoice";
  @Input() public onSubmit: Function;
  @Input() public data: any;
  @Input() public submitted: boolean;
  @Input() public fsId: number;


  @Output() formElements: EventEmitter<IEmmiter> = new EventEmitter()

  formClass(key: string | number) {
    return this.submitted && this.getInvoice[key]['errors'] ? 'is-invalid' : ''
  }

  formValidator(key: any) {
    if (this.getInvoice[key].validator === null) return '';
    const validator = this.getInvoice[key].validator({} as AbstractControl);
    if (validator && validator['required']) return 'required';
    return ''
  }

  form = this.fb.group({
    invoice: this.fb.group({
      invoice: [''],
      vendor_inv_number: [''],
      vendor_cost: [''],
      invoice_date: [''],
      invoice_number: [''],
      acc_status: [''],
      billable: ['', Validators.required],
      non_billable_code: [null, Validators.required],
      invoice_notes: [''],
      mark_up_percent: [30, Validators.required],
      ef_hourly_rate: [95.00, Validators.required],
      ef_overtime_hourly_rate: [142.50, Validators.required],
      paper_work_location: "Field Service",
      billable_flat_rate_or_po: [''],
      contractor_inv_sent_to_ap: [''],
      period: [''],
    }),
  });

  constructor(
    private fb: FormBuilder,
    private schedulerService: SchedulerService,
    private config: NgSelectConfig
  ) {
    this.config.placeholder = '--Select--';
    this.config.loadingText = 'Loading...';
  }

  async getData() {
    let data = await this.schedulerService.getByIdRaw(this.fsId)
    this.form.patchValue({ invoice: data })
  }


  ngOnInit(): void {
    if (this.fsId) {
      this.getData()
    }
  }


  ngAfterViewInit() {
    this.formElements?.emit({
      form: this.form,
      resetForm: this.resetForm,
      getFormValidationErrors: getFormValidationErrors
    })
  }

  resetForm = () => {
    this.submitted = false
    this.form.reset()
  }

  async submit() {
    this.submitted = true;

    await this.schedulerService.update(this.fsId, this.form.value.invoice);

    SweetAlert.toast({
      icon: 'success',
      title: "Saved Successfully",
    })

  }

  get getInvoice() {
    return this.form.get('invoice')['controls']
  }


}
