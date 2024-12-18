import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SchedulerService } from '@app/core/api/field-service/scheduler.service';
import { WorkOrderService } from '@app/core/api/field-service/work-order.service';
import { EventComponent } from './event/event.component';
import { NgbDropdownModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { ReceiptComponent } from './receipts/receipt.component';
import { SerialComponent } from './serial/serial.component';
import { AttachmentComponent } from './attachment/attachment.component';
import { CrashKitComponent } from './crash-kit/crash-kit.component';
import { QirComponent } from './qir/qir.component';
import { WorkOrderComponent } from './work-order/work-order.component';
import { NAVIGATION_ROUTE } from '../ticket-constant';
import { SharedModule } from '@app/shared/shared.module';
import { JobModalService } from '../../job/job-modal-edit/job-modal.service';
import { BillingComponent } from './billing/billing.component';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    NgbNavModule,
    EventComponent,
    ReceiptComponent,
    SerialComponent,
    AttachmentComponent,
    CrashKitComponent,
    QirComponent,
    WorkOrderComponent,
    NgbDropdownModule,
    BillingComponent
  ],
  selector: 'app-ticket-overview',
  templateUrl: './ticket-overview.component.html',
  styleUrls: []
})
export class TicketOverviewComponent implements OnInit {

  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    public workOrderService: WorkOrderService,
    public schedulerService: SchedulerService,
    private jobModalEditService: JobModalService

  ) {
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

  @Input({ required: false }) onNavChange: Function = ($event) => { };

  @Output() setOnSelect: EventEmitter<any> = new EventEmitter();

  title = "Ticket Overview"

  icon = "mdi-rhombus-split";

  @Input() goBackUrl: string;

  @Input() id = null;

  ticketInfo: any;

  schedulerInfo: any;

  @Input() active = 1

  @Input() isLoading = false;


  viewJobInfo() {
    let modalRef = this.jobModalEditService.open(this.id)
    modalRef.result.then((result: any) => {
    }, () => {
    });
  }

  getData = async () => {
    try {
      this.isLoading = true;
      this.schedulerInfo = await this.schedulerService.getById(this.id)

      this.ticketInfo = await this.workOrderService.findOne({ fs_scheduler_id: this.id });

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;

    }
  }

  onSelect($event) {
    this.setOnSelect.emit($event)
  }

  onSelectConnectingJob($event) {
    this.id = $event.workOrderTicketId
    this.router.navigate([], { relativeTo: this.activatedRoute, queryParamsHandling: 'merge', queryParams: { id: $event.fsId, workOrderId: this.id } });
    this.getData()
  }



  @Input() goBack: Function = () => {
    if (this.goBackUrl) {
      this.router.navigate([this.goBackUrl], { queryParamsHandling: 'merge' });
    } else {
      this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge', queryParams: { active: null } });
    }
  }

  @Input() showJob: Function = () => {
    if (this.goBackUrl) {
      this.router.navigate([this.goBackUrl], { queryParamsHandling: 'merge', queryParams: { active: null } });
    } else {
      this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge', queryParams: { active: null } });
    }
  }


  connectingJobs: any = []
  async getConnectingJobs() {
    this.connectingJobs = await this.schedulerService.getConnectingJobs(this.schedulerInfo.group_id);
  }

}
