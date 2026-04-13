import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from "@angular/core";
import { first } from "rxjs/operators";
import { Location } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { SchedulerService } from "@app/core/api/field-service/scheduler.service";
import { SharedModule } from "@app/shared/shared.module";
import { CORE_SETTINGS } from "@app/core/constants/app.config";
import { JobSearchComponent } from "@app/shared/components/job-search/job-search.component";
import { NAVIGATION_ROUTE } from "../../job-constant";

@Component({
  standalone: true,
  imports: [SharedModule, JobSearchComponent],
  selector: "app-job-billing",
  templateUrl: "./job-billing.component.html",
  styleUrls: ["./job-billing.component.scss"],
})
export class JobBillingComponent implements OnInit {
  @Input() public displayDates: boolean = true;
  @Input() public ticketIdFromModal: number;
  @Input() public refresh: boolean;
  @Input() public id: number;
  @Output() refreshChange = new EventEmitter();
  isLoading: boolean;
  isDarkMode: boolean;

  // ngOnChanges(changes: SimpleChanges) {
  //   // if (changes['id'].currentValue) {
  //   //   this.getData('', changes['id'].currentValue, false);
  //   // }

  // }

  @Input() goBack: Function = () => {
    this.id = null;
    this.data = null;
    if (this.goBackUrl) {
      this.router.navigate([this.goBackUrl], { queryParamsHandling: "merge" });
    } else {
      this.router.navigate([NAVIGATION_ROUTE.BILLING], {
        queryParamsHandling: "merge",
        queryParams: { id: this.id, active: 1 },
      });
    }
  };

  active;
  notifyParent($event) {
    this.id = $event.id;
    this.active = 1;
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
      queryParams: { id: this.id, active: 1 },
    });
    this.getData("", this.id, false);
  }

  data: any;
  scheduledDates: any;
  rates: any;
  mark_up_percent: any;
  dateViewing: any;
  applyovertime: any;
  img = CORE_SETTINGS.IMAGE;
  ticketId: any = "";

  constructor(
    private api: SchedulerService,
    private _location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private activatedRoute: ActivatedRoute
  ) {}

  ngAfterViewChecked() {
    //your code to update the model
    this.cdr.detectChanges();
  }

  goBackUrl;

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
      this.goBackUrl = params["goBackUrl"];
    });

    if (this.id) this.getData(null, this.id, false);
  }

  backClicked() {
    this._location.back();
  }

  public showHideOverlay(isShow) {
    return isShow;
  }
  public clearSearchAndParams() {
    this.router.navigate([`/field-service/field-service-billing`]);
    this.ticketId = null;
  }

  getData(date, ticketId, type) {
    this.isLoading = true;

    this.showHideOverlay(true);
    this.api
      .getBillinReportByDate(date, ticketId)
      .pipe(first())
      .subscribe(
        (data) => {
          this.isLoading = false;

          this.showHideOverlay(false);
          this.data = data;
        },
        (error) => {
          this.showHideOverlay(false);
          this.isLoading = false;
        }
      );
  }

  public getSum(group, details) {
    var summ = 0;
    for (var i in details) {
      if (group == "travelTimeHrs") {
        summ =
          summ +
          (Number(details[i][group]) + Number(details[i].travel_over_time_hrs));
      } else if (group == "installTimes") {
        summ =
          summ +
          (Number(details[i][group]) + Number(details[i].install_overtime_hrs));
      } else {
        summ = summ + Number(details[i][group]);
      }
    }
    return summ;
  }

  public print() {
    var printContents = document.getElementById("workOrder").innerHTML;
    var popupWin = window.open("", "_blank", "width=900,height=800");
    popupWin.document.open();
    popupWin.document.write(`
      <html>
        <head>
          <titleField service billing</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css">
          <style>
            @page {
              size: portrait;
              margin: 50px 0px !important;
            }
            @media print {
              .header-name {
                background: gray !important;
                -webkit-print-color-adjust: exact;
                color: #fff !important;
                font-size: 20px !important;
                padding: 5px !important;
                text-align: center !important
              }

              .hide-print {
                  display: none !important;
              }

              a:link {
                  text-decoration: none;
                  color: #000
              }

              td,
              th {
                  padding: 0 6px
              }

              .light-grey {
                  background-color: #E8E8E8 !important;
                  -webkit-print-color-adjust: exact;
              }

              /* The heart of the matter */
              .testimonial-group>.row {
                  overflow-x: auto;
                  white-space: nowrap;
                  display: block;
              }

              .testimonial-group>.row>.col-xs-4 {
                  display: inline-block;
                  float: none;
              }

              /* Decorations */
              .col-xs-4 {
                  color: #fff;
                  font-size: 15px;
                  padding: 3px 10px;
                  margin: 5px 1px
              }

              .col-xs-4:nth-child(1n+1) {
                  background: lightskyblue;
              }

              .totalBill {
                  padding-right: 25px !important;
                  font-size: 25px !important
              }
              @page {
                  size: a3
              }
          }
          </style>
        </head>
        <body onload="window.print();window.close()">${printContents}</body>
      </html>`);

    popupWin.document.close();
  }
}
