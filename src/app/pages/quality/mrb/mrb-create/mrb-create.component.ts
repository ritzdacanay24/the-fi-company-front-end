import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import moment from 'moment';
import { MrbFormComponent } from '../mrb-form/mrb-form.component';
import { NAVIGATION_ROUTE } from '../mrb-constant';
import { MrbService } from '@app/core/api/quality/mrb-service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule, MrbFormComponent],
  selector: 'app-mrb-create',
  templateUrl: './mrb-create.component.html',
  styleUrls: ['./mrb-create.component.scss']
})
export class MrbCreateComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: MrbService,
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

  async onSubmit() {
    this.submitted = true;

    this.form.patchValue({
      job: {
        created_date: moment().format('YYYY-MM-DD HH:mm:ss'),
        created_by: this.authenticationService.currentUserValue.id
      }
    }, { emitEvent: false })

    if (this.form.invalid) return;

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
