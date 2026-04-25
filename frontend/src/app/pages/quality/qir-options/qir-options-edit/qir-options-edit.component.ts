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
  selector: 'app-qir-options-edit',
  templateUrl: './qir-options-edit.component.html',
})
export class QirOptionsEditComponent implements OnInit {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: QirSettingsService,
    private toastr: ToastrService,
  ) {}

  title = 'Edit QIR Option';
  form!: FormGroup;
  id: number | null = null;
  isLoading = false;
  submitted = false;
  categories: any[] = [];

  @Input() goBack: Function = () =>
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });

  ngOnInit() {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'] ? Number(params['id']) : null;
    });
    this.loadCategories();
  }

  async loadCategories() {
    try {
      this.categories = await this.api.getCategories();
      if (this.id) await this.getData();
    } catch {}
  }

  async getData() {
    try {
      const data = await this.api.getOptionById(this.id!);
      this.form.patchValue(data);
    } catch {
      this.toastr.error('Option not found');
      this.goBack();
    }
  }

  async onSubmit() {
    this.submitted = true;
    if (this.form.invalid) return;

    try {
      this.isLoading = true;
      await this.api.updateOption(this.id!, this.form.value);
      this.toastr.success('Option updated successfully');
      this.goBack();
    } catch {
      this.toastr.error('Failed to update option');
    } finally {
      this.isLoading = false;
    }
  }

  async onDelete() {
    if (!confirm('Delete this option? This cannot be undone.')) return;
    try {
      this.isLoading = true;
      await this.api.deleteOption(this.id!);
      this.toastr.success('Option deleted');
      this.goBack();
    } catch {
      this.toastr.error('Failed to delete option');
    } finally {
      this.isLoading = false;
    }
  }

  onCancel() { this.goBack(); }
}
