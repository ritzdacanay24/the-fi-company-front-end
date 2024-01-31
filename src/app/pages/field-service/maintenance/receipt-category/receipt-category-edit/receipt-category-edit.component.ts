import { Component, Input } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NAVIGATION_ROUTE } from '../receipt-category-constant';
import { ReceiptCategoryFormComponent } from '../receipt-category-form/receipt-category-form.component';
import { ReceiptCategoryService } from '@app/core/api/field-service/receipt-category.service';

@Component({
  standalone: true,
  imports: [SharedModule, ReceiptCategoryFormComponent],
  selector: 'app-receipt-category-edit',
  templateUrl: './receipt-category-edit.component.html',
  styleUrls: ['./receipt-category-edit.component.scss']
})
export class ReceiptCategoryEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: ReceiptCategoryService,
    private toastrService: ToastrService,
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
    });

    if (this.id) this.getData();
  }

  title = "Edit Receipt Category";

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
