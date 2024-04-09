import { Component, HostListener, Input, OnInit } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { JobService } from '@app/core/api/field-service/job.service';
import { NcrFormComponent } from '../ncr-form/ncr-form.component';
import { NAVIGATION_ROUTE } from '../ncr-constant';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { AuthenticationService } from '@app/core/services/auth.service';
import moment from 'moment';
import { NcrService } from '@app/core/api/quality/ncr-service';
import { cont_types, ncr_types } from '../ncr-overview/ncr-main/ncr-main.component';

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
    private api: NcrService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
  ) {
  }

  ngOnInit(): void { }

  @HostListener("window:beforeunload")
  canDeactivate() {
    if (this.form?.dirty) {
      return confirm('You have unsaved changes. Discard and leave?');
    }
    return true;
  }


  title = "Job Create";

  isLoading = false;

  form: FormGroup | any;

  submitted: boolean = false;

  setFormEmitter($event) {
    this.form = $event;
    this.form.patchValue({
      created_by: this.authenticationService.currentUserValue.id,
      created_date: moment().format('YYYY-MM-DD HH:mm:ss')
    })
  }

  @Input() goBack: Function = (id?) => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge', queryParams: { id } });
  }

  async convertToString() {
    this.form.value.ncr_type = this.form.value.ncr_type
      .map((checked, i) => checked ? ncr_types[i] : null)
      .filter(v => v !== null).toString();

    this.form.value.cont_type = this.form.value.cont_type
      .map((checked, i) => checked ? cont_types[i] : null)
      .filter(v => v !== null).toString();
  }


  onSubmit = async () => {
    this.submitted = true;

    if (this.form.invalid && this.form.value.active == 1) {
      getFormValidationErrors()
      return
    };

    this.convertToString();

    try {
      this.isLoading = true;
      let { insertId } = await this.api.create(this.form.value);
      this.isLoading = false;
      this.toastrService.success('Successfully Created');
      this.form.markAsPristine();
      this.goBack(insertId);
    } catch (err) {
      this.isLoading = false;
    }

  }

}
