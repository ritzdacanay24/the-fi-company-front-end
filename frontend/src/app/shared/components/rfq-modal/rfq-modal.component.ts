import { Component, Input } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";

import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import {
  RfqFormComponent,
  onFormatDataBeforeEmail,
} from "@app/pages/operations/forms/rfq/rfq-form/rfq-form.component";
import { RfqService } from "@app/core/api/rfq/rfq-service";
import { first } from "rxjs";
import { FormArray, FormBuilder, Validators } from "@angular/forms";
import { AuthenticationService } from "@app/core/services/auth.service";
import moment from "moment";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { ToastrService } from "ngx-toastr";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";

@Injectable({
  providedIn: "root",
})
export class RfqModalService {
  modalRef: any;

  constructor(public modalService: NgbModal) {}

  open(so: string, line) {
    this.modalRef = this.modalService.open(RfqModalComponent, {
      size: "lg",
      fullscreen: false,
      backdrop: "static",
      scrollable: true,
      centered: true,
      keyboard: false,
    });
    this.modalRef.componentInstance.so = so;
    this.modalRef.componentInstance.line = line;
    return this.modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, RfqFormComponent],
  selector: "app-rfq-modal",
  templateUrl: `./rfq-modal.component.html`,
  styleUrls: [],
})
export class RfqModalComponent {
  constructor(
    private api: RfqService,
    private ngbActiveModal: NgbActiveModal,
    private fb: FormBuilder,
    private authenticationService: AuthenticationService,
    private toastrService: ToastrService
  ) {}

  @Input() public so: string = "";
  @Input() public line: string = "";

  data: any;
  isLoading = true;

  form: any;
  lines: FormArray;
  getData = () => {
    this.isLoading = true;
    this.api
      .searchBySoAndSoLine(this.so, this.line)
      .pipe(first())
      .subscribe(
        (data) => {
          this.isLoading = false;
          /**
           * Patch values
           */
          this.form.patchValue(data.main);

          /**
           * Patch line details
           */
          this.lines = this.form.get("lines") as FormArray;
          let openBalance = 0;
          for (let i = 0; i < data.otherLines.length; i++) {
            openBalance +=
              data.otherLines[i].sod_list_pr * data.otherLines[i].qty_open;
            this.lines.push(
              this.fb.group({
                sod_part: [data.otherLines[i].sod_part, Validators.required],
                open_balance: [openBalance],
                sod_list_pr: [
                  data.otherLines[i].sod_price,
                  Validators.required,
                ],
                qty: [data.otherLines[i].qty_open, Validators.required],
                addItemsList: [data.otherLines[i].qty_open > 0 ? true : false],
              })
            );
          }

          /**
           * Set default subject line
           * If pu number or dest company changes, call this to update the subject line
           */
          this.setSubjectLine();

          /**
           * Calculate declared value
           */
          this.calculateValue();
        },
        (error) => {}
      );
  };
  ngOnInit() {
    this.getData();
  }

  dismiss() {
    this.ngbActiveModal.dismiss("dismiss");
  }

  close() {
    this.ngbActiveModal.close();
  }

  /**
   * Calculate declared value and set form value
   */
  public calculateValue() {
    let declaredValue = 0;
    let lines = this.form.get("lines").value;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].addItemsList == true) {
        declaredValue += lines[i].sod_list_pr * lines[i].qty;
      }
    }
    this.setValue("value", declaredValue);
  }

  public setSubjectLine() {
    this.setValue(
      "subjectLine",
      `PICK UP: ${this.form.value.sod_nbr || ""} ${
        this.form.value.dest_companyName || ""
      }`
    );
    this.setValue("puNumber", `${this.form.value.sod_nbr || ""}`);
  }

  public setValue(column, value) {
    this.form.controls[column].setValue(value, { emitEvent: false });
  }

  setFormEmitter($event) {
    this.form = $event;
    this.form.patchValue(
      {
        created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
        created_by: this.authenticationService.currentUserValue.id,
      },
      { emitEvent: false }
    );
  }

  submitted = false;

  async onSubmit() {
    this.submitted = true;
    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    let data = this.form.value;

    for (const property in data) {
      if (Array.isArray(data[property])) {
        data[property] = JSON.stringify(data[property]);
      } else if (
        typeof data[property] === "object" &&
        data[property] !== null
      ) {
        data[property] = JSON.stringify(data[property]);
      }
    }

    SweetAlert.fire({
      title: "Are you sure you want to send email?",
      text: "Email will be sent to " + data["emailToSendTo"].toString(),
      showDenyButton: false,
      showCancelButton: true,
      confirmButtonText: `Send Email`,
    }).then(async (result) => {
      /* Read more about isConfirmed, isDenied below */
      if (result.isConfirmed) {
        let insertId;

        try {
          this.isLoading = true;
          let res = await this.api.create(data);
          insertId = res.insertId;
        } catch (err) {
          this.isLoading = false;
        }

        if (insertId) {
          try {
            let params = onFormatDataBeforeEmail(this.form.value);

            let res: any = await this.api.sendEmail(insertId, params);

            if (res?.message) {
              this.toastrService.error(
                "Record created however, we were unable to send the email. Email Access denied"
              );
            } else {
              this.toastrService.success(
                "Record created and email sent successfully",
                "Successful"
              );
            }

            this.close();
          } catch (err) {
            this.isLoading = false;
          }
        }
      }
    });
  }
}
