import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NcrComplainCodeService } from '@app/core/api/quality/ncr/ncr-complain-code.service';
import { QadWoSearchComponent } from '@app/shared/components/qad-wo-search/qad-wo-search.component';
import { QirSearchComponent } from '@app/shared/components/qir-search/qir-search.component';
import { SharedModule } from '@app/shared/shared.module';
import { corrective_action_issued_to } from '../ncr-corrective-action-form/ncr-corrective-action-form.component';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    QirSearchComponent,
    QadWoSearchComponent
  ],
  selector: 'app-ncr-form',
  templateUrl: './ncr-form.component.html',
  styleUrls: []
})
export class NcrFormComponent {

  constructor(
    private fb: FormBuilder,
    private ncrComplainCodeService: NcrComplainCodeService
  ) { }

  ngOnInit(): void {
    this.getComplaintCodes();

    this.setFormEmitter.emit(this.form)
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  formData

  get f() {
    return this.form.controls
  }

  async notifyParent($event) {
    this.form.patchValue({ qir_number: $event.id });
  }

  async setOrkOrderNumber($event) {
    this.form.patchValue({ wo_nbr: $event.wo_nbr });
  }

  complaint_codes: any

  ncr_types: any[] = ["Internal", "Supplier", "Customer Return", "Internal Audit", "Customer Complaint"];
  cont_types: any[] = ["Rework", "RTV", "UAI", "MRB", "Scrap", "Others"];

  corrective_action_issued_to = corrective_action_issued_to;
  
  form = this.fb.group({
    source: [''],
    po_nbr: [''],
    wo_nbr: [null],
    ncr_type: this.fb.array(this.ncr_types.map(x => false)),
    pt_nbr: [''],
    rev: [''],
    initiated_by: [''],
    ret_nbr: [''],
    acc: [''],
    rej: [''],
    sample_size: [''],
    dept_operator: [''],
    finished_nbr: [''],
    desc_of_defn_rej: [''],
    cont_notes: [''],
    cont_type: this.fb.array(this.cont_types.map(x => false)),
    cont_dspn_by: [''],
    cont_dspn_title: [''],
    cont_dspn_dt: [null],
    dspn_desc: [''],
    impact_assesment: [''],
    icm_notes: [''],
    icm_dspn_by: [''],
    icm_dspn_title: [''],
    icm_dspn_dt: [null],
    complaint_code: [null],
    qir_number: [null],
    created_by: [null],
    created_date: [null],
    updated_by: [null],
    submitted_date: [null],

    ca_action_req: [''],
    iss_by: [''],
    iss_dt: [null],
    ca_iss_to: [null],
    ca_due_dt: [null],
  })

  setBooleanToNumber(key) {
    let e = this.form.value[key]
    this.form.get(key).patchValue(e ? 1 : 0)
  }

  async getComplaintCodes() {
    this.complaint_codes = await this.ncrComplainCodeService.getAll()
  }

}
