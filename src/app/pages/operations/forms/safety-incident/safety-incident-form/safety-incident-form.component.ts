import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
} from "@angular/forms";
import { states } from "@app/core/data/states";
import { SharedModule } from "@app/shared/shared.module";
import { AddTagFn } from "@ng-select/ng-select/lib/ng-select.component";
import { validateEmail } from "src/assets/js/util/validateEmail";
import { NgSelectModule } from "@ng-select/ng-select";
import { QadCustomerPartSearchComponent } from "@app/shared/components/qad-customer-part-search/qad-customer-part-search.component";
import { QadWoSearchComponent } from "@app/shared/components/qad-wo-search/qad-wo-search.component";
import { SoSearchComponent } from "@app/shared/components/so-search/so-search.component";
import { UserSearchComponent } from "@app/shared/components/user-search/user-search.component";
import { TranslateModule, TranslateService } from "@ngx-translate/core";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    SoSearchComponent,
    QadWoSearchComponent,
    QadCustomerPartSearchComponent,
    UserSearchComponent,
    TranslateModule,
  ],
  selector: "app-safety-incident-form",
  templateUrl: "./safety-incident-form.component.html",
})
export class SafetyIncidentFormComponent {
  constructor(private fb: FormBuilder, public translate: TranslateService) {}

  onChangeLocationOfIncident() {
    this.form.patchValue({ location_of_incident_other: null });
  }

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
    this.setOnPrintEmitter.emit(this.onPrint);
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();
  @Output() setOnPrintEmitter: EventEmitter<any> = new EventEmitter();
  @Input() id: any;

  @Input() submitted = false;

  get f() {
    return this.form.controls;
  }

  notifyParent($event) {
    this.form.patchValue({
      corrective_action_owner_user_id: $event?.id || null,
      corrective_action_owner: $event?.username || null,
      corrective_action_owner_user_email: $event?.email || null,
    });
  }

  states = states;

  
  type_of_incident_options_v1 = [
    "Serious Personnel Injury (Paramedics called)",
    "Personal Injury requiring 3rd party medical support (e.g. ER or Doctor visit)",
    "First Aid Incident",
    "Buildings or Product Damage",
    "Near miss (personnel or buildings)",
    "Safety Procedure non-conformance",
    "Other"
  ]

  type_of_incident_options = [
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
      name: "Other",
    },
  ];

  lasVegasFacilityOptions = [
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

  location_of_incident_options = [
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
    date_of_incident: new FormControl(null),
    time_of_incident: new FormControl(null),

    first_name: new FormControl(null),
    last_name: new FormControl(""),

    type_of_incident: new FormControl(null),
    type_of_incident_other: new FormControl(null),

    location_of_incident: new FormControl(null),
    location_of_incident_other: new FormControl(null),
    location_of_incident_other_other: new FormControl(null),

    description_of_incident: new FormControl(null),

    corrective_action_owner: new FormControl(null),
    corrective_action_owner_user_id: new FormControl(null),
    corrective_action_owner_user_email: new FormControl(null),
    proposed_corrective_action: new FormControl(""),
    proposed_corrective_action_completion_date: new FormControl(""),
    comments: new FormControl(""),
    confirmed_corrective_action_completion_date: new FormControl(""),

    created_date: new FormControl(""),
    created_by: new FormControl(""),
    status: new FormControl("Open"),
  });

  onPrint = (language = "en") => {
    this.translate.use(language);

    setTimeout(() => {
      var printContents = document.getElementById("print").innerHTML;
      var popupWin = window.open("", "_blank", "width=1000,height=600");
      popupWin.document.open();

      popupWin.document.write(`
        <html>
          <head>
            <title>Material Request Picking</title>
            <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
            <style>
            @page {
              size: portrait;
              padding: 5 !important;
            }
            </style>
          </head>
          <body onload="window.print();window.close()">${printContents}</body>
        </html>`);

      popupWin.document.close();

      popupWin.onfocus = function () {
        setTimeout(function () {
          popupWin.focus();
          popupWin.document.close();
        }, 300);
      };
    }, 200);
  };

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
}
