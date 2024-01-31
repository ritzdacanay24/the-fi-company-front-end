import { Component, Input } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import moment from 'moment';
import { QirSettingsFormComponent } from '../qir-settings-form/qir-settings-form.component';
import { NAVIGATION_ROUTE } from '../qir-settings-constant';
import { QirSettingsService } from '@app/core/api/quality/qir-settings.service';
import { AuthenticationService } from '@app/core/services/auth.service';

@Component({
  standalone: true,
  imports: [SharedModule, QirSettingsFormComponent],
  selector: 'app-qir-settings-create',
  templateUrl: './qir-settings-create.component.html',
  styleUrls: ['./qir-settings-create.component.scss']
})
export class QirSettingsCreateComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: QirSettingsService,
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
      //this.form.reset()
      //this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack()
  }

}
