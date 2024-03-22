import { Component, Input, OnInit } from '@angular/core';
import { JobOverviewComponent } from '../job-overview/job-overview.component';
import { ActivatedRoute, Router } from '@angular/router';
import { JobService } from '@app/core/api/field-service/job.service';
import { WorkOrderService } from '@app/core/api/field-service/work-order.service';
import { NAVIGATION_ROUTE } from '../job-constant';
import { TicketOverviewComponent } from '../../ticket/ticket-overview/ticket-overview.component';
import { SharedModule } from '@app/shared/shared.module';
import { JobSearchComponent } from '@app/shared/components/job-search/job-search.component';

@Component({
  standalone: true,
  imports: [SharedModule, JobOverviewComponent, TicketOverviewComponent, JobSearchComponent],
  selector: 'app-job-overview-page',
  templateUrl: './job-overview-page.component.html',
  styleUrls: []
})
export class JobOverviewPageComponent implements OnInit {

  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    public jobService: JobService,
    public workOrderService: WorkOrderService
  ) {
  }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
      this.active = Number(params['active']) || this.active;
      this.workOrderId = params['workOrderId'];
    });
    if (this.id) this.getData();
  }

  title = "Job Overview"

  icon = "";

  id = null;

  jobInfo: any;

  workOrderInfo: any;

  active = 1

  isLoading = false;

  notifyParent($event){
    this.id = $event.id;
    this.active = 1
    this.router.navigate([], { relativeTo: this.activatedRoute, queryParamsHandling: 'merge', queryParams: { id: this.id, active:1 } });
    this.getData()
  }

  getData = async () => {
    try {
      this.isLoading = true;
      this.jobInfo = await this.jobService.getById(this.id);
      this.workOrderInfo = await this.workOrderService.findOne({ fs_scheduler_id: this.id })
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;

    }
  }

  onNavChange($event) {
    this.router.navigate(['.'], {
      queryParams: {
        active: $event.nextId
      },
      relativeTo: this.activatedRoute
      , queryParamsHandling: 'merge'
    });
  }

  setOnSelectConnectingJob($event) {
    this.id = $event.fsId
    this.router.navigate([], { relativeTo: this.activatedRoute, queryParamsHandling: 'merge', queryParams: { id: this.id } });
  }

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge', queryParams: { active: null } });
  }

  workOrderId = null;
  showTicket = () => {
    this.workOrderId = this.workOrderInfo.id
    this.router.navigate([], { relativeTo: this.activatedRoute, queryParamsHandling: 'merge', queryParams: { workOrderId: this.workOrderId, active: 1 } });
  }

  @Input() goBackToJob: Function = () => {
    this.workOrderId = null
    this.router.navigate([], { relativeTo: this.activatedRoute, queryParamsHandling: 'merge', queryParams: { workOrderId: this.workOrderId, active: 1 } });
  }


}
