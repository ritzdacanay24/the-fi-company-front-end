import { Component, Input } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { VehicleFormComponent } from '../vehicle-form/vehicle-form.component';
import { NAVIGATION_ROUTE } from '../vehicle-constant';
import moment from 'moment';
import { AuthenticationService } from '@app/core/services/auth.service';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { MyFormGroup } from 'src/assets/js/util/_formGroup';
import { IVehicleForm } from '../vehicle-form/vehicle-form.type';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { VehicleService } from '@app/core/api/operations/vehicle/vehicle.service';

@Component({
  standalone: true,
  imports: [SharedModule, VehicleFormComponent],
  selector: 'app-vehicle-create',
  templateUrl: './vehicle-create.component.html',
})
export class VehicleCreateComponent {
  constructor(
    private router: Router,
    private api: VehicleService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
    private attachmentsService: AttachmentsService
  ) { }

  ngOnInit(): void {
  }

  upload(){}

  title = "Create Vehicle";

  form: MyFormGroup<IVehicleForm>;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
  }

  setFormEmitter($event) {
    this.form = $event;
    this.form.patchValue({
      createdDate: moment().format('YYYY-MM-DD HH:mm:ss'),
      createdBy: this.authenticationService.currentUserValue.id
    }, { emitEvent: false })

  }

  async onSubmit() {
    this.submitted = true;
    if (this.form.invalid) {
      getFormValidationErrors()
      return;
    };
    try {
      this.isLoading = true;
      let { insertId } = await this.api.create(this.form.value);

      if (this.myFiles) {
        const formData = new FormData();
        for (var i = 0; i < this.myFiles.length; i++) {
          formData.append("file", this.myFiles[i]);
          formData.append("field", "Vehicle Information");
          formData.append("uniqueData", `${insertId}`);
          formData.append("folderName", 'vehicleInformation');
          await this.attachmentsService.uploadfile(formData)
        }
      }

      this.isLoading = false;
      this.toastrService.success('Successfully Created');
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack()
  }

  file: File = null;

  myFiles: string[] = [];

  onFilechange(event: any) {
    this.myFiles = [];
    for (var i = 0; i < event.target.files.length; i++) {
      this.myFiles.push(event.target.files[i]);
    }
  }
}
