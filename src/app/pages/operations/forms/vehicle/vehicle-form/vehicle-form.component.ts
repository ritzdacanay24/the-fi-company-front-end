import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { states } from "@app/core/data/states";
import { SharedModule } from "@app/shared/shared.module";
import { NgSelectModule } from "@ng-select/ng-select";
import { IVehicleForm } from "./vehicle-form.type";
import { ControlsOf } from "src/assets/js/util/_formGroup";

@Component({
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, NgSelectModule],
  selector: "app-vehicle-form",
  templateUrl: "./vehicle-form.component.html",
})
export class VehicleFormComponent {
  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  get f() {
    return this.form.controls;
  }

  states = states;

  form = new FormGroup<ControlsOf<IVehicleForm>>({
    department: new FormControl("", [Validators.required]),
    vehicleMake: new FormControl("", [Validators.required]),
    year: new FormControl("", [Validators.required]),
    vin: new FormControl("", [Validators.required]),
    exp: new FormControl("", [Validators.required]),
    vehicleNumber: new FormControl("", [Validators.required]),
    mileage: new FormControl("", [Validators.required]),
    lastServiceDate: new FormControl(""),
    typeOfService: new FormControl(""),
    fuelType: new FormControl("", [Validators.required]),
    createdBy: new FormControl(null),
    licensePlate: new FormControl("", [Validators.required]),
    active: new FormControl(1),
    createdDate: new FormControl(null),
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
