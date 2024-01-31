import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { JobService } from '@app/core/api/field-service/job.service';
import { ToastrService } from 'ngx-toastr';
import { NAVIGATION_ROUTE } from '../../job-constant';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule
  ],
  selector: 'app-job-invoice',
  templateUrl: './job-invoice.component.html',
  styleUrls: []
})
export class JobInvoiceComponent {

  constructor(
    private fb: FormBuilder,
    private jobService: JobService,
    private toastrService: ToastrService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form)
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['id']) {
      this.id = changes['id'].currentValue
      this.getData();
    }
  }

  bsConfig1 = { dateInputFormat: 'YYYY-MM-DD', selectFromOtherMonth: true }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  get f() {
    return this.form.controls
  }

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
  }

  @Input() id = null

  form = this.fb.group({
    vendor_cost: [''],
    invoice: [''],
    invoice_date: [''],
    invoice_number: [''],
    invoice_notes: [''],
    vendor_inv_number: [''],
    billable_flat_rate_or_po: [''],
    paper_work_location: [''],
    acc_status: [''],
    contractor_inv_sent_to_ap: [''],
    period: [''],
    billable: [''],
  })

  isLoading = false;

  title = "Invoice"

  async getData() {
    try {
      let data = await this.jobService.getById(this.id);
      this.form.patchValue(data)
    } catch (err) { }
  }

  async onSubmit() {
    try {
      this.isLoading = true;
      await this.jobService.updateInvoice(this.id, this.form.value);
      this.toastrService.success('Successfully saved.')
      this.isLoading = false;
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }

  }
}
