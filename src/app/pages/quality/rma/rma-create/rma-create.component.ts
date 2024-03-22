import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CustomerService } from '@app/core/api/field-service/customer.service';
import moment from 'moment';
import { RmaFormComponent } from '../rma-form/rma-form.component';
import { NAVIGATION_ROUTE } from '../rma-constant';
import { AuthenticationService } from '@app/core/services/auth.service';
import { SharedModule } from '@app/shared/shared.module';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { RmaService } from '@app/core/api/quality/rma.service';

@Component({
  standalone: true,
  imports: [SharedModule, RmaFormComponent],
  selector: 'app-rma-create',
  templateUrl: './rma-create.component.html',
  styleUrls: ['./rma-create.component.scss']
})
export class RmaCreateComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: RmaService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
    });

    if (this.id) this.getData();
  }

  title = "Create";

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

  setFormEmitter($event) {
    this.form = $event;
    this.form.patchValue({
      createdDate: moment().format('YYYY-MM-DD HH:mm:ss'),
      createdBy: this.authenticationService.currentUserValue.id
    }, { emitEvent: false })
  }

  async onSubmit() {
    this.submitted = true;


    if (this.form.invalid) {
      console.log(this.form)
      getFormValidationErrors()
      return
    }

    try {
      this.isLoading = true;
      await this.api.create(this.form.value);
      this.isLoading = false;
      this.toastrService.success('Successfully Create');
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack()
  }

}
