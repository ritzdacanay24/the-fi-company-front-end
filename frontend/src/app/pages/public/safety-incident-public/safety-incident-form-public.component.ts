import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from "@angular/forms";
import { states } from "@app/core/data/states";
import { SharedModule } from "@app/shared/shared.module";
import { NgSelectModule } from "@ng-select/ng-select";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { AutosizeModule } from "ngx-autosize";

interface SafetyIncidentOption {
  id: number;
  name: string;
  showLine?: boolean;
  options?: SafetyIncidentOption[];
}

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    TranslateModule,
    AutosizeModule,
  ],
  selector: "app-safety-incident-form-public",
  templateUrl: "./safety-incident-form-public.component.html",
})
export class SafetyIncidentFormPublicComponent {
  constructor(private fb: FormBuilder, public translate: TranslateService) {}

  onChangeLocationOfIncident() {
    this.form.patchValue({ location_of_incident_other: null });
  }

  ngOnInit(): void {
    this.setupAnonymousValidation();
    this.setFormEmitter.emit(this.form);
    this.setOnPrintEmitter.emit(this.onPrint);
  }

  private setupAnonymousValidation(): void {
    this.applyAnonymousRules(Boolean(this.form.controls.anonymous.value));

    this.form.controls.anonymous.valueChanges.subscribe((isAnonymous) => {
      this.applyAnonymousRules(Boolean(isAnonymous));
    });
  }

  private applyAnonymousRules(isAnonymous: boolean): void {
    const firstNameControl = this.form.controls.first_name;
    const lastNameControl = this.form.controls.last_name;

    if (isAnonymous) {
      firstNameControl.clearValidators();
      lastNameControl.clearValidators();
    } else {
      firstNameControl.setValidators([Validators.required]);
      lastNameControl.setValidators([Validators.required]);
    }

    firstNameControl.updateValueAndValidity({ emitEvent: false });
    lastNameControl.updateValueAndValidity({ emitEvent: false });
  }

  isFieldRequired(field: "first_name" | "last_name"): boolean {
    const control = this.form.controls[field];
    const validatorResult: ValidationErrors | null = control.validator
      ? control.validator(control)
      : null;
    return Boolean(validatorResult?.["required"]);
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();
  @Output() setOnPrintEmitter: EventEmitter<any> = new EventEmitter();
  @Input() id: any;

  @Input() submitted = false;

  get f() {
    return this.form.controls;
  }

  get isFormDisabled() {
    return this.form.disabled;
  }

  states = states;

  type_of_incident_options: SafetyIncidentOption[] = [
    {
      id: 1,
      name: "Serious Personnel Injury (Paramedics called)",
    },
    {
      id: 2,
      name: "Personal Injury requiring 3rd party medical support (e.g. ER or Doctor visit)",
    },
    {
      id: 3,
      name: "First Aid Incident",
    },
    {
      id: 4,
      name: "Buildings or Product Damage",
    },
    {
      id: 5,
      name: "Near miss (personnel or buildings)",
    },
    {
      id: 6,
      name: "Safety Procedure non-conformance",
    },
    {
      id: 7,
      name: "Vehicle Incident / Road Traffic Incident",
    },
    {
      id: 8,
      name: "Other",
    },
  ];

  lasVegasFacilityOptions: SafetyIncidentOption[] = [
    {
      id: 1,
      name: "Production",
    },
    {
      id: 2,
      name: "Warehouse",
    },
    {
      id: 3,
      name: "Proto",
    },
    {
      id: 4,
      name: "Graphics",
    },
    {
      id: 5,
      name: "Yard",
    },
    {
      id: 6,
      name: "Office",
    },
    {
      id: 7,
      name: "Other",
    },
  ];

  location_of_incident_options: SafetyIncidentOption[] = [
    {
      id: 1,
      name: "Las Vegas Facility",
      options: this.lasVegasFacilityOptions,
    },
    {
      id: 2,
      name: "Customer Job Site",
      showLine: true,
    },
    {
      id: 3,
      name: "Road Vehicle Incident",
      showLine: true,
    },
    {
      id: 4,
      name: "Other",
      showLine: true,
    },
  ];

  form = this.fb.group({
    date_of_incident: new FormControl(new Date().toISOString().split('T')[0]),
    time_of_incident: new FormControl(null),

    // Required for public form
    first_name: new FormControl(null, [Validators.required]),
    last_name: new FormControl(null, [Validators.required]),
    email: new FormControl(null, [Validators.email]),
    phone: new FormControl(null),
    
    // Anonymous submission option
    anonymous: new FormControl(false),

    type_of_incident: new FormControl(null, [Validators.required]),
    type_of_incident_other: new FormControl(null),

    location_of_incident: new FormControl(null, [Validators.required]),
    location_of_incident_other: new FormControl(null),
    location_of_incident_las_vegas_facility: new FormControl(null),

    description_of_incident: new FormControl(null, [Validators.required]),
    details_of_any_damage_or_personal_injury: new FormControl(null),
    immediate_action_taken: new FormControl(null),
  });

  onPrint;
}
