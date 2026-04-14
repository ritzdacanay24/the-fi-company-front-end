import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
} from "@angular/forms";
import { SharedModule } from "@app/shared/shared.module";
import { AddTagFn } from "@ng-select/ng-select/lib/ng-select.component";
import { validateEmail } from "src/assets/js/util/validateEmail";
import { NgSelectModule } from "@ng-select/ng-select";
import { IgtTransferService } from "@app/core/api/operations/igt-transfer/igt-transfer.service";
import moment from "moment";
import { SoSearchComponent } from "@app/shared/components/so-search/so-search.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    SoSearchComponent,
  ],
  selector: "app-igt-transfer-form",
  templateUrl: "./igt-transfer-form.component.html",
})
export class IgtTransferFormComponent {
  constructor(private fb: FormBuilder, private api: IgtTransferService) {}

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  @Input() disableSearch = false;

  get f() {
    return this.form.get("main")["controls"];
  }

  details: FormArray;

  get getDetails() {
    return this.form.get("details") as FormArray;
  }

  form = this.fb.group({
    main: this.fb.group({
      transfer_reference: new FormControl(null),
      transfer_reference_description: new FormControl(""),
      date: new FormControl(""),
      so_number: new FormControl(null),
      from_location: new FormControl(""),
      created_by: new FormControl(null),
      created_date: new FormControl(""),
      active: new FormControl(1),
      to_location: new FormControl(""),
      email_sent_datetime: new FormControl(null),
      email_sent_created_by_name: new FormControl(null),
    }),
    details: this.fb.array([]),
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

  isIGTOrder = true;
  async notifyParent($event) {
    this.isIGTOrder = true;
    this.details?.clear();
    try {
      this.form.disable();
      const soNumber = $event?.sod_nbr || $event?.SOD_NBR;
      const data: any[] = await this.api.getSoLineDetails(soNumber);

      if (!Array.isArray(data) || data.length === 0) {
        this.form.patchValue(
          {
            main: {
              so_number: soNumber || null,
              transfer_reference: null,
              transfer_reference_description: "",
              to_location: "",
            },
          },
          { emitEvent: false }
        );
        this.form.enable();
        return;
      }

      const firstInfo = data[0];
      const toLocation = firstInfo.to_loc ?? firstInfo.TO_LOC ?? "";
      const soPo = firstInfo.so_po ?? firstInfo.SO_PO ?? null;
      const soRemarks = firstInfo.so_rmks ?? firstInfo.SO_RMKS ?? "";

      this.form.patchValue(
        {
          main: {
            transfer_reference: soPo,
            transfer_reference_description: soRemarks,
            date: moment().format("YYYY-MM-DD"),
            from_location: "Z009",
            to_location: toLocation,
            so_number: soNumber,
          },
        },
        { emitEvent: false }
      );

      if (data) {
        this.isIGTOrder = false;
        this.details = this.form.get("details") as FormArray;
        for (let i = 0; i < data.length; i++) {
          const row = data[i] || {};
          this.details.push(
            this.fb.group({
              so_line: row.sod_line ?? row.SOD_LINE ?? "",
              part_number: row.sod_part ?? row.SOD_PART ?? "",
              description: `${row.pt_desc1 ?? row.PT_DESC1 ?? ""} ${row.pt_desc2 ?? row.PT_DESC2 ?? ""}`.trim(),
              qty: row.sod_qty_ord ?? row.SOD_QTY_ORD ?? 0,
              pallet_count: 1,
              serial_numbers: "NA",
            })
          );
        }
      }

      this.form.enable();
    } catch (err) {
      console.error("Failed to load IGT SO line details", err);
      this.form.enable();
    }
  }
}
