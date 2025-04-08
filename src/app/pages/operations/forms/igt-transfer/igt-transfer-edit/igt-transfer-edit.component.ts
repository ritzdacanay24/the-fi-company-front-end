import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { IgtTransferFormComponent } from "../igt-transfer-form/igt-transfer-form.component";
import { NAVIGATION_ROUTE } from "../igt-transfer-constant";
import { IgtTransferService } from "@app/core/api/operations/igt-transfer/igt-transfer.service";
import moment from "moment";
import { FormArray, FormBuilder, FormGroup } from "@angular/forms";
import { AuthenticationService } from "@app/core/services/auth.service";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";

@Component({
  standalone: true,
  imports: [SharedModule, IgtTransferFormComponent],
  selector: "app-igt-transfer-edit",
  templateUrl: "./igt-transfer-edit.component.html",
})
export class IgtTransferEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: IgtTransferService,
    private toastrService: ToastrService,
    private fb: FormBuilder,
    private authenticationService: AuthenticationService
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  title = "Edit";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  data: any;

  details: FormArray;

  onPrint() {

    setTimeout(() => {
      var printContents = document.getElementById("print").innerHTML;
      var popupWin = window.open("", "_blank", "width=1000,height=600");
      popupWin.document.open();

      popupWin.document.write(`
        <html>
          <head>
            <title>IGT Transfer</title>
            <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
            <style>
            @page {
              size: landscape;
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

  }

  header!: any
  async getData() {
    try {
      this.details?.clear();
      this.form?.reset();

      this.isLoading = true;
      let data: any = this.header = await this.api.getHeader(this.id);
      this.data = await this.api.find({ igt_transfer_ID: data.id });

      if (this.data) {
        this.details = this.form.get("details") as FormArray;
        for (let i = 0; i < this.data.length; i++) {
          let row = this.data[i];
          this.details.push(this.fb.group(row));
        }
      }

      this.form.patchValue({ main: data }, { emitEvent: false });

      this.form.disable();

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    try {
      this.isLoading = true;
      await this.api.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success("Successfully Updated");
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }

  async onSend() {
    if (this.form.value.main.email_sent_datetime) {
      if (
        !confirm(
          `You sent an email on ${this.form.value.main.email_sent_datetime}. Would you like to send again?`
        )
      )
        return;
    }

    try {
      SweetAlert.loading();

      this.form.patchValue(
        {
          main: {
            email_sent_datetime: moment().format("YYYY-MM-DD HH:mm:ss"),
            email_sent_created_by_name:
              this.authenticationService.currentUserValue.full_name,
          },
        },
        { emitEvent: false }
      );

      await this.api.automatedIGTTransfer(this.id, {
        ...this.form.value,
        printedName: this.authenticationService.currentUserValue.full_name,
      });
      SweetAlert.fire({ text: "Email sent." });
    } catch (err) {
      SweetAlert.close();
    }
  }
}
