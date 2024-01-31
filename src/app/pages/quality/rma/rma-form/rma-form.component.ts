import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import rmaFormJson from './rma.json';
import { QirSearchComponent } from '@app/shared/components/qir-search/qir-search.component';
import { QadCustomerNameSearchComponent } from '@app/shared/components/qad-customer-name-search/qad-customer-name-search.component';
import { QadPartSearchComponent } from '@app/shared/components/qad-part-search/qad-part-search.component';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    QirSearchComponent,
    QadCustomerNameSearchComponent,
    QadPartSearchComponent
  ],
  selector: 'app-rma-form',
  templateUrl: './rma-form.component.html',
  styleUrls: ['./rma-form.component.scss']
})
export class RmaFormComponent {

  constructor(
    private fb: FormBuilder,
  ) { }

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form)
    this.formData = rmaFormJson;
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  formData

  get f() {
    return this.form.controls
  }

  form = this.fb.group({
    type: ['', Validators.required],
    rmaNumber: [''],
    status: ['Open', Validators.required],
    customer: [null, Validators.required],
    partNumber: [null, Validators.required],
    partDescription: ['', Validators.required],
    orderNumber: ['', Validators.required],
    qty: ['', Validators.required],
    tag_qn_number: ['', Validators.required],
    qirNumber: [null, Validators.required],
    returnMethod: ['', Validators.required],
    returnType: ['', Validators.required],
    disposition: ['', Validators.required],
    notes: [''],
    customerComment: [''],
    dateIssued: ['', Validators.required],
    failureCode: ['', Validators.required],
    createdDate: [''],
    createdBy: [''],
    active: [1],
  })

  setBooleanToNumber(key) {
    let e = this.form.value[key]
    this.form.get(key).patchValue(e ? 1 : 0)
  }

  async notifyParent($event) {
    try {
      this.form.patchValue({ qirNumber: $event.id });
    } catch (err) { }
  }

  getCustomerName($event) {
    try {
      this.form.patchValue({ customer: $event.cm_addr });
    } catch (err) { }
  }

  setQadPartNumber($event) {
    this.form.patchValue({ partNumber: $event.pt_part, partDescription: $event.description })
  }


}
