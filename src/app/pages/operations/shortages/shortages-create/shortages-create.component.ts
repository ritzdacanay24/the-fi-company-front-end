import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NAVIGATION_ROUTE } from '../shortages-constant';
import moment from 'moment';
import { ShortagesFormComponent } from '../shortages-form/shortages-form.component';
import { ShortagesService } from '@app/core/api/operations/shortages/shortages.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { SharedModule } from '@app/shared/shared.module';
import { getFormValidationErrors } from 'src/assets/js/util';

@Component({
  standalone: true,
  imports: [SharedModule, ShortagesFormComponent],
  selector: 'app-shortages-create',
  templateUrl: './shortages-create.component.html',
})
export class ShortagesCreateComponent {
  constructor(
    private router: Router,
    private api: ShortagesService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,

  ) { }

  ngOnInit(): void {
  }

  title = "Create Shortage";

  form: any;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
  }

  setFormEmitter($event) {
    this.form = $event;
    this.form.patchValue({
      createdDate: moment().format('YYYY-MM-DD HH:mm:ss'),
      createdBy: this.authenticationService.currentUserValue.id,
    }, { emitEvent: false })

  }

  async onSubmit(submitAnother = false) {
    this.submitted = true;
    if (this.form.invalid) {
      getFormValidationErrors()
      return;
    };

    try {
      this.isLoading = true;
      let { insertId } = await this.api.create(this.form.value);

      this.isLoading = false;
      this.toastrService.success('Successfully Created');

      if (submitAnother) {
        this.form.reset({
          createdDate: moment().format('YYYY-MM-DD HH:mm:ss'),
          createdBy: this.authenticationService.currentUserValue.id,
          active_line: 1,
        })
      } else {
        this.router.navigate([NAVIGATION_ROUTE.EDIT], { queryParamsHandling: 'merge', queryParams: { id: insertId } });
      }

    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack()
  }

}
