import { Component, Input } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NAVIGATION_ROUTE } from '../service-type-constant';
import { IServiceTypeForm, ServiceTypeFormComponent } from '../service-type-form/service-type-form.component';
import { ServiceTypeService } from '@app/core/api/field-service/service-type.service';

@Component({
  standalone: true,
  imports: [SharedModule, ServiceTypeFormComponent],
  selector: 'app-service-type-edit',
  templateUrl: './service-type-edit.component.html',
  styleUrls: ['./service-type-edit.component.scss']
})
export class ServiceTypeEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: ServiceTypeService,
    private toastrService: ToastrService,
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
    });

    if (this.id) this.getData();
  }

  title = "Edit Service Type";

  form: FormGroup<IServiceTypeForm>;

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
      this.form.get(['type']).disable();
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
