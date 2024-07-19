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

@Injectable({
  providedIn: "root",
})
export class TripDetailsModalService {
  constructor(public modalService: NgbModal) {}

  open(id) {
    let modalRef = this.modalService.open(TripDetailsModalComponent, {
      size: "lg",
    });
    modalRef.componentInstance.id = id;
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
    private api: TripDetailService
  ) {}

  ngOnInit(): void {
    if (this.id) this.getData();
  }

  setFormElements = ($event) => {
    this.form = $event;
  };

  @Input() id = null;

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
    try {
      this.submitted = true;
      let d = {
        ...this.form.value,
        ...this.form.value.address,
      };

      try {
        await this.api.update(this.id, d);
      } catch (err) {}
      this.close();
    } catch (err) {}
  }
}
