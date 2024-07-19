import { Component, Input, OnInit, SimpleChanges } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { TripDetailService } from "@app/core/api/field-service/trip-detail/trip-detail.service";
import { SortBydatePipe } from "@app/shared/pipes/sort-by-date.pipe";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule, SortBydatePipe],
  selector: "app-trip-details-summary",
  templateUrl: "./trip-details-summary.component.html",
  styleUrls: [],
})
export class TripDetailsSummaryComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private api: TripDetailService
  ) {}

  ngOnInit(): void {}

  title = "Trip Details Summary";

  icon = "mdi mdi-note-plus-outline";

  ngOnChanges(changes: SimpleChanges) {
    if (changes["fsId"]?.currentValue) {
      this.getData();
    }
    if (changes["summaryUpdated"]?.currentValue) {
      this.getData();
    }
  }

  scroll(id) {
    let el = document.getElementById("test-" + id);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  @Input() fsId: string;
  @Input() summaryUpdated: boolean;
  @Input() id: string;
  @Input() viewTripDetailById: Function;

  data;

  async getData() {
    try {
      this.data = [];
      this.data = await this.api.findByGroupFsId(this.fsId);
      this.summaryUpdated = false;
      setTimeout(() => {
        this.scroll(this.id);
      }, null);
    } catch (err) {}
  }
}
