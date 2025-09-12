import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import rmaFormJson from "./rma.json";
import { QirSearchComponent } from "@app/shared/components/qir-search/qir-search.component";
import { QadCustomerNameSearchComponent } from "@app/shared/components/qad-customer-name-search/qad-customer-name-search.component";
import { QadPartSearchComponent } from "@app/shared/components/qad-part-search/qad-part-search.component";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    QirSearchComponent,
    QadCustomerNameSearchComponent,
    QadPartSearchComponent,
  ],
  selector: "app-rma-form",
  templateUrl: "./rma-form.component.html",
  styleUrls: ["./rma-form.component.scss"],
})
export class RmaFormComponent {
  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
    this.formData = rmaFormJson;
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  @Input() isFormDisabled: boolean = false;

  @Input() isEditMode: boolean = false;

  formData;

  get f() {
    return this.form.controls;
  }

  toggleActiveState() {
    const currentValue = this.f.active.value;
    this.form.patchValue({ active: currentValue ? 0 : 1 });
    this.setBooleanToNumber('active');
  }

  form = this.fb.group({
    type: [""],
    rmaNumber: [""],
    status: ["Open"],
    customer: [null],
    partNumber: [null],
    partDescription: [""],
    orderNumber: [""],
    qty: [""],
    tag_qn_number: [""],
    qirNumber: [null],
    returnMethod: [""],
    returnType: [""],
    disposition: [""],
    notes: [""],
    customerComment: [""],
    dateIssued: [""],
    failureCode: [""],
    createdDate: [""],
    createdBy: [""],
    active: [1],
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key];
    this.form.get(key).patchValue(e ? 1 : 0);
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
    this.form.patchValue({
      partNumber: $event.pt_part,
      partDescription: $event.description,
    });
  }
}
