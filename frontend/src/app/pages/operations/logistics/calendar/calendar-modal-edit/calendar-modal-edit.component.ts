import { Component, Input, OnInit } from "@angular/core";
import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { first } from "rxjs/operators";
import { FormGroup } from "@angular/forms";
import moment from "moment";
import { ReceivingService } from "@app/core/api/receiving/receiving.service";
import { Injectable } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ToastrService } from "ngx-toastr";
import { CalendarFormComponent } from "../calendar-form/calendar-form.component";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";

@Injectable({
  providedIn: "root",
})
export class CalendarModalEditService {
  constructor(public modalService: NgbModal) {}

  open(id?: number | string, date?) {
    let modalRef = this.modalService.open(CalendarModalEditComponent, {
      size: "lg",
    });
    modalRef.componentInstance.id = id;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, CalendarFormComponent],
  selector: "app-calendar-modal-edit",
  templateUrl: `./calendar-modal-edit.component.html`,
})
export class CalendarModalEditComponent implements OnInit {
  @Input() public id: any;

  loadingIndicator: boolean;
  currentUserInfo: any;

  view(row) {
    window.open(
      `https://dashboard.eye-fi.com/attachments/receiving/${row.fileName}`,
      "",
      "width=600,height=400,left=200,top=200"
    );
  }

  setFormEmitter($event) {
    this.form = $event;
    this.form.patchValue(this.data);
  }

  async removeAttachment(id, index) {
    if (!confirm("Are you sure you want to remove attachment?")) return;
    await this.api.deleteAttachment(id);
    this.attachments.splice(index, 1);
  }

  file: File = null;
  attachments: any = [];

  onFilechange(event: any) {
    this.file = event.target.files[0];
  }

  async upload() {
    if (this.file) {
      await this.api.uploadfile(this.id, this.file);
      this.toastrService.success("File upldated");
      this.attachments = await this.api.getAttachment(this.id);
    } else {
      this.toastrService.error("Please select file.");
    }
  }

  form: FormGroup;
  submitted: boolean;

  constructor(
    private ngbActiveModal: NgbActiveModal,
    private api: ReceivingService,
    private toastrService: ToastrService
  ) {}

  onPrint() {
    this.api
      .update(this.id, this.form.value)
      .pipe(first())
      .subscribe(
        (data) => {
          setTimeout(() => {
            var printContents = document.getElementById("print").innerHTML;
            var popupWin = window.open("", "_blank", "width=1000,height=600");
            popupWin.document.open();

            popupWin.document.write(`
          <html>
            <head>
              <title>Logistics Calendar</title>
              <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
              <style>
              @page {
                size: portrait;
                padding: 5 !important;
              }
              </style>
            </head>
            <body onload="window.print();window.close()">${printContents}</body>
          </html>`);

            popupWin.document.close();

            popupWin.onfocus = function () {
              setTimeout(function () {
                popupWin.focus();
                popupWin.document.close();
              }, 300);
            };
          }, 200);
        },
        () => (this.loadingIndicator = false)
      );
  }

  ngOnInit(): void {
    if (this.id) this.getData();
  }

  dismiss() {
    this.ngbActiveModal.dismiss();
  }

  data: any;
  async getData() {
    this.loadingIndicator = true;
    let data = await this.api.getById(this.id);
    this.form.patchValue(data);
    this.attachments = await this.api.getAttachment(this.id);
    this.loadingIndicator = false;
  }

  get f() {
    return this.form.controls;
  }

  onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    if (this.id) {
      this.update();
    }
  }

  onDelete() {
    if (!confirm("Are you sure you want to delete")) return;
    this.delete();
  }

  onReceived() {
    if (!confirm("Are you sure?")) return;

    this.form.value.status =
      this.form.value.status == "Open" ? "Completed" : "Open";

    this.update();
  }

  delete() {
    this.api
      .delete(this.id)
      .pipe(first())
      .subscribe(
        (data) => {
          this.ngbActiveModal.close({ transaction: "DELETE" });
          this.loadingIndicator = false;
        },
        () => (this.loadingIndicator = false)
      );
  }

  update() {
    this.form.value.start_date = moment(this.form.value.start_date).format(
      "YYYY-MM-DD"
    );
    this.form.value.end_date = moment(this.form.value.end_date).format(
      "YYYY-MM-DD"
    );
    this.api
      .update(this.id, this.form.value)
      .pipe(first())
      .subscribe(
        (data) => {
          this.ngbActiveModal.close({ transaction: "UPDATE" });
          this.loadingIndicator = false;
        },
        () => (this.loadingIndicator = false)
      );
  }
}
