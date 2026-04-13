import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { SharedModule } from "@app/shared/shared.module";

export const corrective_action_issued_to: any[] = [
  "Production",
  "Logistics",
  "Quality",
  "NPI",
];

@Component({
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule],
  selector: "app-ncr-corrective-action-form",
  templateUrl: "./ncr-corrective-action-form.component.html",
  styleUrls: [],
})
export class NcrCorrectiveActionFormComponent {
  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
  }
  corrective_action_issued_to = corrective_action_issued_to;

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  formData;

  @Input() isFormDisabled = false;

  get f() {
    return this.form.controls;
  }

  form = this.fb.group({
    ca_action_req: [""],
    iss_by: [""],
    iss_dt: [null],
    ca_iss_to: [null],
    ca_due_dt: [null],
    ca_cont_immed_action_taken: [""],
    ca_root_cause: [""],
    ca_taken_to_prevent_recurr: [""],
    planned_ca_impl_dt: [null],
    ca_by: [""],
    ca_title: [""],
    ca_dt: [null],
    ca_impl_by: [""],
    ca_impl_title: [""],
    ca_impl_dt: [null],
    ca_submitted_date: [""],
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key];
    this.form.get(key).patchValue(e ? 1 : 0);
  }
}
