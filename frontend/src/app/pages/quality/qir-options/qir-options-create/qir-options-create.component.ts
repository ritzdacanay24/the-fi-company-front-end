import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '@app/shared/shared.module';
import { QirSettingsService } from '@app/core/api/quality/qir-settings.service';
import { QirOptionsFormComponent } from '../qir-options-form/qir-options-form.component';
import { NAVIGATION_ROUTE } from '../qir-options-constant';

@Component({
  standalone: true,
  imports: [SharedModule, QirOptionsFormComponent],
  selector: 'app-qir-options-create',
  templateUrl: './qir-options-create.component.html',
})
export class QirOptionsCreateComponent implements OnInit {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: QirSettingsService,
    private toastr: ToastrService,
  ) {}

  title = 'Add QIR Option';
  form!: FormGroup;
  isLoading = false;
  submitted = false;
  categories: any[] = [];

  @Input() goBack: Function = () =>
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });

  ngOnInit() {
    this.loadCategories();
  }

  async loadCategories() {
    try {
      this.categories = await this.api.getCategories();
    } catch {}
  }

  async onSubmit() {
    this.submitted = true;
    if (this.form.invalid) return;

    try {
      this.isLoading = true;
      await this.api.createOption(this.form.value);
      this.toastr.success('Option created successfully');
      this.goBack();
    } catch {
      this.toastr.error('Failed to create option');
    } finally {
      this.isLoading = false;
    }
  }

  onCancel() { this.goBack(); }
}
