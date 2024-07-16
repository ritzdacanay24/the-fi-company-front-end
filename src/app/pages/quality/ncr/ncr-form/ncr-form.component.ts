import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { NcrComplainCodeService } from "@app/core/api/quality/ncr/ncr-complain-code.service";
import { QadWoSearchComponent } from "@app/shared/components/qad-wo-search/qad-wo-search.component";
import { QirSearchComponent } from "@app/shared/components/qir-search/qir-search.component";
import { SharedModule } from "@app/shared/shared.module";
import { corrective_action_issued_to } from "../ncr-corrective-action-form/ncr-corrective-action-form.component";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import { AuthenticationService } from "@app/core/services/auth.service";
import { NcrService } from "@app/core/api/quality/ncr-service";
import moment from "moment";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    QirSearchComponent,
    QadWoSearchComponent,
  ],
  selector: "app-ncr-form",
  templateUrl: "./ncr-form.component.html",
  styleUrls: [],
})
export class NcrFormComponent {
  constructor(
    private fb: FormBuilder,
    private ncrComplainCodeService: NcrComplainCodeService,
    private authenticationService: AuthenticationService,
    private ncrService: NcrService
  ) {}

  ngOnInit(): void {
    this.getComplaintCodes();

    this.setFormEmitter.emit(this.form);
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;
  @Input() id = null;

  formData;

  get f() {
    return this.form.controls;
  }

  async notifyParent($event) {
    this.form.patchValue({ qir_number: $event.id });
  }

  async setOrkOrderNumber($event) {
    this.form.patchValue({ wo_nbr: $event.wo_nbr });
  }

  complaint_codes: any;

  ncr_types: any[] = [
    "Internal",
    "Supplier",
    "Customer Return",
    "Internal Audit",
    "Customer Complaint",
  ];
  cont_types: any[] = ["Rework", "RTV", "UAI", "MRB", "Scrap", "Others"];

  corrective_action_issued_to = corrective_action_issued_to;

  form = this.fb.group({
    source: [""],
    po_nbr: [""],
    wo_nbr: [null],
    ncr_type: this.fb.array(this.ncr_types.map((x) => false)),
    pt_nbr: [""],
    rev: [""],
    initiated_by: [""],
    ret_nbr: [""],
    acc: [""],
    rej: [""],
    sample_size: [""],
    dept_operator: [""],
    finished_nbr: [""],
    desc_of_defn_rej: [""],
    cont_notes: [""],
    cont_type: this.fb.array(this.cont_types.map((x) => false)),
    cont_dspn_by: [""],
    cont_dspn_title: [""],
    cont_dspn_dt: [null],
    dspn_desc: [""],
    impact_assesment: [""],
    icm_notes: [""],
    icm_dspn_by: [""],
    icm_dspn_title: [""],
    icm_dspn_dt: [null],
    complaint_code: [null],
    qir_number: [null],
    created_by: [null],
    created_date: [null],
    updated_by: [null],
    submitted_date: [null],

    ca_action_req: [""],
    iss_by: [""],
    iss_dt: [null],
    ca_iss_to: [null],
    ca_due_dt: [null],
    ca_email_sent_date_time: [null],
    ca_email_sent_to: [null],
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key];
    this.form.get(key).patchValue(e ? 1 : 0);
  }

  async getComplaintCodes() {
    this.complaint_codes = await this.ncrComplainCodeService.getAll();
  }

  async onSendEmailToDepartment() {
    if (
      !this.form.value?.ca_action_req ||
      this.form.value?.ca_action_req == "No"
    ) {
      alert("Unable to send email. Corrective action not required.");
      return;
    }

    if (!this.form.value?.ca_due_dt) {
      alert("Please enter corrective action due date.");
      return;
    }
    if (!this.form.value?.ca_iss_to) {
      alert("Please enter department you are assigning this CA to");
      return;
    }

    if (
      !confirm(
        "Send email to \n" + this.form.value?.ca_email_sent_to.split(",")
      )
    )
      return;

    let newData = {
      ca_iss_to: this.form.value?.ca_iss_to,
      ca_due_dt: this.form.value?.ca_due_dt,
      updated_by: this.authenticationService.currentUserValue.full_name,
      ca_action_req: this.form.value?.ca_action_req,
      ca_email_sent_date_time: moment().format("YYYY-MM-DD HH:mm:ss"),
      ca_email_sent_by: this.authenticationService.currentUserValue.id,
    };

    await this.ncrService.updateAndSendEmailToDepartment(this.id, newData);

    this.form.patchValue(newData);

    SweetAlert.fire({
      title: "Email successfully sent.",
    });
  }
}
