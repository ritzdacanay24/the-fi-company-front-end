import { Component, Input, OnInit } from "@angular/core";
import { FormGroup } from "@angular/forms";
import {
  NgbActiveModal,
} from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { TripDetailsFormComponent } from "../trip-details-form/trip-details-form.component";
import { TripDetailService } from "@app/core/api/field-service/trip-detail/trip-detail.service";
import { ToastrService } from "ngx-toastr";
import { TripDetailHeaderService } from "@app/core/api/field-service/trip-detail-header/trip-detail-header.service";
import { FeatureType } from "@app/shared/enums/feature.enum";

@Injectable({
  providedIn: "root",
})
export class TripDetailsModalService {
  constructor(public modalService: NgbModal) {}

  open({
    id: id,
    fs_travel_header_id: fs_travel_header_id,
    fsId: fsId,
  }: {
    id?: any;
    fs_travel_header_id?: any;
    fsId?: any;
  }) {
    let modalRef = this.modalService.open(TripDetailsModalComponent, {
      size: "lg",
    });
    modalRef.componentInstance.id = id;
    modalRef.componentInstance.fs_travel_header_id = fs_travel_header_id;
    modalRef.componentInstance.fsId = fsId;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [
    SharedModule,
    TripDetailsFormComponent,
  ],
  selector: "app-trip-details-modal",
  templateUrl: "./trip-details-modal.component.html",
})
export class TripDetailsModalComponent implements OnInit {
  constructor(
    private ngbActiveModal: NgbActiveModal,
    private api: TripDetailService,
    private tripDetailHeaderService: TripDetailHeaderService,
    private toastrService: ToastrService,
  ) {}

  ngOnInit(): void {
    if (this.id) {
      this.getData();
    }
  }

  readonly FeatureType = FeatureType;

  setFormElements = ($event) => {
    this.form = $event;

    if (this.fs_travel_header_id && !this.id) {
      this.form.patchValue({
        fs_travel_header_id: this.fs_travel_header_id,
      });
    }

    if (this.fsId && !this.id) {
      this.form.patchValue({
        fsId: this.fsId,
      });
    }
  };

  @Input() id = null;
  @Input() fs_travel_header_id = null;
  @Input() fsId = null;

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
        this.fs_travel_header_id
      );

      this.group_details.fsId = this.group_details.fsId?.split(",");
    } catch (err) {}
  }

  async getData() {
    try {
      let data = await this.api.getById(this.id);
      this.form.patchValue(data);
    } catch (err) {}
  }

  async onSubmit() {
    const fsId = Number(this.form?.value?.fsId || 0);
    if (Number.isInteger(fsId) && fsId > 0) {
      try {
        let data = await this.tripDetailHeaderService.multipleGroups(fsId);

        if (data) {
          alert("This FSID cannot be in two different groups. ");
          return;
        }
      } catch (err) {}
    }

    if (this.id) {
      this.update();
    } else {
      this.create();
    }
  }

  async create() {
    try {
      await this.api.create(this.form.value);

      this.toastrService.success("Successfully Created");
      this.close();
    } catch (err) {}
  }

  async update() {
    try {
      await this.api.update(this.id, this.form.value);

      this.toastrService.success("Updated successfully");
      this.close();
    } catch (err) {}
  }

  async onDelete() {
    try {
      await this.api.delete(this.id);
      this.toastrService.success("Deleted successfully");
      this.close();
    } catch (err) {}
  }

}
