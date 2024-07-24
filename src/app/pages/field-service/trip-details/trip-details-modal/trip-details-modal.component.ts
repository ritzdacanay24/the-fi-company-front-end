import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FormGroup } from "@angular/forms";
import {
  NgbActiveModal,
  NgbCarouselModule,
  NgbScrollSpyModule,
} from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { TripDetailsFormComponent } from "../trip-details-form/trip-details-form.component";
import { TripDetailService } from "@app/core/api/field-service/trip-detail/trip-detail.service";
import { TripDetailsSummaryComponent } from "../trip-details-summary/trip-details-summary.component";
import { ToastrService } from "ngx-toastr";
import { TripDetailHeaderService } from "@app/core/api/field-service/trip-detail-header/trip-detail-header.service";
import { JobSearchComponent } from "@app/shared/components/job-search/job-search.component";

@Injectable({
  providedIn: "root",
})
export class TripDetailsModalService {
  constructor(public modalService: NgbModal) {}

  open({
    id: id,
    fs_travel_det_group: fs_travel_det_group,
    trip_detail_group_number: trip_detail_group_number,
  }: {
    id?: any;
    fs_travel_det_group?: any;
    trip_detail_group_number?: any;
  }) {
    let modalRef = this.modalService.open(TripDetailsModalComponent, {
      size: "lg",
    });
    modalRef.componentInstance.id = id;
    modalRef.componentInstance.fs_travel_det_group = fs_travel_det_group;
    modalRef.componentInstance.trip_detail_group_number =
      trip_detail_group_number;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [
    SharedModule,
    TripDetailsModalComponent,
    NgbScrollSpyModule,
    TripDetailsFormComponent,
    NgbCarouselModule,
    TripDetailsSummaryComponent,
    TripDetailsFormComponent,
    JobSearchComponent,
  ],
  selector: "app-trip-details-modal",
  templateUrl: "./trip-details-modal.component.html",
  styleUrls: [],
})
export class TripDetailsModalComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
    private api: TripDetailService,
    private tripDetailHeaderService: TripDetailHeaderService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    if (this.id) this.getData();
    if (this.trip_detail_group_number) this.getGroupDataInformation();
  }

  async notifyParentJob($event) {
    let ids = [];
    for (let i = 0; i < $event.length; i++) {
      if (typeof $event[i] === "object" && $event[i] !== null) {
        ids.push($event[i].id);
      } else {
        ids.push($event[i]);
      }
    }

    try {
      await this.tripDetailHeaderService.update(this.id, {
        fsId: ids?.toString(),
      });
    } catch (err) {}
  }

  setFormElements = ($event) => {
    this.form = $event;

    if (this.fs_travel_det_group && !this.id) {
      this.form.patchValue({
        fs_travel_det_group: this.fs_travel_det_group,
        trip_detail_group_number: this.trip_detail_group_number,
      });
    }
  };

  @Input() id = null;
  @Input() fs_travel_det_group = null;
  @Input() trip_detail_group_number = null;

  submitted = false;

  title = "Trip Detail Modal";

  form: FormGroup;

  dismiss() {
    this.ngbActiveModal.dismiss();
  }

  close() {
    this.ngbActiveModal.close();
  }

  group_details: any;

  async getGroupDataInformation() {
    try {
      this.group_details = await this.tripDetailHeaderService.getById(
        this.trip_detail_group_number
      );

      this.group_details.fsId = this.group_details.fsId?.split(",");

      // this.form.patchValue({ fs_travel_det_group: data.fsId?.split(",") });
    } catch (err) {}
  }

  async getData() {
    try {
      let data = await this.api.getById(this.id);
      this.form.patchValue(data);
    } catch (err) {}
  }

  async onSubmit() {
    if (this.id) {
      this.update();
    } else {
      this.create();
    }
  }

  async create() {
    try {
      await this.api.create({
        ...this.form.value,
        fs_travel_det_group: this.form.value.fs_travel_det_group?.toString(),
      });

      this.toastrService.success("Successfully Created");
      this.close();
    } catch (err) {}
  }

  async update() {
    try {
      await this.api.update(this.id, {
        ...this.form.value,
        fs_travel_det_group: this.form.value.fs_travel_det_group?.toString(),
      });

      this.toastrService.success("Updated successfully");
      this.close();
    } catch (err) {}
  }
}
