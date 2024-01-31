import { Component, Input } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NAVIGATION_ROUTE } from '../material-request-constant';
import moment from 'moment';
import { AuthenticationService } from '@app/core/services/auth.service';
import { MaterialRequestFormComponent } from '../material-request-form/material-request-form.component';
import { MaterialRequestService } from '@app/core/api/operations/material-request/material-request.service';
import { FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MyFormGroup } from 'src/assets/js/util/_formGroup';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';

@Component({
  standalone: true,
  imports: [SharedModule, MaterialRequestFormComponent],
  selector: 'app-material-request-create',
  templateUrl: './material-request-create.component.html',
})
export class MaterialRequestCreateComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: MaterialRequestService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
    private fb: FormBuilder,
  ) { }

  ngOnInit(): void {
  }

  title = "Create Material Request";

  form: MyFormGroup<any>;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
  }

  setFormEmitter($event) {
    this.form = $event;
    this.form.patchValue({
      main: {
        createdDate: moment().format('YYYY-MM-DD HH:mm:ss'),
        createdBy: this.authenticationService.currentUserValue.id,
        requestor: this.authenticationService.currentUserValue.full_name,
      }
    }, { emitEvent: false })

    this.addMoreItems()
  }

  disableValidation = true

  async onSubmit() {
    this.submitted = true;
    if (this.form.invalid) {
      getFormValidationErrors()
      return;
    };

    try {
      this.isLoading = true;
      let { insertId } = await this.api.create(this.form.value);

      this.isLoading = false;
      this.toastrService.success('Successfully Create');

      this.form.reset();

    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack()
  }

  details: FormArray;

  addMoreItems = () => {

    this.details = this.form.get('details') as FormArray;

    let lastIndex = this.details.value[this.details?.value?.length - 1];
    this.details.push(this.fb.group({
      partNumber: new FormControl(null, Validators.required),
      reasonCode: new FormControl(lastIndex?.reasonCode || null, Validators.required),
      qty: new FormControl(null, Validators.required),
      trType: new FormControl({ value: null, disabled: true }),
      ac_code: new FormControl({ value: null, disabled: true }),
      notes: new FormControl(''),
    }))

  }

  onDeleteItem = async ($event, index) => {
    this.details.removeAt(index);
  }

}
