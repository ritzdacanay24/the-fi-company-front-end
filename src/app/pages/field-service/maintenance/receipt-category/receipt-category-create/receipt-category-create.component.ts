import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { NAVIGATION_ROUTE } from '../receipt-category-constant';
import { ReceiptCategoryFormComponent } from '../receipt-category-form/receipt-category-form.component';
import { ReceiptCategoryService } from '@app/core/api/field-service/receipt-category.service';

@Component({
  standalone: true,
  imports: [SharedModule, ReceiptCategoryFormComponent],
  selector: 'app-receipt-category-create',
  templateUrl: './receipt-category-create.component.html',
  styleUrls: ['./receipt-category-create.component.scss']
})
export class ReceiptCategoryCreateComponent {
  constructor(
    private router: Router,
    private api: ReceiptCategoryService,
    private toastrService: ToastrService,
  ) { }

  ngOnInit(): void {
  }

  title = "Create receipt category";

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
