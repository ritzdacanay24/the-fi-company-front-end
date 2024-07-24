import { Component, Input } from "@angular/core";
import { FormArray, FormGroup } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { TripDetailsFormComponent } from "../trip-details-form/trip-details-form.component";
import { TripDetailService } from "@app/core/api/field-service/trip-detail/trip-detail.service";
import { NAVIGATION_ROUTE } from "../trip-details-constant";
import { TripDetailsSummaryComponent } from "../trip-details-summary/trip-details-summary.component";
import { _compressToEncodedURIComponent } from "src/assets/js/util/jslzString";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import moment from "moment";
import { ToastrService } from "ngx-toastr";
import { TripDetailsModalService } from "../trip-details-modal/trip-details-modal.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    TripDetailsFormComponent,
    TripDetailsSummaryComponent,
  ],
  selector: "app-trip-summary-edit",
  templateUrl: "./trip-summary-edit.component.html",
})
export class TripSummaryEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: TripDetailService,
    private toastrService: ToastrService,
    private tripDetailsModalService: TripDetailsModalService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.group_id = params["group_id"];
    });
  }

  title = "Edit Trip Detail";

  form: FormGroup;

  group_id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  data: any;
  details: FormArray;

  viewTripDetailById = (id) => {
    this.group_id = id;

    let modalRef = this.tripDetailsModalService.open({
      id: id,
      trip_detail_group_number: this.group_id, //group ud is to show the group id number and to pull the details of the group id. 
    });
    modalRef.result.then(() => this.setDatData());
  };

  onAdd() {
    let modalRef = this.tripDetailsModalService.open({
      trip_detail_group_number: this.group_id, //group ud is to show the group id number and to pull the details of the group id. 
    });
    modalRef.result.then(() => this.setDatData());
  }

  setDatData: any;

  onCancel() {
    this.goBack();
  }
}
