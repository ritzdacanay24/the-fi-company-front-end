import { Component, Input, OnInit } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { JobService } from '@app/core/api/field-service/job.service';
import { NcrFormComponent } from '../ncr-form/ncr-form.component';
import { NAVIGATION_ROUTE } from '../ncr-constant';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';

@Component({
  standalone: true,
  imports: [SharedModule, NcrFormComponent],
  selector: 'app-ncr-create',
  templateUrl: './ncr-create.component.html',
  styleUrls: []
})
export class NcrCreateComponent implements OnInit {

  constructor(
    private router: Router,
    private api: JobService,
    private toastrService: ToastrService,
  ) {
  }

  ngOnInit(): void { }

  title = "Job Create";

  isLoading = false;

  form: FormGroup | any;

  submitted: boolean = false;


  @Input() goBack: Function = (id?) => {
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
