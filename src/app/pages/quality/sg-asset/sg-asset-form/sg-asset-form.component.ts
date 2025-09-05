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
    QadCustomerPartSearchComponent,
    QadWoSearchComponent,
  ],
  selector: "app-sg-asset-form",
  templateUrl: "./sg-asset-form.component.html",
  styleUrls: ["./sg-asset-form.component.scss"],
})
export class SgAssetFormComponent {
  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
    
    // Lock form if in edit mode
    if (this.isEditMode) {
      this.form.disable();
    }
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;
  @Input() isEditMode = false; // New input to determine if form should be locked

  get f() {
    return this.form.controls;
  }

  form = this.fb.group({
    timeStamp: [""],
    poNumber: [""],
    property_site: [""],
    sgPartNumber: [null],
    inspectorName: [""],
    generated_SG_asset: [""],
    serialNumber: [""],
    lastUpdate: [""],
    active: [1],
    manualUpdate: [""],
    created_by: [""],
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key];
    this.form.get(key).patchValue(e ? 1 : 0);
  }

  getCustomerPartNumber($event) {
    this.form.patchValue({ sgPartNumber: $event.cp_cust_part });
  }

  getWoNumber($event) {
    this.form.patchValue({ poNumber: $event.wo_nbr });
  }
}
