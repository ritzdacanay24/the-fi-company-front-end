import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import moment from 'moment';
import { SgAssetFormComponent } from '../sg-asset-form/sg-asset-form.component';
import { SgAssetService } from '@app/core/api/quality/sg-asset.service';
import { NAVIGATION_ROUTE } from '../sg-asset-constant';
import { AuthenticationService } from '@app/core/services/auth.service';
import { SharedModule } from '@app/shared/shared.module';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';

@Component({
  standalone: true,
  imports: [SharedModule, SgAssetFormComponent],
  selector: 'app-sg-asset-create',
  templateUrl: './sg-asset-create.component.html',
  styleUrls: ['./sg-asset-create.component.scss']
})
export class SgAssetCreateComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: SgAssetService,
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

    if (this.form.value?.generated_SG_asset) {
      let data = await this.api.checkIfSerialIsFound(this.form.value?.generated_SG_asset);

      if (data) {
        const { value: accept } = await SweetAlert.confirmV1({
          title: "Duplicate SG asset found. Are you sure you want to continue?"
        })
        if (!accept) return;
      }
    }

    try {
      this.isLoading = true;
      await this.api.create(this.form.value);
      this.isLoading = false;
      this.toastrService.success('Successfully Created');
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack()
  }

}
