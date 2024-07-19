import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NgbScrollSpyModule } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { FormGroup, UntypedFormBuilder } from "@angular/forms";
import { AuthenticationService } from "@app/core/services/auth.service";
import { AddressSearchComponent } from "@app/shared/components/address-search/address-search.component";
import { states } from "@app/core/data/states";
import { AutosizeModule } from "ngx-autosize";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    NgbScrollSpyModule,
    AddressSearchComponent,
    AutosizeModule,
  ],
  selector: "app-trip-details-form",
  templateUrl: "./trip-details-form.component.html",
  styleUrls: [],
})
export class TripDetailsFormComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    public authenticationService: AuthenticationService,
    private formBuilder: UntypedFormBuilder
  ) {}

  getTripSelection($event) {
    for (let i = 0; i < this.trip_selection_options.length; i++) {
      if ($event == this.trip_selection_options[i].value) {
        this.form.patchValue({
          type_of_travel: $event,
          location_name: this.trip_selection_options[i].location_name,
          start_datetime_name:
            this.trip_selection_options[i].start_datetime_name,
          end_datetime_name: this.trip_selection_options[i].end_datetime_name,
        });
        break;
      }
    }
  }

  trip_selection_options = [
    {
      name: "Rental Car",
      value: "rental_car",
      start_datetime_name: "Pick Up Date/Time",
      end_datetime_name: "Drop Off Date/Time",
      location_name: "Pick Up Location",
    },
    {
      name: "Equipment",
      value: "equipment",
      start_datetime_name: "Drop off Date/Time",
      end_datetime_name: "Pick up Date/Time",
      location_name: "Vendor",
    },
    {
      name: "Hotel",
      value: "hotel",
      start_datetime_name: "Check In Date/Time",
      end_datetime_name: "Check Out Date/Time",
      location_name: "Hotel Location",
    },
    {
      name: "Flight",
      value: "flight",
      start_datetime_name: "Flight Out Date/Time",
      end_datetime_name: "Flight In Date/Time",
      location_name: "Flight Out Location",
    },
  ];

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  ngOnInit(): void {
    this.form = this.formBuilder.group(
      {
        start_datetime: "",
        end_datetime: "",
        start_datetime_name: "",
        end_datetime_name: "",
        confirmation: "",
        type_of_travel: null,
        rental_car_driver: "",
        flight_out: "",
        flight_in: "",
        location_name: "",
        airline_name: "",
        notes: "",
        fsId: null,
        fs_travel_det_group: null,
        address: this.formBuilder.group({
          address_name: "",
          address: "",
          address1: "",
          state: "",
          zip_code: "",
          city: "",
        }),
      },
      { emitEvent: false }
    );

    this.setFormEmitter.emit(this.form);
  }

  states = states;

  @Input() id: any;
  @Input() fsid: any;
  @Input() submitted: boolean;

  trip_selection = "";

  onTripSelection() {
    this.form.get(this.trip_selection).enable();
  }

  setFormElements = async ($event: any) => {
    this.form = $event;
  };

  title = "Trip Details Form";

  icon = "mdi-calendar-text";

  form: FormGroup;

  addTag = ($event) => {
    this.form.patchValue({
      address: {
        address_name: $event,
      },
    });

    return true;
  };

  notifyParent($event) {
    this.form.patchValue({
      address: {
        address: $event?.fullStreetName,
        city: $event?.address?.localName,
        state: $event?.address?.countrySubdivisionCode || null,
        zip_code: $event?.address?.postalCode,
        address_name: $event?.poi?.name || $event?.address?.streetName,
      },
    });
  }
}
