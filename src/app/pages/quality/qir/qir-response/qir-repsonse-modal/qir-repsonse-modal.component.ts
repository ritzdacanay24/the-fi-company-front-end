import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FormGroup } from "@angular/forms";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";

import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { QirResponseFormComponent } from "../qir-response-form/qir-response-form.component";
import { QirResponseService } from "@app/core/api/quality/qir-response.service";
import { AuthenticationService } from "@app/core/services/auth.service";
import moment from "moment";

@Injectable({
  providedIn: "root",
})
export class QirResponseModalService {
  constructor(public modalService: NgbModal) {}

  open(id) {
    let modalRef = this.modalService.open(QirResponseModalComponent, {
      size: "lg",
    });
    modalRef.componentInstance.id = id;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, QirResponseFormComponent],
  selector: "app-qir-response-modal",
  templateUrl: "./qir-repsonse-modal.component.html",
  styleUrls: [],
})
export class QirResponseModalComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
    private api: QirResponseService,
    private authenticationService: AuthenticationService
  ) {}

  ngOnInit(): void {}

  setFormElements = ($event) => {
    this.form = $event;
    this.form.patchValue({ qir_number: this.id });
    if (this.id) {
      this.getData();
    }
  };

  @Input() id = null;

  title = "Job Modal";

  icon = "mdi-calendar-text";

  form: FormGroup;

  dismiss() {
    this.ngbActiveModal.dismiss();
  }

  close() {
    this.ngbActiveModal.close();
  }

  submitted = false;

  qir_response_id;

  async getData() {
    try {
      let data: any = await this.api.findOne({ qir_number: this.id });
      this.qir_response_id = data.id;
      if (!data) {
        this.form.patchValue({
          created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
        });
      } else {
        this.form.patchValue(data);
      }
    } catch (err) {}
  }

  async onSubmit() {
    if (this.qir_response_id) {
      this.update();
    } else {
      this.create();
    }
  }

  async update() {
    try {
      await this.api.update(this.qir_response_id, this.form.value);
      this.close();
    } catch (err) {}
  }
  async create() {
    try {
      await this.api.create(this.form.value);
      this.close();
    } catch (err) {}
  }
}
