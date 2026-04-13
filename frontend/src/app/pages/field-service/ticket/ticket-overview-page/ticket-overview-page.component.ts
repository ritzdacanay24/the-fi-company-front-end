import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { TicketOverviewComponent } from '../ticket-overview/ticket-overview.component';
import { SchedulerService } from '@app/core/api/field-service/scheduler.service';
import { WorkOrderService } from '@app/core/api/field-service/work-order.service';
import { NAVIGATION_ROUTE } from '../ticket-constant';
import { JobOverviewComponent } from '../../job/job-overview/job-overview.component';
import { JobService } from '@app/core/api/field-service/job.service';
import { JobSearchComponent } from '@app/shared/components/job-search/job-search.component';
import moment from 'moment';

@Component({
  standalone: true,
  imports: [SharedModule, TicketOverviewComponent, JobOverviewComponent, JobSearchComponent],
  selector: 'app-ticket-overview-page',
  templateUrl: './ticket-overview-page.component.html',
  styleUrls: []
})
export class TicketOverviewPageComponent implements OnInit {

  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    public workOrderService: WorkOrderService,
    public schedulerService: SchedulerService,
    public jobService: JobService,
  ) {
  }

  goBackUrl
  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
      this.active = Number(params['active']) || this.active;
      this.fsid = params['fsid'];
      this.goBackUrl = params['goBackUrl']
    });

    if (this.id) this.getData();
  }



  notifyParent($event) {
    this.id = $event.id;
    this.active = 1
    this.router.navigate([], { relativeTo: this.activatedRoute, queryParamsHandling: 'merge', queryParams: { id: this.id, active: 1 } });
    this.getData()
  }

  title = "Ticket Overview Page"

  icon = "";

  id = null;

  active = 1

  jobInfo: any;

  workOrderInfo: any;

  isLoading = false;

  getData = async () => {
    try {
      this.isLoading = true;
      this.jobInfo = await this.jobService.getById(this.id)
      this.workOrderInfo = await this.workOrderService.findOne({ fs_scheduler_id: this.id })
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  onSelect($event) {
    this.router.navigate(['.'], {
      queryParams: {
        active: $event
      },
      relativeTo: this.activatedRoute
      , queryParamsHandling: 'merge'
    });
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

  @Input() goBack: Function = () => {
    if (this.goBackUrl) {
      this.router.navigateByUrl(this.goBackUrl);
    } else {
      this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge', queryParams: { active: null } });
    }

  }


  fsid = null;
  showJob = () => {

    this.fsid = this.jobInfo?.id
    this.router.navigate([], { relativeTo: this.activatedRoute, queryParamsHandling: 'merge', queryParams: { fsid: this.fsid, active: 1 } });
  }

  @Input() goBackToTicket: Function = () => {
    this.fsid = null
    this.router.navigate([], { relativeTo: this.activatedRoute, queryParamsHandling: 'merge', queryParams: { fsid: this.fsid, active: 1 } });
  }

  async createTicket() {

    if (!this.workOrderInfo && this.jobInfo?.id) {
      let startTime = moment()
      let end = moment(this.jobInfo?.full_request_date)
      var duration = end.diff(startTime, 'h');
      if (duration > 48) {
        alert('You can start this work order within 48 hours from the requested date.');
        return;
      }
    }

    let params = {
      fs_scheduler_id: this.jobInfo?.id
    }
    try {
      await this.workOrderService.create(params);

      this.fsid = this.jobInfo?.id
      this.router.navigate([], { relativeTo: this.activatedRoute, queryParamsHandling: 'merge', queryParams: { fsid: this.fsid, active: 1 } })
        .then(() => {
          window.location.reload();
        });

    } catch (err) {
    }
  }

}
