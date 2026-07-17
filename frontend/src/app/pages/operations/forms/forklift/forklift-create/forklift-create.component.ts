import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import moment from 'moment';
import { AuthenticationService } from '@app/core/services/auth.service';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { ForkliftFormComponent } from '../forklift-form/forklift-form.component';
import { MyFormGroup } from 'src/assets/js/util/_formGroup';
import { IForkliftForm } from '../forklift-form/forklift-form.type';
import { NAVIGATION_ROUTE } from '../forklift-constant';
import { ForkliftService } from '@app/core/api/operations/forklift/forklift.service';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { FeatureType } from '@app/shared/enums/feature.enum';

@Component({
  standalone: true,
  imports: [SharedModule, ForkliftFormComponent],
  selector: 'app-forklift-create',
  templateUrl: './forklift-create.component.html',
})
export class ForkliftCreateComponent {
  constructor(
    private readonly router: Router,
    private readonly api: ForkliftService,
    private readonly toastrService: ToastrService,
    private readonly authenticationService: AuthenticationService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  title = 'Create Forklift';
  form: MyFormGroup<IForkliftForm>;
  isLoading = false;
  submitted = false;
  readonly FeatureType = FeatureType;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
  };

  setFormEmitter(form: MyFormGroup<IForkliftForm>): void {
    this.form = form;
    this.form.patchValue({
      created_date: moment().format('YYYY-MM-DD HH:mm:ss'),
      created_by: this.authenticationService.currentUserValue?.id,
      active: 1,
    }, { emitEvent: false });
  }

  selectedFiles: File[] = [];

  onAttachmentFilesAdded(files: File[]): void {
    this.selectedFiles = [...this.selectedFiles, ...(files || [])];
  }

  removeFile(index: number): void {
    if (index < 0 || index >= this.selectedFiles.length) {
      return;
    }
    this.selectedFiles.splice(index, 1);
    this.selectedFiles = [...this.selectedFiles];
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;
    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    this.isLoading = true;
    try {
      const payload = this.form.getRawValue();
      const { insertId } = await this.api.create(payload);

      if (insertId && this.selectedFiles.length > 0) {
        await this.attachmentsService.uploadFilesByFeature(
          FeatureType.FORKLIFT_MANAGEMENT,
          insertId,
          this.selectedFiles,
        );
      }

      this.toastrService.success('Successfully created forklift');
      this.goBack();
    } finally {
      this.isLoading = false;
    }
  }

  onCancel(): void {
    this.goBack();
  }
}
