import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  SimpleChanges,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { NgbNavModule } from "@ng-bootstrap/ng-bootstrap";
import { NcrFormComponent } from "../../ncr-form/ncr-form.component";
import { FormGroup } from "@angular/forms";
import { NcrService } from "@app/core/api/quality/ncr-service";
import { ToastrService } from "ngx-toastr";
import { AuthenticationService } from "@app/core/services/auth.service";
import moment from "moment";

export const ncr_types: any[] = [
  "Internal",
  "Supplier",
  "Customer Return",
  "Internal Audit",
  "Customer Complaint",
];
export const cont_types: any[] = [
  "Rework",
  "RTV",
  "UAI",
  "MRB",
  "Scrap",
  "Others",
];

@Component({
  standalone: true,
  imports: [SharedModule, NgbNavModule, NcrFormComponent],
  selector: "app-ncr-main",
  templateUrl: "./ncr-main.component.html",
  styleUrls: [],
})
export class NcrMainComponent implements OnInit {
  currentUserId;
  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    public ncrService: NcrService,
    private api: NcrService,
    private toastrService: ToastrService,
    public authenticationService: AuthenticationService
  ) {
    this.currentUserId = this.authenticationService.currentUserValue;
  }

  ngOnInit(): void {}

  @Output() setFormEmitterParent: EventEmitter<any> = new EventEmitter();

  setFormEmitter($event) {
    this.form = $event;
    this.setFormEmitterParent.emit(this.form);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["id"]) {
      this.id = changes["id"].currentValue;
      this.getData();
    }
  }

  @Input() id = null;

  isLoading = false;

  title = "NCR Info";

  form: FormGroup;

  submitted = false;

  async convertToString() {
    this.form.value.ncr_type = this.form.value.ncr_type
      .map((checked, i) => (checked ? ncr_types[i] : null))
      .filter((v) => v !== null)
      .toString();

    this.form.value.cont_type = this.form.value.cont_type
      .map((checked, i) => (checked ? cont_types[i] : null))
      .filter((v) => v !== null)
      .toString();
  }

  onDownloadAsPdf() {
    if (this.form.dirty) {
      alert("Please save before downloading as PDF");
      return;
    }

    setTimeout(function () {
      var printContents = document.getElementById("content").innerHTML;
      var popupWin = window.open("", "_blank", "width=1000,height=600");
      popupWin.document.open();
      popupWin.document.write(`
      <html>
        <head>
          <title>Work Order Info</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">

          <style>
            @page {
              size: portrait;
            }
            @media print {
              .bg-grey {
                background-color: lightgrey !important;
              }
              .pagebreak { page-break-before: always; } /* page-break-after works, as well */

              .table  td {
                font-size:11px
              }

              td:empty::after {
                content: ".";
                visibility:hidden;
              }
            }

          </style>
        </head>
        <body onload="window.print();window.close()">
          ${printContents}
        </body>
      </html>`);
      popupWin.document.close();
      popupWin.onload = function () {
        popupWin.print();
        popupWin.close();
      };
    }, 0);
  }

  async onSubmit() {
    this.convertToString();
    try {
      this.isLoading = true;
      await this.api.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success("Successfully Updated");
      this.form.markAsPristine();
    } catch (err) {
      this.isLoading = false;
    }
  }

  async onSubmitAndClose() {
    if (this.form.value?.submitted_date) {
      alert("This CAR is already closed.");
      return;
    }

    if (
      this.form.value?.ca_action_req == "Yes" &&
      (this.form.value?.verify_of_ca_dt == null ||
        this.form.value?.verify_of_ca_dt == "")
    ) {
      alert(
        "Unable to close CAR. Corrective action is marked as required and must be validated by the Quality Team."
      );
      return;
    }

    this.convertToString();
    try {
      this.isLoading = true;
      await this.api.update(this.id, {
        ...this.form.value,
        submitted_date: moment().format("YYYY-MM-DD HH:mm:ss"),
      });
      this.isLoading = false;
      this.toastrService.success("Successfully Updated");
      this.form.markAsPristine();
      this.form.disable();
    } catch (err) {
      this.isLoading = false;
    }
  }

  data;

  async getData() {
    let data = (this.data = await this.ncrService.getById(this.id));

    data.ncr_type = data.ncr_type.split(",");
    data.cont_type = data.cont_type.split(",");

    this.form.patchValue(data);

    this.form.get("ncr_type").patchValue(
      ncr_types.map((x) => {
        return this.form.value.ncr_type.indexOf(x) > -1;
      })
    );

    this.form.get("cont_type").patchValue(
      cont_types.map((x) => {
        return this.form.value.cont_type.indexOf(x) > -1;
      })
    );

    if (data.submitted_date) {
      this.form.disable();
    }

    // if (this.form?.value?.created_by != this.currentUserId.id && this.currentUserId.isAdmin == 0) {
    //   this.form.disable()
    // }
  }
}
