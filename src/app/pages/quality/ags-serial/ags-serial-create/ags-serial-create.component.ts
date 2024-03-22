import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import moment from 'moment';
import { AgsSerialFormComponent } from '../ags-serial-form/ags-serial-form.component';
import { NAVIGATION_ROUTE } from '../ags-serial-constant';
import { AgsSerialService } from '@app/core/api/quality/ags-serial.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule, AgsSerialFormComponent],
  selector: 'app-ags-serial-create',
  templateUrl: './ags-serial-create.component.html',
  styleUrls: ['./ags-serial-create.component.scss']
})
export class AgsSerialCreateComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: AgsSerialService,
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

  setFormEmitter($event) {
    this.form = $event;
    this.form.patchValue({
      inspectorName: this.authenticationService.currentUserValue.full_name,
      timeStamp: moment().format('YYYY-MM-DD HH:mm:ss'),
      created_by: this.authenticationService.currentUserValue.id,
      lastUpdate: moment().format('YYYY-MM-DD HH:mm:ss'),
    }, { emitEvent: false })
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
