import { Component, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NAVIGATION_ROUTE } from '../shortages-constant';
import { ShortagesFormComponent } from '../shortages-form/shortages-form.component';
import { IShortagesForm } from '../shortages-form/shortages-form.type';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { ShortagesService } from '@app/core/api/operations/shortages/shortages.service';
import moment from 'moment';
import { AuthenticationService } from '@app/core/services/auth.service';
import { SharedModule } from '@app/shared/shared.module';
import { getFormValidationErrors } from 'src/assets/js/util';
import { MyFormGroup } from 'src/assets/js/util/_formGroup';

@Component({
  standalone: true,
  imports: [SharedModule, ShortagesFormComponent],
  selector: 'app-shortages-edit',
  templateUrl: './shortages-edit.component.html'
})
export class ShortagesEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: ShortagesService,
    private toastrService: ToastrService,
    private attachmentsService: AttachmentsService,
    private authenticationService: AuthenticationService
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
      this.goBackUrl = params['goBackUrl'];
    });

    if (this.id) this.getData();
  }

  title = "Edit";

  form: MyFormGroup<IShortagesForm>;

  id = null;

  isLoading = false;

  submitted = false;
  goBackUrl
  @Input() goBack: Function = () => {
    if (this.goBackUrl) {
      this.router.navigateByUrl(this.goBackUrl);
    } else {
      this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
    }
  }

  printData;
  onPrint() {
    this.printData = this.data;

    setTimeout(() => {
      var printContents = document.getElementById('print').innerHTML;
      var popupWin = window.open('', '_blank', 'width=1000,height=600');
      popupWin.document.open();

      popupWin.document.write(`
      <html>
        <head>
          <title>Material Request Picking</title>
          <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
          <style>
          @page {
            size: portrait;
            padding: 5 !important;
          }
          </style>
        </head>
        <body onload="window.print();window.close()">${printContents}</body>
      </html>`
      );

      popupWin.document.close();

      popupWin.onfocus = function () {
        setTimeout(function () {
          popupWin.focus();
          popupWin.document.close();
        }, 300);
      };
    }, 200);
  }

  data: any;

  async getData() {
    try {
      this.isLoading = true;
      this.data = await this.api.getById(this.id);
      this.form.patchValue(this.data);
      await this.getAttachments()
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      getFormValidationErrors()
      return;
    }

    try {
      this.isLoading = true;
      await this.api.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success('Successfully Updated');
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack()
  }

  attachments: any = []
  async getAttachments() {
    this.attachments = await this.attachmentsService.find({ field: 'Vehicle Information', uniqueId: this.id })
  }

  async deleteAttachment(id, index) {
    if (!confirm('Are you sure you want to remove attachment?')) return
    await this.attachmentsService.delete(id);
    this.attachments.splice(index, 1)
  }

  file: File = null;

  myFiles: string[] = [];

  onFilechange(event: any) {
    this.myFiles = [];
    for (var i = 0; i < event.target.files.length; i++) {
      this.myFiles.push(event.target.files[i]);
    }
  }

  async onUploadAttachments() {
    if (this.myFiles) {
      let totalAttachments = 0;
      this.isLoading = true;
      const formData = new FormData();
      for (var i = 0; i < this.myFiles.length; i++) {
        formData.append("file", this.myFiles[i]);
        formData.append("field", "Vehicle Information");
        formData.append("uniqueData", `${this.id}`);
        formData.append("folderName", 'vehicleInformation');
        try {
          await this.attachmentsService.uploadfile(formData);
          totalAttachments++
        } catch (err) {
        }
      }
      this.isLoading = false;
      await this.getAttachments()
    }
  }

  onComplete = async (key1, key2) => {
    this.form.patchValue({
      [key1]: moment().format('YYYY-MM-DD HH:mm:ss'),
      [key2]: this.authenticationService.currentUserValue.id
    }, { emitEvent: false })

    try {
      this.isLoading = true;
      await this.api.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success('Successfully Updated');
    } catch (err) {
      this.isLoading = false;
      this.form.patchValue({
        [key1]: null,
        [key2]: null
      }, { emitEvent: false })
    }

  }

}
