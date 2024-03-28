import { Component, Input } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { RfqFormComponent, onFormatDataBeforeEmail } from '../rfq-form/rfq-form.component';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NAVIGATION_ROUTE } from '../rfq-constant';
import { RfqService } from '@app/core/api/rfq/rfq-service';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';
import { isJsonString } from 'src/assets/js/util/isJsonString';
import moment from 'moment';

function _json_parse(data) {
  return JSON.parse(data);
}

@Component({
  standalone: true,
  imports: [
    SharedModule,
    RfqFormComponent
  ],
  selector: 'app-rfq-edit',
  templateUrl: './rfq-edit.component.html'
})
export class RfqEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: RfqService,
    private toastrService: ToastrService,
    private fb: FormBuilder,
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
    });

    if (this.id) this.getData();
  }

  title = "Edit";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
  }

  data: any;

  lines: FormArray;
  palletSizeInformationSendInfo: FormArray;

  async getData() {
    try {
      this.isLoading = true;
      let data = await this.api.getById(this.id);

      data.bolFaxEmail = _json_parse(data.bolFaxEmail);
      data.ccEmails = _json_parse(data.ccEmails);
      data.emailToSendTo = _json_parse(data.emailToSendTo);
      data.palletSizeInformationSendInfo = _json_parse(data.palletSizeInformationSendInfo);
      data.vendor = _json_parse(data.vendor);
      data.lines = _json_parse(data.lines);

      this.lines = this.form.get('lines') as FormArray;
      let openBalance = 0;
      for (let i = 0; i < data.lines.length; i++) {
        let row = data.lines[i];
        openBalance += row.sod_list_pr * row.qty_open;
        this.lines.push(this.fb.group({
          sod_part: [row.sod_part, Validators.required],
          open_balance: [openBalance],
          sod_list_pr: [row.sod_price, Validators.required],
          qty: [row.qty_open, Validators.required],
          addItemsList: [row.qty_open > 0 ? true : false]
        }))
      }

      this.palletSizeInformationSendInfo = this.form.get('palletSizeInformationSendInfo') as FormArray;
      for (let i = 0; i < data.palletSizeInformationSendInfo.length; i++) {
        let row = data.palletSizeInformationSendInfo[i];
        this.palletSizeInformationSendInfo.push(this.fb.group({
          size: [row.size, Validators.required],
        }))
      }

      this.data = data;

      this.form.patchValue(this.data);
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  jsonStringify(data) {
    for (const property in data) {
      if (Array.isArray(data[property])) {
        data[property] = JSON.stringify(data[property]);
      } else if (typeof data[property] === 'object' && data[property] !== null) {
        data[property] = JSON.stringify(data[property]);
      }
    }
  }


  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      getFormValidationErrors()
      return;
    }

    this.jsonStringify(this.form.value)

    try {
      this.isLoading = true;
      await this.api.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success('Successfully Updated');
      this.form.markAsPristine();
      //this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack()
  }

  onPrint() {
    var printContents = document.getElementById('pickSheet').innerHTML;
    var popupWin = window.open('', '_blank', 'width=1000,height=600');
    popupWin.document.open();
    var pathCss = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css';
    popupWin.document.write(
      '<html><head><link type="text/css" rel="stylesheet" media="screen, print" href="' +
      pathCss +
      '" /></head><body onload="window.print()">' +
      printContents +
      '</body></html>'
    );
    popupWin.document.close();
    popupWin.onload = function () {
      popupWin.print();
      popupWin.close();
    };
  }


  /**
   * If validation is passed send email
   */
  public async onSendEmail($event?) {

    if (this.form.dirty) {
      alert('Please save before sending email.')
      return;
    }

    if (this.data.email_sent_date) {
      if (!confirm('Email was sent on ' + this.data.email_sent_date + '. Are you sure you want to resend?')) return;
    }

    let params = onFormatDataBeforeEmail(this.form.value)

    SweetAlert.fire({
      title: 'Are you sure you want to send email?',
      text: "Email will be sent to " + params['emailToSendTo'].toString(),
      showDenyButton: false,
      showCancelButton: true,
      confirmButtonText: `Send Email`,
    }).then(async (result) => {
      /* Read more about isConfirmed, isDenied below */
      if (result.isConfirmed) {
        try {
          let res: any = await this.api.sendEmail(this.id, params)
          this.data.email_sent_date = moment().format('YYYY-MM-DD HH:mm:ss')
          if (res?.message) {
            this.toastrService.error("Access denied")
          } else {
            this.toastrService.success('Email sent', 'Successful')
          }
        } catch (err) {
        }

      }
    })
  }



}
