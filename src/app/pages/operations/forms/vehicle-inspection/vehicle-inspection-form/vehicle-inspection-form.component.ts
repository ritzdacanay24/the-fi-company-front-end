import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  SimpleChanges,
} from "@angular/core";

import { Router } from "@angular/router";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { formValues } from "./formData";
import { SharedModule } from "@app/shared/shared.module";
import { VehicleService } from "@app/core/api/operations/vehicle/vehicle.service";
import { AutosizeModule } from "ngx-autosize";

@Component({
  standalone: true,
  imports: [SharedModule, AutosizeModule],
  selector: "app-vehicle-inspection-form",
  templateUrl: "./vehicle-inspection-form.component.html",
  styles: [],
})
export class VehicleInspectionFormComponent implements OnInit {
  @Input() formValues = formValues;
  form: FormGroup;

  @Input() submitted: boolean;
  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  // convenience getter for easy access to form fields
  get f() {
    return this.form.controls;
  }

  public groupSelect(main, row, name) {
    if (name == "status") {
      if (main.status) {
        main.needMaint = false;
      }
    }
    if (name == "needMaint") {
      if (main.needMaint) {
        main.status = false;
      }
    }

    for (var i = 0; i < row.length; i++) {
      if (name == "status") {
        if (main.status) {
          row[i].needMaint = 1;
          row[i].status = 1;
        } else {
          row[i].status = 0;
        }
      }
      if (name == "needMaint") {
        if (main.needMaint) {
          row[i].status = 0;
          row[i].needMaint = 0;
        } else {
          row[i].needMaint = 1;
        }
      }
    }
  }

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private vehicleService: VehicleService
  ) {}

  vehicleList = [];
  async getVehicle() {
    this.vehicleList = await this.vehicleService.find({ active: 1 });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["formValues"]) {
      this.formValues = changes["formValues"].currentValue;
    }
  }
  @Output() setDetailsFormEmitter: EventEmitter<any> = new EventEmitter();

  ngOnInit() {
    this.form = this.fb.group({
      truck_license_plate: [null, Validators.required],
      details: this.fb.array([]),
      comments: [""],
      date_created: [""],
      create: [1],
      created_by: ["", Validators.required],
      created_by_name: ["", Validators.required],
    });
    this.setDetailsFormEmitter.emit(this.formValues);
    this.setFormEmitter.emit(this.form);

    this.getVehicle();
  }
}
