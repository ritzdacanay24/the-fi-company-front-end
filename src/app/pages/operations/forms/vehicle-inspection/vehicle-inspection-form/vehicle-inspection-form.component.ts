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
import { PathUtilsService } from "@app/core/services/path-utils.service";
import { AutosizeModule } from "ngx-autosize";
import { VehicleInspectionResolveModalService } from "./vehicle-inspection-resolve-modal/vehicle-inspection-resolve-modal.component";

@Component({
  standalone: true,
  imports: [SharedModule, AutosizeModule],
  selector: "app-vehicle-inspection-form",
  templateUrl: "./vehicle-inspection-form.component.html",
  styles: [],
})
export class VehicleInspectionFormComponent implements OnInit {
  @Input() formValues = formValues;
  @Input() submitted: boolean;
  @Input() id: number | null = null; // ID of the vehicle inspection
  @Input() isSubmitted: boolean = false; // Track if inspection has been submitted
  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();
  @Output() setFormErrorsEmitter: EventEmitter<any> = new EventEmitter();
  form: FormGroup;

  // convenience getter for easy access to form fields
  get f() {
    return this.form.controls;
  }

  public groupSelect(main, row, name) {
    if (name == "status") {
      if (main.status) {
        // When "All Pass" is checked, uncheck "Has Failures" and set all items to Pass
        main.needMaint = false;
        for (var i = 0; i < row.length; i++) {
          row[i].status = 1;
        }
      } else {
        // When "All Pass" is unchecked, reset all items to no selection
        for (var i = 0; i < row.length; i++) {
          row[i].status = null;
        }
      }
    }
    
    if (name == "needMaint") {
      if (main.needMaint) {
        // When "Has Failures" is checked, uncheck "All Pass" and set all items to Fail
        main.status = false;
        for (var i = 0; i < row.length; i++) {
          row[i].status = 0;
        }
      } else {
        // When "Has Failures" is unchecked, reset all items to no selection
        for (var i = 0; i < row.length; i++) {
          row[i].status = null;
        }
      }
    }
  }

  // Add method to update header checkboxes based on individual item status
  public updateHeaderStatus(main, row) {
    const allPass = row.every(item => item.status === 1);
    const allFail = row.every(item => item.status === 0);
    const hasFailures = row.some(item => item.status === 0);
    
    if (allPass) {
      main.status = true;
      main.needMaint = false;
    } else if (hasFailures) {
      main.status = false;
      main.needMaint = true;
    } else {
      main.status = false;
      main.needMaint = false;
    }
  }

  // Add method to get description for each inspection item
  public getItemDescription(itemName: string): string {
    const descriptions = {
      'Engine Oil and Coolant Levels': 'Verify adequate oil and coolant levels using dipstick and reservoir indicators',
      'Windshield & Mirrors': 'Ensure clear visibility through windshield and proper adjustment of all mirrors',
      'Doors & Windows Operation': 'Test all doors for secure closing and windows for proper operation',
      'Emergency Brake System': 'Verify emergency brake engages and releases properly with adequate tension',
      'Tire Condition & Pressure': 'Check tire pressure, tread depth, and inspect for wear patterns or damage',
      'Fluid Leak Inspection': 'Examine ground under vehicle for any oil, coolant, brake fluid, or other leaks',
      'Insurance Documentation': 'Confirm current insurance card is present and easily accessible in vehicle',
      'Vehicle Registration': 'Verify vehicle registration is current and stored in designated location',
      'Vehicle Cleanliness & Damage Assessment': 'Inspect interior and exterior for cleanliness, dents, scratches, or damage',
      'Fuel Level & Dashboard Indicators': 'Check adequate fuel level and ensure no warning lights are illuminated',
      'Windshield Wipers & Washers': 'Test wiper operation and washer fluid function, check blade condition',
      'Horn Function Test': 'Verify horn produces clear, audible sound when activated',
      'Lighting Systems Check': 'Test headlights, taillights, turn signals, hazard lights, and brake lights',
      'Climate Control Systems': 'Verify heater, air conditioning, and defroster operation when applicable'
    };
    
    return descriptions[itemName] || 'Complete inspection according to established safety standards';
  }

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private vehicleService: VehicleService,
    private vehicleInspectionResolveModalService: VehicleInspectionResolveModalService,
    private pathUtils: PathUtilsService
  ) { }

  vehicleList = [];
  async getVehicle() {
    this.vehicleList = await this.vehicleService.find({ active: 1 });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["formValues"]) {
      this.formValues = changes["formValues"].currentValue;
    }
    if (changes["id"]) {
      this.id = changes["id"].currentValue;
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
      mileage: [null],
      not_used: [0],
    });
    this.setDetailsFormEmitter.emit(this.formValues);
    this.setFormEmitter.emit(this.form);

    this.getVehicle();
  }

  failureMessage = "";
  failureErrors: any;
  failureClass: any;
  async checkAnyFailures() {
    this.failureMessage = "";
    this.failureClass = "";
    this.failureErrors = await this.vehicleService.checkAnyFailures(
      this.form.value.truck_license_plate
    );
    if (this.failureErrors?.length > 0) {
      this.failureClass = "alert alert-danger";
      this.failureMessage = `Vehicle Status Update: This vehicle currently has a total of ${this.failureErrors?.length} unresolved failures that need to be addressed.`;
    } else {
      this.failureClass = "alert alert-success";
      this.failureMessage = `Vehicle Status Update: This vehicle is in excellent condition and does not have any reported failures. `;
    }

    for (let i = 0; i < this.formValues?.checklist?.length; i++) {

      for (let ii = 0; ii < this.formValues?.checklist[i].details?.length; ii++) {
        this.formValues.checklist[i].details[ii].allErrors = []
        for (let v = 0; v < this.failureErrors?.length; v++) {
          if (this.failureErrors[v].checklist_name == this.formValues?.checklist[i].details[ii].name) {
            this.formValues?.checklist[i].details[ii].allErrors.push(this.failureErrors[v])
          }
        }
      }
    }
  }

  @Input() getData: any;
  async resolveIssue(data) {
    this.vehicleInspectionResolveModalService.open(data).result.then((res) => {
      this.getData();
    });
  }

  /**
   * Generate URL for vehicle inspection edit page using PathUtilsService
   */
  getVehicleInspectionEditUrl(checklistId: string): string {
    return this.pathUtils.createExternalUrl(['/operations/forms/vehicle-inspection/edit'], { id: checklistId });
  }
}
