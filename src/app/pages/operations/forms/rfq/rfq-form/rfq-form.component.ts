import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { SharedModule } from "@app/shared/shared.module";
import { NgSelectModule } from "@ng-select/ng-select";
import { QadCustomerPartSearchComponent } from "@app/shared/components/qad-customer-part-search/qad-customer-part-search.component";
import { QadWoSearchComponent } from "@app/shared/components/qad-wo-search/qad-wo-search.component";
import { TagInputModule } from "ngx-chips";
import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { must_be_email } from "src/assets/js/util";
import rfqFormJson from "./rfq-form.json";
import { validateEmail } from "src/assets/js/util/validateEmail";
import { isJsonString } from "src/assets/js/util/isJsonString";

function jsonParse(data) {
  for (const property in data) {
    if (isJsonString(data[property])) {
      data[property] = JSON.parse(data[property]);
    }
  }
  return data;
}

export function onFormatDataBeforeEmail(data) {
  data = jsonParse(data);

  let params = {
    SendFormEmail: 1,
    details: data,
    infoCustomerView: data.vendor,
    palletSizeInformationSendInfo: data.palletSizeInformationSendInfo,
    salesOrder: data["sod_nbr"],
    customerSelected: data.vendor,
    emailToSendTo: data["emailToSendTo"].toString(),
    lineInfoEachShow: data["lines"], //apparently this needs to be at the end because php will not see the rest of the properties in this object
  };

  return params;
}

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    QadWoSearchComponent,
    QadCustomerPartSearchComponent,
    NgbModule,
    NgSelectModule,
    TagInputModule,
  ],
  selector: "app-rfq-form",
  templateUrl: "./rfq-form.component.html",
})
export class RfqFormComponent {
  form: FormGroup;
  palletSizeInformationSendInfo: FormArray;
  formValues = rfqFormJson;
  lines: FormArray;

  /**
   * how many inputs should generate when page loads.
   */
  palletInputCount: number = 1;

  /**
   * Form lock status - determines if form is read-only
   */
  @Input() isFormDisabled: boolean = false;

  constructor(private fb: FormBuilder) {}

  // convenience getter for easy access to form fields
  get f() {
    return this.form.controls;
  }

  @Input() submitted = false;

  /**
   * Validatin tags to ensure email is entered
   */
  public validators = [must_be_email];

  public errorMessages = {
    must_be_email: "Enter valid email adress!",
  };

  /**
   * Dynamically create pallet inputs using form group
   * @returns formgroup
   */
  public createPallet(): FormGroup {
    return this.fb.group({
      size: ["", Validators.required],
    });
  }

  public addPallets(): void {
    this.palletSizeInformationSendInfo = this.form.get(
      "palletSizeInformationSendInfo"
    ) as FormArray;
    this.palletSizeInformationSendInfo.push(this.createPallet());
  }

  private createFbGroup() {
    return {
      /**
       * email Info
       */
      full_name: [null],
      emailToSendTo: [null, Validators.required],
      ccEmails: [null, Validators.required],
      bbEmails: [""],
      vendor: [null, Validators.required],
      subjectLine: ["", Validators.required],
      sod_nbr: ["", Validators.required],
      /**
       * Shipping Information
       */
      shipperName: ["", Validators.required],
      address: ["", Validators.required],
      city: ["", Validators.required],
      state: ["", Validators.required],
      zip: ["", Validators.required],
      phone: ["", Validators.required],
      requestorName: [null, Validators.required],
      contactName: ["", Validators.required],
      shippingHours: ["", Validators.required],
      readyDateTime: ["", Validators.required],
      puNumber: ["", Validators.required],
      poNumber: ["", Validators.required],
      poShippingFull: ["", Validators.required],
      appointmentRequired: ["", Validators.required],
      liftGateRequired: ["", Validators.required],
      bolFaxEmail: ["", Validators.required],
      /**
       * Destination Information
       */
      dest_companyName: ["", Validators.required],
      dest_address: ["", Validators.required],
      dest_address2: [""],
      dest_city: ["", Validators.required],
      dest_state: ["", Validators.required],
      dest_zip: ["", Validators.required],
      dest_country: ["", Validators.required],
      dest_phone: ["", Validators.required],
      dest_contactName: ["", Validators.required],
      dest_deliveryNumber: ["", Validators.required],
      dest_deliveryDate: ["", Validators.required],
      dest_appointmentRequired: ["", Validators.required],
      /**
       * Commodity Information
       */
      descriptionOfProduct: ["", Validators.required],
      piecesQtyUoM: [null, Validators.required],
      piecesQty: ["", Validators.required],
      palletSizeInformationSendInfo: this.fb.array([]),
      weight: ["", Validators.required],
      value: ["", Validators.required],
      insuranceIncluded: [true],
      freightClass: ["", Validators.required],
      specialRequirements: [""],
      created_date: [""],
      created_by: [""],
      /**
       * Sales order line information
       */
      lines: this.fb.array([]),
    };
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  ngOnInit(): void {
    this.form = this.fb.group(this.createFbGroup());

    this.setFormEmitter.emit(this.form);

    /**
     * Vendor is an object
     * When vendor is selected patch emailTosendTo with the array of emails
     */
    this.form.get("vendor").valueChanges.subscribe((mode: any) => {
      mode && this.setValue("emailToSendTo", mode.emails);
    });

    this.form.get("puNumber").valueChanges.subscribe((mode: any) => {
      this.setValue(
        "subjectLine",
        `PICK UP: ${this.form.value.sod_nbr || ""} ${
          this.form.value.dest_companyName || ""
        }`
      );
      this.setValue("puNumber", `${this.form.value.sod_nbr || ""}`);
    });

    this.form.get("dest_companyName").valueChanges.subscribe((mode: any) => {
      this.setValue(
        "subjectLine",
        `PICK UP: ${this.form.value.sod_nbr || ""} ${
          this.form.value.dest_companyName || ""
        }`
      );
      this.setValue("puNumber", `${this.form.value.sod_nbr || ""}`);
    });
  }

  public deletePallet(index) {
    this.palletSizeInformationSendInfo.removeAt(index);
  }

  public setValue(column, value) {
    this.form.controls[column].setValue(value, { emitEvent: false });
  }

  /**
   * Calculate declared value and set form value
   */
  public calculateValue() {
    let declaredValue = 0;
    let lines = this.form.get("lines").value;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].addItemsList == true) {
        declaredValue += lines[i].sod_list_pr * lines[i].qty;
      }
    }
    this.setValue("value", declaredValue);
  }

  addEmail($event) {
    let ee = validateEmail($event);

    if (!ee) {
      alert("Not valid email.");
      return false;
    }

    return $event;
  }
}
