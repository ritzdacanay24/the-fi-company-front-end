import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { QadCustomerPartSearchComponent } from "@app/shared/components/qad-customer-part-search/qad-customer-part-search.component";
import { QadWoSearchComponent } from "@app/shared/components/qad-wo-search/qad-wo-search.component";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    QadWoSearchComponent,
    QadCustomerPartSearchComponent,
  ],
  selector: "app-ags-serial-form",
  templateUrl: "./ags-serial-form.component.html",
  styleUrls: ["./ags-serial-form.component.scss"],
})
export class AgsSerialFormComponent {
  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  get f() {
    return this.form.controls;
  }

  form = this.fb.group({
    timeStamp: [""],
    poNumber: [null],
    property_site: [""],
    sgPartNumber: [null],
    inspectorName: [""],
    generated_SG_asset: [""],
    serialNumber: [""],
    lastUpdate: [""],
    active: [1],
    manualUpdate: [""],
    created_by: "",
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key];
    this.form.get(key).patchValue(e ? 1 : 0);
  }

  getWorkOrderNumber($event) {
    this.form.patchValue({ poNumber: $event.wo_nbr });
  }

  getCustomerPartNumber($event) {
    this.form.patchValue({ sgPartNumber: $event.cp_cust_part });
  }
}
