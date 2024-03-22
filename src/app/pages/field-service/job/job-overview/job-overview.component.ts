import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkOrderService } from '@app/core/api/field-service/work-order.service';
import { JobInfoComponent } from './job-info/job-info.component';
import { NAVIGATION_ROUTE } from '../job-constant';
import { JobService } from '@app/core/api/field-service/job.service';
import { NgbDropdownModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { JobInvoiceComponent } from './job-invoice/job-invoice.component';
import { TicketOverviewComponent } from '../../ticket/ticket-overview/ticket-overview.component';
import { JobBillingComponent } from './job-billing/job-billing.component';
import { SchedulerService } from '@app/core/api/field-service/scheduler.service';
import { JobReceiptsComponent } from './job-receipts/job-receipts.component';
import { JobAttachmentsComponent } from './job-attachments/job-attachments.component';
import { SharedModule } from '@app/shared/shared.module';
import { TeamService } from '@app/core/api/field-service/fs-team.service';
import { JobFormComponent } from '../job-form/job-form.component';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    NgbNavModule,
    JobInfoComponent,
    JobInvoiceComponent,
    TicketOverviewComponent,
    JobReceiptsComponent,
    JobBillingComponent,
    NgbDropdownModule,
    JobAttachmentsComponent,
    JobFormComponent
  ],
  selector: 'app-job-overview',
  templateUrl: './job-overview.component.html',
  styleUrls: []
})
export class JobOverviewComponent implements OnInit {

  removeTech
  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    public jobService: JobService,
    public workOrderService: WorkOrderService,
    private schedulerService: SchedulerService,
    private teamService: TeamService,
  ) {
  }
  data
  form
  setFormElements = async ($event) => {
    this.form = $event;
    this.form.patchValue({ job: this.data?.job }, { emitEvent: false })

    if (this.data.resource) {
    }
  }


  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.goBackUrl = params['goBackUrl'];
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['id']) {
      this.id = changes['id'].currentValue
      this.getData();
    }
    if (changes['active']) {
      this.active = changes['active'].currentValue
    }
  }

  @Output() setOnSelectConnectingJob: EventEmitter<any> = new EventEmitter();

  title = "Job Overview"

  icon = "";

  @Input() id = null;

  jobInfo: any;

  workOrderInfo: any;

  @Input() active = 1

  @Input() isLoading = false;

  @Input() goBackUrl: string;

  getData = async () => {
    try {
      this.isLoading = true;
      this.jobInfo = await this.jobService.getById(this.id)
      this.workOrderInfo = await this.workOrderService.findOne({ fs_scheduler_id: this.id })

      //await this.getConnectingJobs()

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  @Input() onNavChange: Function = ($event) => { };

  onSelectConnectingJob($event) {
    //this.setOnSelect.emit($event)
    //this.id = $event.fsId
    //this.router.navigate([], { relativeTo: this.activatedRoute, queryParamsHandling: 'merge', queryParams: { id: this.id } });
  }

  @Input() goBack: Function = () => {
    // if (this.goBackUrl) {
    //   this.router.navigate([this.goBackUrl], { queryParamsHandling: 'merge', queryParams: { active: null } });
    // } else {
    //   this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge', queryParams: { active: null } });
    // }
  }

  @Input() showTicket: Function

  connectingJobs: any = []
  async getConnectingJobs() {
    this.connectingJobs = await this.teamService.find({ fs_det_id: this.id });
  }

}
