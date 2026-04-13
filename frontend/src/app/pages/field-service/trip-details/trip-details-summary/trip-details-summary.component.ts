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

  // Add trip type configuration with better icons and colors
  getTripConfig(tripType: string) {
    const configs = {
      flight: {
        icon: "mdi mdi-airplane-takeoff",
        color: "primary",
        bgClass: "bg-primary",
        label: "Flight",
        description: "Air Travel",
      },
      rental_car: {
        icon: "mdi mdi-car-hatchback",
        color: "success",
        bgClass: "bg-success",
        label: "Rental Car",
        description: "Ground Transportation",
      },
      hotel: {
        icon: "mdi mdi-bed-outline",
        color: "info",
        bgClass: "bg-info",
        label: "Hotel",
        description: "Accommodation",
      },
      equipment: {
        icon: "mdi mdi-tools",
        color: "warning",
        bgClass: "bg-warning",
        label: "Equipment",
        description: "Equipment Rental",
      },
      meal: {
        icon: "mdi mdi-food-fork-drink",
        color: "secondary",
        bgClass: "bg-secondary",
        label: "Meals",
        description: "Food & Dining",
      },
      transportation: {
        icon: "mdi mdi-bus",
        color: "dark",
        bgClass: "bg-dark",
        label: "Transport",
        description: "Public Transportation",
      },
    };

    return configs[tripType] || {
      icon: "mdi mdi-map-marker",
      color: "secondary",
      bgClass: "bg-secondary",
      label: "Other",
      description: "Misc Travel",
    };
  }

  // Add method to calculate trip duration
  getTripDuration(startDate: string, endDate: string): string {
    if (!startDate || !endDate) return "";

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "1 day";
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks`;
    return `${Math.ceil(diffDays / 30)} months`;
  }

  // Add method to get trip status
  getTripStatus(trip: any): {
    status: string;
    class: string;
    icon: string;
  } {
    if (trip.email_sent) {
      return {
        status: "Confirmed",
        class: "success",
        icon: "mdi mdi-check-circle",
      };
    } else if (trip.confirmation) {
      return {
        status: "Booked",
        class: "warning",
        icon: "mdi mdi-clock-outline",
      };
    } else {
      return {
        status: "Pending",
        class: "danger",
        icon: "mdi mdi-alert-circle",
      };
    }
  }
}
