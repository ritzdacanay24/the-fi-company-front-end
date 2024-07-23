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
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    if (this.id) this.getData();
  }

  setFormElements = ($event) => {
    this.form = $event;

    if (this.fs_travel_det_group) {
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
