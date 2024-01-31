import { Component, Input, OnInit } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { JobFormComponent } from '../job-form/job-form.component';
import { NAVIGATION_ROUTE } from '../job-constant';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { JobService } from '@app/core/api/field-service/job.service';
import { getFormValidationErrors } from 'src/assets/js/util';
import { MyFormGroup } from 'src/assets/js/util/_formGroup';
import { FormGroup } from '@angular/forms';

@Component({
  standalone: true,
  imports: [SharedModule, JobFormComponent],
  selector: 'app-job-create',
  templateUrl: './job-create.component.html',
  styleUrls: []
})
export class JobCreateComponent implements OnInit {

  constructor(
    private router: Router,
    private api: JobService,
    private toastrService: ToastrService,
  ) {
  }

  ngOnInit(): void { }

  title = "Job Create";

  isLoading = false;

  form: FormGroup;

  submitted: boolean = false;

  @Input() goBack: Function = (id?: number) => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge', queryParams: { id } });
  }

  onSubmit = async () => {
    this.submitted = true;

    if (this.form.invalid && this.form.value.active == 1) {
      getFormValidationErrors()
      return
    };

    try {
      this.isLoading = true;
      let { insertId } = await this.api.create(this.form.value);
      this.isLoading = false;
      this.toastrService.success('Successfully Create');
      this.goBack(insertId);
    } catch (err) {
      this.isLoading = false;
    }

  }

}
