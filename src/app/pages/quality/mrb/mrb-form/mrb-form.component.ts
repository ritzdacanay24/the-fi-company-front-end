import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { MrbService } from "@app/core/api/quality/mrb-service";
import { QadPartSearchComponent } from "@app/shared/components/qad-part-search/qad-part-search.component";
import { QirSearchComponent } from "@app/shared/components/qir-search/qir-search.component";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    QirSearchComponent,
    QadPartSearchComponent,
  ],
  selector: "app-mrb-form",
  templateUrl: "./mrb-form.component.html",
  styleUrls: ["./mrb-form.component.scss"],
})
export class MrbFormComponent {
  constructor(private fb: FormBuilder, private mrbService: MrbService) {}

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
    this.calculate();
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  qualityManagerApproval() {}
  vpApproval() {}

  get f() {
    return this.form.controls;
  }

  form = this.fb.group({
    qirNumber: [null],
    createdBy: [""],
    createdDate: [""],
    itemCost: [null],
    disposition: [null],
    status: [null],
    comments: [""],
    active: [1],
    failureType: [""],
    componentType: [""],
    type: [""],
    partNumber: [null],
    partDescription: [""],
    dateReported: [""],
    qtyRejected: [null],
    wo_so: [""],
    rma: [""],
    mrbNumber: [""],
    lotNumber: [""],
    firstApproval: [""],
    secondApproval: [""],
    value: [""],
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key];
    this.form.get(key).patchValue(e ? 1 : 0);
  }

  status = ["Open", "Closed"];

  disposition = [
    "RTV",
    "RTS - repairs / no issues",
    "Scrap",
    "Rework",
    "Use As Is",
  ];

  async notifyParent($event) {
    try {
      this.form.disable();
      let data: any = await this.mrbService.getQirForMrb($event.id);
      data.value = (data.itemCost * data.qtyRejected).toFixed(2);
      this.form.patchValue(data);
      this.form.enable();
    } catch (err) {
      this.form.enable();
    }
  }

  setQadPartNumber($event) {
    this.form.patchValue({
      partNumber: $event.pt_part,
      partDescription: $event.description,
    });
  }

  public setValue(column, value) {
    this.form.controls[column].setValue(value, { emitEvent: false });
  }

  calculate() {
    this.form.get("itemCost").valueChanges.subscribe((mode: any) => {
      this.setValue(
        "value",
        (
          this.form.get("itemCost").value * this.form.get("qtyRejected").value
        ).toFixed(2)
      );
    });
    this.form.get("qtyRejected").valueChanges.subscribe((mode: any) => {
      mode &&
        this.setValue(
          "value",
          (
            this.form.get("itemCost").value * this.form.get("qtyRejected").value
          ).toFixed(2)
        );
    });
  }
}
