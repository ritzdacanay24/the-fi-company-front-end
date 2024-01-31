import { Component, Input } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { JobStatusFormComponent } from '../job-status-form/job-status-form.component';
import { NAVIGATION_ROUTE } from '../job-status-constant';
import { StatusCategoryService } from '@app/core/api/field-service/status-category.service';

@Component({
  standalone: true,
  imports: [SharedModule, JobStatusFormComponent],
  selector: 'app-job-status-edit',
  templateUrl: './job-status-edit.component.html',
  styleUrls: ['./job-status-edit.component.scss']
})
export class JobStatusEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: StatusCategoryService,
    private toastrService: ToastrService,
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
    });

    if (this.id) this.getData();
  }

  title = "Edit Job Status";

  form: FormGroup;

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
    } catch (err) { }
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) return;

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

}
