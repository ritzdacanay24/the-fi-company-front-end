import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { PropertyService } from '@app/core/api/field-service/property.service';
import { SharedModule } from '@app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { PropertyFormComponent } from '../property-form/property-form.component';
import { NAVIGATION_ROUTE } from '../property-constant';

@Component({
  standalone: true,
  imports: [SharedModule, PropertyFormComponent],
  selector: 'app-property-create',
  templateUrl: './property-create.component.html',
  styleUrls: ['./property-create.component.scss']
})
export class PropertyCreateComponent {
  constructor(
    private router: Router,
    private api: PropertyService,
    private toastrService: ToastrService,
  ) { }

  ngOnInit(): void {
  }

  title = "Create Property";

  form: FormGroup;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = (id?: string) => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge',  queryParams: { id: id } });
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
