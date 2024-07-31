import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from "@angular/forms";
import { states } from "@app/core/data/states";
import { SharedModule } from "@app/shared/shared.module";
import { AddTagFn } from "@ng-select/ng-select/lib/ng-select.component";
import { validateEmail } from "src/assets/js/util/validateEmail";
import { NgSelectModule } from "@ng-select/ng-select";
import { IPlacardForm } from "./placard-form.type";
import { ControlsOf } from "src/assets/js/util/_formGroup";
import { PlacardService } from "@app/core/api/operations/placard/placard.service";
import { QadCustomerPartSearchComponent } from "@app/shared/components/qad-customer-part-search/qad-customer-part-search.component";
import { QadWoSearchComponent } from "@app/shared/components/qad-wo-search/qad-wo-search.component";
import { SoSearchComponent } from "@app/shared/components/so-search/so-search.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    SoSearchComponent,
    QadWoSearchComponent,
    QadCustomerPartSearchComponent,
  ],
  selector: "app-placard-form",
  templateUrl: "./placard-form.component.html",
})
export class PlacardFormComponent {
  constructor(
    private placardService: PlacardService
  ) {}

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  get f() {
    return this.form.controls;
  }

  states = states;

  form = new FormGroup<ControlsOf<IPlacardForm>>({
    line_number: new FormControl(null),
    customer_name: new FormControl(""),
    eyefi_wo_number: new FormControl(null),
    po_number: new FormControl(""),
    eyefi_so_number: new FormControl(null),
    customer_co_por_so: new FormControl(""),
    description: new FormControl(""),
    eyefi_part_number: new FormControl(""),
    customer_part_number: new FormControl(""),
    location: new FormControl(""),
    customer_serial_tag: new FormControl(""),
    eyefi_serial_tag: new FormControl(""),
    qty: new FormControl(null),
    label_count: new FormControl(null),
    total_label_count: new FormControl(null),
    created_date: new FormControl(null),
    created_by: new FormControl(null),
    active: new FormControl(1),
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key];
    this.form.get(key).patchValue(e ? 1 : 0);
  }

  addTag: AddTagFn | boolean = (e) => {
    let ee = validateEmail(e);

    if (!ee) {
      alert("Not valid email.");
      return false;
    }
    return validateEmail(e) ? e : false;
  };

  formValidator(key: any) {
    if (this.form.get(key)?.validator === null) return "";
    const validator = this.form.get(key)?.validator({} as AbstractControl);
    if (validator && validator["required"]) return "required";
    return "";
  }

  async notifyParent($event) {
    try {
      this.form.disable();
      let data: any = await this.placardService.getPlacardBySoSearch(
        $event.sod_nbr,
        $event.sod_part,
        $event.sod_line
      );

      if (data)
        this.form.patchValue({
          description: data.FULLDESC,
          location: data.LOCATION,
          line_number: data.SOD_LINE,
          customer_name: data.SO_CUST,
          customer_part_number: data.SOD_CUSTPART || null,
          po_number: data.SO_PO,
          eyefi_so_number: data.SOD_NBR,
          eyefi_part_number: data.SOD_PART,
          customer_co_por_so: data.MISC,
        });

      this.form.enable();
    } catch (err) {
      this.form.disable();
    }
  }

  getWorkOrderNumber($event) {
    this.form.patchValue({ eyefi_wo_number: $event.wo_nbr });
  }

  getCustomerPartNumber($event) {
    this.form.patchValue({ customer_part_number: $event.cp_cust_part });
  }

  serialNumber: string;
  async getSerialNumberInfo() {
    let data: any = await this.placardService.searchSerialNumber(
      this.form.value.customer_serial_tag
    );
    this.form.get("eyefi_serial_tag").setValue(data.serialNumber);
  }
}
