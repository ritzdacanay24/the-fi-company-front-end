import { Component, Input } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { QirFormComponent } from '../qir-form/qir-form.component';
import { QirService } from '@app/core/api/quality/qir.service';
import { NAVIGATION_ROUTE } from '../qir-constant';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { IQirForm } from '../qir-form/qir-form-type';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { MyFormGroup } from 'src/assets/js/util/_formGroup';

@Component({
  standalone: true,
  imports: [SharedModule, QirFormComponent],
  selector: 'app-qir-edit',
  templateUrl: './qir-edit.component.html',
  styleUrls: ['./qir-edit.component.scss']
})
export class QirEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: QirService,
    private toastrService: ToastrService,
    private attachmentsService: AttachmentsService

  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
    });

    if (this.id) this.getData();
  }

  title = "Edit";

  form: MyFormGroup<IQirForm>;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
  }

  data: any;

  async getData() {
    try {
      this.data = await this.api.getById(this.id);
      this.form.patchValue(this.data);
      await this.getAttachments()
    } catch (err) { }
  }

  async onSubmit() {

    if (this.form.invalid && this.form.value.active == 1) {
      this.submitted = true;
      getFormValidationErrors();
      return
    } else { }

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
    this.attachments = await this.attachmentsService.find({ field: 'Capa Request', uniqueId: this.id })
  }

  async deleteAttachment(id, index) {
    if (!confirm('Are you sure you want to remove attachment?')) return
    await this.attachmentsService.delete(id);
    this.attachments.splice(index, 1)
  }

  file: File = null;

  myFiles: string[] = [];

  onFilechange(event: any) {
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
        formData.append("field", "Capa Request");
        formData.append("uniqueData", `${this.id}`);
        formData.append("folderName", 'capa');
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

}
