import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  SimpleChanges,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { TripDetailService } from "@app/core/api/field-service/trip-detail/trip-detail.service";
import { SortBydatePipe } from "@app/shared/pipes/sort-by-date.pipe";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule, SortBydatePipe],
  selector: "app-trip-details-summary",
  templateUrl: "./trip-details-summary.component.html",
  styleUrls: ["./trip-details-summary.component.scss"],
})
export class TripDetailsSummaryComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private api: TripDetailService
  ) {}

  ngOnInit(): void {
    this.setDatData.emit(this.getData);
  }

  title = "Trip Details Summary";

  ngOnChanges(changes: SimpleChanges) {
    console.log(changes)
    if (
      changes["fsId"]?.currentValue &&
      changes["fsId"]?.previousValue == null
    ) {
      this.getData();
    }
  }

  @Output() setDatData: EventEmitter<any> = new EventEmitter();

  scroll(id) {
    let el = document.getElementById("test-" + id);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  @Input() fsId: string;
  @Input() fontSizeClass: string = "";
  @Input() summaryUpdated: boolean;
  @Input() id: string;
  @Input() viewTripDetailById: Function;
  @Input() add: Function;
  @Input() disableAddEdit = false;
  @Input() useTravelId = false;

  data: any;

  getData = async () => {
    try {
      if (this.useTravelId) {
        this.data = await this.api.findByGroupFsId(this.fsId);
        setTimeout(() => {
          this.scroll(this.id);
        }, null);
      } else {
        this.data = await this.api.findByFsId(this.fsId);
        setTimeout(() => {
          this.scroll(this.id);
        }, null);
      }
    } catch (err) {}
  };
}
