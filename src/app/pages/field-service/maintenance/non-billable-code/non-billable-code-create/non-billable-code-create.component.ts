import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { NAVIGATION_ROUTE } from '../non-billable-code-constant';
import { NonBillableCodeService } from '@app/core/api/field-service/fs_non_billable_code.service';
import { NonBillableCodeFormComponent } from '../non-billable-code-form/non-billable-code-form.component';

@Component({
  standalone: true,
  imports: [SharedModule, NonBillableCodeFormComponent],
  selector: 'app-non-billable-code-create',
  templateUrl: './non-billable-code-create.component.html',
  styleUrls: ['./non-billable-code-create.component.scss']
})
export class NonBillableCodeCreateComponent {
  constructor(
    private router: Router,
    private api: NonBillableCodeService,
    private toastrService: ToastrService,
  ) { }

  ngOnInit(): void {
  }

  title = "Create";

  form: FormGroup;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = (id?: string) => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge', queryParams: { id: id } });
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) return;

    try {
      this.isLoading = true;
      let data = await this.api.create(this.form.value);
      this.isLoading = false;
      this.toastrService.success('Successfully Created');
      this.goBack(data.insertId);
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack()
  }
}
