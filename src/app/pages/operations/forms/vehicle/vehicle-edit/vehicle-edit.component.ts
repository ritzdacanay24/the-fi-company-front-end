import { Component, Input } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NAVIGATION_ROUTE } from '../vehicle-constant';
import { VehicleFormComponent } from '../vehicle-form/vehicle-form.component';
import { VehicleService } from '@app/core/api/operations/vehicle/vehicle.service';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { IVehicleForm } from '../vehicle-form/vehicle-form.type';
import { MyFormGroup } from 'src/assets/js/util/_formGroup';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';

@Component({
  standalone: true,
  imports: [SharedModule, VehicleFormComponent],
  selector: 'app-vehicle-edit',
  templateUrl: './vehicle-edit.component.html'
})
export class VehicleEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: VehicleService,
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

  form: MyFormGroup<IVehicleForm>;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
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

}
