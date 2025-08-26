import { Component, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
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
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { JobEditComponent } from '@app/pages/field-service/ticket/ticket-overview/job-edit/job-edit.component';
import { JobConnectionService } from '@app/core/api/field-service/job-connection.service';

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
    BillingComponent,
    JobEditComponent
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
    private jobModalEditService: JobModalService,
    private jobConnectionService: JobConnectionService // <-- Inject the new service
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.goBackUrl = params['goBackUrl'];
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['id']) {
      this.id = changes['id'].currentValue;
      this.getData();
    }
    if (changes['active']) {
      this.active = changes['active'].currentValue;
    }
  }

  @Input({ required: false }) onNavChange: Function = ($event) => {};

  @Output() setOnSelect: EventEmitter<any> = new EventEmitter();

  title = 'Ticket Overview';

  icon = 'mdi-rhombus-split';

  @Input() goBackUrl: string;

  @Input() id = null;

  ticketInfo: any;

  schedulerInfo: any;

  @Input() active = 1;

  @Input() isLoading = false;

  @ViewChild('navScrollContainer', { static: false }) navScrollContainer: ElementRef;
  canScrollLeft = false;
  canScrollRight = false;

  viewJobInfo() {
    let modalRef = this.jobModalEditService.open(this.id);
    modalRef.result.then(
      (result: any) => {},
      () => {}
    );
  }

  getData = async () => {
    try {
      this.isLoading = true;
      this.schedulerInfo = await this.schedulerService.getById(this.id);

      this.ticketInfo = await this.workOrderService.findOne({ fs_scheduler_id: this.id });
      this.getConnectingJobs();
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  };

  onSelect($event) {
    this.setOnSelect.emit($event);
  }

  onSelectConnectingJob($event) {
    this.id = $event.workOrderTicketId;
    this.router.navigate([], { relativeTo: this.activatedRoute, queryParamsHandling: 'merge', queryParams: { id: $event.fsId, workOrderId: this.id } });
    this.getData();
  }

  ngAfterViewInit() {
    // Check scroll status after view init
    setTimeout(() => {
      this.checkScrollButtons();
    }, 100);

    // Listen for window resize to update scroll buttons
    fromEvent(window, 'resize')
      .pipe(debounceTime(100))
      .subscribe(() => {
        this.checkScrollButtons();
      });
  }

  onNavScroll(event: any) {
    this.checkScrollButtons();
  }

  checkScrollButtons() {
    if (!this.navScrollContainer) return;

    const container = this.navScrollContainer.nativeElement;
    this.canScrollLeft = container.scrollLeft > 0;
    this.canScrollRight = container.scrollLeft < container.scrollWidth - container.clientWidth;
  }

  scrollNavLeft() {
    if (!this.navScrollContainer) return;

    const container = this.navScrollContainer.nativeElement;
    const scrollAmount = 200; // Adjust scroll distance as needed
    container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  }

  scrollNavRight() {
    if (!this.navScrollContainer) return;

    const container = this.navScrollContainer.nativeElement;
    const scrollAmount = 200; // Adjust scroll distance as needed
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }

  @Input() goBack: Function = () => {
    if (this.goBackUrl) {
      this.router.navigate([this.goBackUrl], { queryParamsHandling: 'merge' });
    } else {
      this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge', queryParams: { active: null } });
    }
  };

  @Input() showJob: Function = () => {
    if (this.goBackUrl) {
      this.router.navigate([this.goBackUrl], { queryParamsHandling: 'merge', queryParams: { active: null } });
    } else {
      this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge', queryParams: { active: null } });
    }
  };

  connectingJobs: any = [];
  async getConnectingJobs() {
    if (!this.schedulerInfo?.fs_scheduler_id && !this.id) return;
    // Use the new JobConnectionService to get connections for this job
    this.connectingJobs = await this.jobConnectionService.getJobConnections(this.schedulerInfo?.fs_scheduler_id || this.id);
  }
}
