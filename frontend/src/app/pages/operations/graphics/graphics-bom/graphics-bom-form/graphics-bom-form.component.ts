import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { states } from "@app/core/data/states";
import { SharedModule } from "@app/shared/shared.module";
import { NgSelectModule } from "@ng-select/ng-select";
import { ControlsOf } from "src/assets/js/util/_formGroup";
import { QadPartSearchComponent } from "@app/shared/components/qad-part-search/qad-part-search.component";
import { AutosizeModule } from "ngx-autosize";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    QadPartSearchComponent,
    AutosizeModule,
  ],
  selector: "app-graphics-bom-form",
  templateUrl: "./graphics-bom-form.component.html",
})
export class GraphicsBomFormComponent {
  constructor() {}

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  get f() {
    return this.form.controls;
  }

  states = states;

  form = new FormGroup<ControlsOf<any>>({
    Product: new FormControl(""),
    SKU_Number: new FormControl(""),
    ID_Product: new FormControl("", Validators.required),
    Serial_Number: new FormControl(""),
    Category: new FormControl(""),
    Status: new FormControl("Active"),
    Account_Vendor: new FormControl(""),
    Manufacturer: new FormControl(""),
    DI_Product_SQL: new FormControl(""),
    Image_Data: new FormControl(""),
    DD1_1: new FormControl(""),
    DD1_2: new FormControl(""),
    DD1_5: new FormControl(""),
    DD1_7: new FormControl(""),
    DD2_1: new FormControl(""),
    DD2_2: new FormControl(""),
    DD2_6: new FormControl(""),
    DD2_7: new FormControl(""),
    DD2_8: new FormControl(""),
    DD2_9: new FormControl(""),
    DD3_1: new FormControl(""),
    DD3_2: new FormControl(""),
    DD3_3: new FormControl(""),
    DD3_6: new FormControl(""),
    DD3_8: new FormControl(""),
    DD3_9: new FormControl(""),
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key];
    this.form.get(key).patchValue(e ? 1 : 0);
  }

  formValidator(key: any) {
    if (this.form.get(key)?.validator === null) return "";
    const validator = this.form.get(key)?.validator({} as AbstractControl);
    if (validator && validator["required"]) return "required";
    return "";
  }
}
